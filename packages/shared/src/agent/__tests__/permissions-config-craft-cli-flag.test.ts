import { describe, it, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const permissionsConfigUrl = pathToFileURL(join(import.meta.dir, '..', 'permissions-config.ts')).href

function writeDefaultPermissions(configDir: string) {
  const permissionsDir = join(configDir, 'permissions')
  mkdirSync(permissionsDir, { recursive: true })
  writeFileSync(
    join(permissionsDir, 'default.json'),
    JSON.stringify(
      {
        version: '2026-03-07',
        allowedBashPatterns: [
          { pattern: '^craft-agent\\s+label\\s+list\\b', comment: 'craft-agent label read-only operations' },
          { pattern: '^rg\\b', comment: 'Ripgrep search' },
        ],
        allowedMcpPatterns: [],
        allowedApiEndpoints: [],
        allowedWritePaths: [],
        blockedCommandHints: [],
      },
      null,
      2,
    ),
  )
}

function getCompiledSources(configDir: string, cliFlag: '0' | '1'): string[] {
  const result = Bun.spawnSync(
    [
      process.execPath,
      '--eval',
      `
        const { permissionsConfigCache } = await import('${permissionsConfigUrl}');
        const merged = permissionsConfigCache.getMergedConfig({
          workspaceRootPath: ${JSON.stringify(join(configDir, 'workspace'))},
          activeSourceSlugs: [],
        });
        console.log(JSON.stringify(merged.readOnlyBashPatterns.map(pattern => pattern.source)));
      `,
    ],
    {
      env: {
        ...process.env,
        CRAFT_CONFIG_DIR: configDir,
        CRAFT_FEATURE_CRAFT_AGENTS_CLI: cliFlag,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )

  expect(result.exitCode, result.stderr.toString()).toBe(0)
  return JSON.parse(result.stdout.toString())
}

describe('permissions config craft-agents-cli feature flag', () => {
  it('skips compiling craft-agent bash allowlist patterns when feature is disabled', () => {
    const tempConfigDir = mkdtempSync(join(tmpdir(), 'craft-permissions-'))
    try {
      writeDefaultPermissions(tempConfigDir)

      const sources = getCompiledSources(tempConfigDir, '0')
      expect(sources.some(source => source.startsWith('^craft-agent\\s'))).toBe(false)
      expect(sources).toContain('^rg\\b')
    } finally {
      rmSync(tempConfigDir, { recursive: true, force: true })
    }
  })

  it('compiles craft-agent bash allowlist patterns when feature is enabled', () => {
    const tempConfigDir = mkdtempSync(join(tmpdir(), 'craft-permissions-'))
    try {
      writeDefaultPermissions(tempConfigDir)

      const sources = getCompiledSources(tempConfigDir, '1')
      expect(sources).toContain('^craft-agent\\s+label\\s+list\\b')
      expect(sources).toContain('^rg\\b')
    } finally {
      rmSync(tempConfigDir, { recursive: true, force: true })
    }
  })
})
