import { describe, expect, test } from 'bun:test'
import {
  applyInstanceEnvironmentFromArgs,
  getDevelopmentProtocolClientArgs,
} from '../protocol-registration'

const INSTANCE_CONFIG = {
  instanceId: 'stockcraft-dev',
  appName: 'StockCraft Dev',
  configDir: 'C:\\Users\\tester\\.stockcraft-dev',
  electronUserDataDir:
    'C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
  deeplinkScheme: 'stockcraft-dev',
  vitePort: 5173,
}

describe('getDevelopmentProtocolClientArgs', () => {
  test('resolves the Electron app entry to an absolute path', () => {
    expect(getDevelopmentProtocolClientArgs(
      ['electron.exe', 'apps/electron'],
      path => `C:\\repo\\${path.replace('/', '\\')}`,
      INSTANCE_CONFIG,
    )).toEqual([
      'C:\\repo\\apps\\electron',
      '--craft-instance-id=stockcraft-dev',
      '--craft-app-name=StockCraft Dev',
      '--craft-config-dir=C:\\Users\\tester\\.stockcraft-dev',
      '--craft-electron-user-data-dir=C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
      '--craft-deeplink-scheme=stockcraft-dev',
      '--craft-vite-port=5173',
    ])
  })

  test('returns null when Electron has no app entry argument', () => {
    expect(getDevelopmentProtocolClientArgs(['electron.exe'])).toBeNull()
  })

  test('restores instance environment before configuration loads', () => {
    const env: Record<string, string | undefined> = {}

    applyInstanceEnvironmentFromArgs([
      'electron.exe',
      'C:\\repo\\apps\\electron',
      '--craft-instance-id=stockcraft-dev',
      '--craft-app-name=StockCraft Dev',
      '--craft-config-dir=C:\\Users\\tester\\.stockcraft-dev',
      '--craft-electron-user-data-dir=C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
      '--craft-deeplink-scheme=stockcraft-dev',
      '--craft-vite-port=5173',
      'stockcraft-dev://settings',
    ], env)

    expect(env).toEqual({
      CRAFT_INSTANCE_ID: 'stockcraft-dev',
      CRAFT_APP_NAME: 'StockCraft Dev',
      CRAFT_CONFIG_DIR: 'C:\\Users\\tester\\.stockcraft-dev',
      CRAFT_ELECTRON_USER_DATA_DIR:
        'C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
      CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev',
      CRAFT_VITE_PORT: '5173',
    })
  })
})

test('only the primary Electron instance performs full initialization', async () => {
  const mainSource = await Bun.file(
    new URL('../index.ts', import.meta.url),
  ).text()

  expect(mainSource).toMatch(
    /if \(gotTheLock\) \{\r?\n\s+app\.whenReady\(\)\.then\(async \(\) => \{/,
  )
})
