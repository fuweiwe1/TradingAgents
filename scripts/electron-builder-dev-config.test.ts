import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { load } from 'js-yaml'
import { resolveInstanceConfig } from '../packages/shared/src/config/instance'

describe('StockCraft Dev package identity', () => {
  test('uses an independent builder identity without publishing', () => {
    const config = load(readFileSync(
      join(import.meta.dir, '../apps/electron/electron-builder.dev.yml'),
      'utf8',
    )) as Record<string, any>

    expect(config).toMatchObject({
      extends: './electron-builder.yml',
      appId: 'com.stockcraft.dev',
      productName: 'StockCraft Dev',
      publish: [],
    })
    expect(config.win.artifactName).toContain('StockCraft-Dev')
    expect(config.win.signAndEditExecutable).not.toBe(false)
    expect(config.nsis).toMatchObject({
      perMachine: false,
      deleteAppDataOnUninstall: true,
    })
  })

  test('derives runtime-safe paths from the baked StockCraft preset', () => {
    expect(resolveInstanceConfig({
      CRAFT_INSTANCE_PRESET: 'stockcraft-dev',
    }, {
      homeDir: 'C:\\Users\\runtime-user',
      appDataDir: 'C:\\Users\\runtime-user\\AppData\\Roaming',
    })).toEqual({
      instanceId: 'stockcraft-dev',
      appName: 'StockCraft Dev',
      configDir: 'C:\\Users\\runtime-user\\.stockcraft-dev',
      electronUserDataDir:
        'C:\\Users\\runtime-user\\AppData\\Roaming\\StockCraft Dev',
      deeplinkScheme: 'stockcraft-dev',
      vitePort: 5173,
    })
  })

  test('bakes the preset and disables original auto-updates', () => {
    const buildScript = readFileSync(
      join(import.meta.dir, 'electron-build-main.ts'),
      'utf8',
    )
    const mainSource = readFileSync(
      join(import.meta.dir, '../apps/electron/src/main/index.ts'),
      'utf8',
    )

    expect(buildScript).toContain('"CRAFT_INSTANCE_PRESET"')
    expect(mainSource).toContain(
      'if (app.isPackaged && !process.env.CRAFT_DEV_RUNTIME)',
    )
  })
})
