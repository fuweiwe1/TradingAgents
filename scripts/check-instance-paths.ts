import { readFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import ts from 'typescript'

export interface InstancePathViolation {
  file: string
  line: number
  text: string
}

const TEST_PATH_PATTERN = /(?:^|[\\/])__tests__(?:[\\/])|(?:\.test|\.spec|\.isolated)\.[cm]?[jt]sx?$/
const ALLOWED_RUNTIME_FILES = new Set([
  'packages/shared/src/config/instance.ts',
  'packages/session-tools-core/src/handlers/config-validate.ts',
])

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

function isTestPath(path: string): boolean {
  return TEST_PATH_PATTERN.test(path)
}

function containsCraftAgentLiteral(node: ts.Node): boolean {
  let found = false
  node.forEachChild((child) => {
    if (
      (ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) &&
      child.text.includes('.craft-agent')
    ) {
      found = true
    }
    if (!found && containsCraftAgentLiteral(child)) found = true
  })
  return found
}

function isDangerousRootExpression(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): boolean {
  const text = node.getText(sourceFile)
  return (
    /\bhomedir\s*\(/.test(text) ||
    /process\.env\.(?:HOME|USERPROFILE)\b/.test(text) ||
    /process\.env\[['"](?:HOME|USERPROFILE)['"]\]/.test(text)
  )
}

function isForbiddenPathConstruction(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): boolean {
  if (ts.isCallExpression(node)) {
    const callee = node.expression.getText(sourceFile)
    if (
      /(?:^|\.)\b(?:join|resolve)$/.test(callee) &&
      containsCraftAgentLiteral(node) &&
      node.arguments.some((argument) =>
        isDangerousRootExpression(argument, sourceFile)
      )
    ) {
      return true
    }
  }

  if (
    ts.isBinaryExpression(node) &&
    containsCraftAgentLiteral(node) &&
    isDangerousRootExpression(node, sourceFile)
  ) {
    return true
  }

  return false
}

export function checkSourceText(
  file: string,
  source: string,
): InstancePathViolation[] {
  const normalizedFile = normalizePath(file)
  if (
    isTestPath(normalizedFile) ||
    ALLOWED_RUNTIME_FILES.has(normalizedFile)
  ) {
    return []
  }

  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const violations: InstancePathViolation[] = []

  function visit(node: ts.Node): void {
    if (isForbiddenPathConstruction(node, sourceFile)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
      violations.push({
        file: normalizedFile,
        line: line + 1,
        text: node.getText(sourceFile),
      })
      return
    }
    node.forEachChild(visit)
  }

  visit(sourceFile)
  return violations
}

export async function checkFiles(
  files: string[],
): Promise<InstancePathViolation[]> {
  const violations: InstancePathViolation[] = []
  for (const file of files) {
    violations.push(...checkSourceText(
      file,
      await readFile(file, 'utf8'),
    ))
  }
  return violations
}

async function findProductionSourceFiles(): Promise<string[]> {
  const files: string[] = []
  const glob = new Bun.Glob('{apps,packages,scripts}/**/*.{ts,tsx,mts,cts}')
  for await (const file of glob.scan({ cwd: process.cwd(), onlyFiles: true })) {
    if (!isTestPath(normalizePath(file))) files.push(file)
  }
  return files
}

async function main(): Promise<void> {
  const violations = await checkFiles(await findProductionSourceFiles())
  if (violations.length === 0) {
    console.log('Instance path guard passed')
    return
  }

  for (const violation of violations) {
    console.error(
      `${relative(process.cwd(), resolve(violation.file))}:${violation.line}: ` +
      `runtime path must derive from CONFIG_DIR: ${violation.text}`,
    )
  }
  process.exitCode = 1
}

if (import.meta.main) {
  void main()
}
