import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const repoRoot = join(import.meta.dir, '..', '..', '..', '..', '..')

function moduleUrl(relativePath: string): string {
  return pathToFileURL(join(repoRoot, relativePath)).href
}

describe('Electron and server instance storage paths', () => {
  it('derives every runtime path from CRAFT_CONFIG_DIR at module load', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'craft-runtime-paths-'))
    const workspaceId = 'workspace-123'

    try {
      const result = Bun.spawnSync(
        [
          process.execPath,
          '--eval',
          `
            const paths = await import('${moduleUrl('packages/server-core/src/runtime-paths.ts')}');
            const configValidate = await import('${moduleUrl('packages/session-tools-core/src/handlers/config-validate.ts')}');

            console.log(JSON.stringify({
              stockDatabase: paths.STOCK_DATABASE_PATH,
              headlessStockDatabase: paths.STOCK_DATABASE_PATH,
              windowState: paths.WINDOW_STATE_PATH,
              messagingLog: paths.MESSAGING_GATEWAY_LOG_PATH,
              electronWorkspaceMessaging: paths.getWorkspaceMessagingDir('${workspaceId}'),
              headlessWorkspaceMessaging: paths.getWorkspaceMessagingDir('${workspaceId}'),
              privilegedAudit: paths.PRIVILEGED_AUDIT_LOG_PATH,
              authConfig: paths.AUTH_CONFIG_PATH,
              defaultWorkspaces: paths.DEFAULT_WORKSPACES_DIR,
              sessionToolsConfigRoot: configValidate.SESSION_TOOLS_CONFIG_ROOT,
            }));
          `,
        ],
        {
          env: {
            ...process.env,
            CRAFT_CONFIG_DIR: configDir,
            CRAFT_SESSION_DIR: '',
          },
          stdout: 'pipe',
          stderr: 'pipe',
        },
      )

      expect(result.exitCode, result.stderr.toString()).toBe(0)
      expect(JSON.parse(result.stdout.toString())).toEqual({
        stockDatabase: join(configDir, 'stockcraft.sqlite'),
        headlessStockDatabase: join(configDir, 'stockcraft.sqlite'),
        windowState: join(configDir, 'window-state.json'),
        messagingLog: join(configDir, 'logs', 'messaging-gateway.log'),
        electronWorkspaceMessaging: join(configDir, 'workspaces', workspaceId, 'messaging'),
        headlessWorkspaceMessaging: join(configDir, 'workspaces', workspaceId, 'messaging'),
        privilegedAudit: join(configDir, 'logs', 'privileged-actions.jsonl'),
        authConfig: join(configDir, 'config.json'),
        defaultWorkspaces: join(configDir, 'workspaces'),
        sessionToolsConfigRoot: configDir,
      })
    } finally {
      rmSync(configDir, { recursive: true, force: true })
    }
  })
})
