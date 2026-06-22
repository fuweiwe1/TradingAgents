import { expect, test } from 'bun:test'
import { configureElectronInstance } from '../configure-instance'

test('sets app identity before loading main implementation', async () => {
  const calls: string[] = []

  await configureElectronInstance({
    app: {
      setName: (name: string) => calls.push(`name:${name}`),
      setPath: (key: string, value: string) =>
        calls.push(`path:${key}:${value}`),
    },
    config: {
      instanceId: 'stockcraft-dev',
      appName: 'StockCraft Dev',
      configDir: 'C:\\Users\\tester\\.stockcraft-dev',
      electronUserDataDir:
        'C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
      deeplinkScheme: 'stockcraft-dev',
      vitePort: 5173,
    },
    loadMain: async () => {
      calls.push('load-main')
    },
  })

  expect(calls).toEqual([
    'name:StockCraft Dev',
    'path:userData:C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
    'load-main',
  ])
})

test('does not override Electron user data for production defaults', async () => {
  const calls: string[] = []

  await configureElectronInstance({
    app: {
      setName: (name: string) => calls.push(`name:${name}`),
      setPath: (key: string, value: string) =>
        calls.push(`path:${key}:${value}`),
    },
    config: {
      instanceId: 'production',
      appName: 'Craft Agents',
      configDir: 'C:\\Users\\tester\\.craft-agent',
      electronUserDataDir: null,
      deeplinkScheme: 'craftagents',
      vitePort: 5173,
    },
    loadMain: async () => {
      calls.push('load-main')
    },
  })

  expect(calls).toEqual(['name:Craft Agents', 'load-main'])
})

test('bootstrap always runs and handles failures exactly once', async () => {
  const bootstrapSource = await Bun.file(
    new URL('../bootstrap.ts', import.meta.url),
  ).text()

  expect(bootstrapSource).not.toContain('NODE_ENV')
  expect(bootstrapSource.match(/\.catch\(/g)).toHaveLength(1)
  expect(bootstrapSource.match(/app\.exit\(1\)/g)).toHaveLength(1)
  expect(bootstrapSource).not.toContain('await import(')
})
