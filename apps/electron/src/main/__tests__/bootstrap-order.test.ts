import { expect, test } from 'bun:test'
import { configureElectronInstance } from '../bootstrap'

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
