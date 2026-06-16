#!/usr/bin/env bun
/**
 * CI-safe i18n coverage check.
 *
 * Verifies static translation key references against en.json. Dynamic keys are
 * intentionally skipped; those are covered by runtime missing-key diagnostics.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const REPO_ROOT = resolve(import.meta.dir ?? new URL('.', import.meta.url).pathname, '..')
const LOCALES_DIR = resolve(REPO_ROOT, 'packages', 'shared', 'src', 'i18n', 'locales')
const EN_PATH = resolve(LOCALES_DIR, 'en.json')

const SOURCE_ROOTS = [
  'apps/electron/src',
  'apps/webui/src',
  'apps/viewer/src',
  'packages/shared/src',
  'packages/ui/src',
]

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const SKIP_SEGMENTS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '__snapshots__',
])

type Locale = Record<string, string>

const en = JSON.parse(readFileSync(EN_PATH, 'utf-8')) as Locale
const enKeys = new Set(Object.keys(en))
const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other']

function* walk(dir: string): Generator<string> {
  let entries: ReturnType<typeof readdirSync>
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (SKIP_SEGMENTS.has(entry.name)) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(path)
      continue
    }
    if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
      yield path
    }
  }
}

function lineForOffset(text: string, offset: number): number {
  let line = 1
  for (let i = 0; i < offset; i++) {
    if (text.charCodeAt(i) === 10) line++
  }
  return line
}

function isStaticKey(key: string): boolean {
  return key.length > 0 && !key.includes('${')
}

function hasTranslationKey(key: string): boolean {
  if (enKeys.has(key)) return true

  return (
    enKeys.has(`${key}_one`) &&
    enKeys.has(`${key}_other`) &&
    PLURAL_SUFFIXES.some((suffix) => enKeys.has(`${key}_${suffix}`))
  )
}

function extractKeys(text: string): Array<{ key: string; index: number }> {
  const keys: Array<{ key: string; index: number }> = []

  const tCall = /(?:^|[^\w$.])(?:i18n\.)?t\(\s*(['"`])([^'"`\n$]+)\1/g
  for (const match of text.matchAll(tCall)) {
    const key = match[2]
    if (key && isStaticKey(key)) {
      keys.push({ key, index: match.index ?? 0 })
    }
  }

  const transKey = /<Trans\b[^>]*\bi18nKey=(?:"([^"\n]+)"|'([^'\n]+)')/g
  for (const match of text.matchAll(transKey)) {
    const key = match[1] ?? match[2]
    if (key && isStaticKey(key)) {
      keys.push({ key, index: match.index ?? 0 })
    }
  }

  return keys
}

const errors: string[] = []
const checked = new Set<string>()

for (const root of SOURCE_ROOTS) {
  const absRoot = resolve(REPO_ROOT, root)
  try {
    if (!statSync(absRoot).isDirectory()) continue
  } catch {
    continue
  }

  for (const file of walk(absRoot)) {
    const text = readFileSync(file, 'utf-8')
    for (const { key, index } of extractKeys(text)) {
      checked.add(key)
      if (hasTranslationKey(key)) continue
      errors.push(`${relative(REPO_ROOT, file)}:${lineForOffset(text, index)} missing key "${key}"`)
    }
  }
}

if (errors.length) {
  console.error('i18n coverage check failed:')
  for (const error of errors.slice(0, 100)) console.error(`  ${error}`)
  if (errors.length > 100) {
    console.error(`  ...and ${errors.length - 100} more`)
  }
  process.exit(1)
}

console.log(`i18n coverage OK (${checked.size} static keys checked)`)
