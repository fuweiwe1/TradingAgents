import { expect, test } from 'bun:test'
import { runElectronBootstrap } from '../configure-instance'

test('sets app identity before loading main implementation', async () => {
  const calls: string[] = []

  await runElectronBootstrap({
    app: {
      setName: (name: string) => calls.push(`name:${name}`),
      setPath: (key: string, value: string) =>
        calls.push(`path:${key}:${value}`),
      exit: (code: number) => calls.push(`exit:${code}`),
    },
    loadConfig: async () => {
      calls.push('load-config')
      return {
        instanceId: 'stockcraft-dev',
        appName: 'StockCraft Dev',
        configDir: 'C:\\Users\\tester\\.stockcraft-dev',
        electronUserDataDir:
          'C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
        deeplinkScheme: 'stockcraft-dev',
        vitePort: 5173,
      }
    },
    loadMain: async () => {
      calls.push('load-main')
    },
    logger: {
      error: (...args: unknown[]) => calls.push(`error:${args.join(' ')}`),
    },
  })

  expect(calls).toEqual([
    'load-config',
    'name:StockCraft Dev',
    'path:userData:C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
    'load-main',
  ])
})

test('does not override Electron user data for production defaults', async () => {
  const calls: string[] = []

  await runElectronBootstrap({
    app: {
      setName: (name: string) => calls.push(`name:${name}`),
      setPath: (key: string, value: string) =>
        calls.push(`path:${key}:${value}`),
      exit: (code: number) => calls.push(`exit:${code}`),
    },
    loadConfig: async () => ({
      instanceId: 'production',
      appName: 'Craft Agents',
      configDir: 'C:\\Users\\tester\\.craft-agent',
      electronUserDataDir: null,
      deeplinkScheme: 'craftagents',
      vitePort: 5173,
    }),
    loadMain: async () => {
      calls.push('load-main')
    },
    logger: {
      error: (...args: unknown[]) => calls.push(`error:${args.join(' ')}`),
    },
  })

  expect(calls).toEqual(['name:Craft Agents', 'load-main'])
})

test('logs and exits when loading instance config fails', async () => {
  const errors: unknown[][] = []
  const exits: number[] = []
  let mainLoaded = false

  await runElectronBootstrap({
    app: {
      setName: () => {
        throw new Error('setName must not run')
      },
      setPath: () => {
        throw new Error('setPath must not run')
      },
      exit: (code: number) => exits.push(code),
    },
    loadConfig: async () => {
      throw new Error('invalid instance environment')
    },
    loadMain: async () => {
      mainLoaded = true
    },
    logger: {
      error: (...args: unknown[]) => errors.push(args),
    },
  })

  expect(errors).toHaveLength(1)
  expect(errors[0]?.[0]).toBe('Failed to bootstrap Electron instance:')
  expect(errors[0]?.[1]).toBeInstanceOf(Error)
  expect(exits).toEqual([1])
  expect(mainLoaded).toBe(false)
})

test('bootstrap dynamically loads config and main without a NODE_ENV guard', async () => {
  const bootstrapSource = await Bun.file(
    new URL('../bootstrap.ts', import.meta.url),
  ).text()

  expect(bootstrapSource).not.toContain('NODE_ENV')
  expect(bootstrapSource).not.toContain('INSTANCE_CONFIG } from')
  expect(bootstrapSource).toContain('applyInstanceEnvironmentFromArgs')
  expect(bootstrapSource.indexOf('applyInstanceEnvironmentFromArgs()')).toBeLessThan(
    bootstrapSource.indexOf('void runElectronBootstrap'),
  )
  expect(bootstrapSource).toContain(
    "import('@craft-agent/shared/config/instance')",
  )
  expect(bootstrapSource).toContain("import('./index')")
})
