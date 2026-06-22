import type { CraftInstanceConfig } from '@craft-agent/shared/config/instance'

interface ElectronInstanceApp {
  setName(name: string): void
  setPath(name: string, path: string): void
  exit(code: number): void
}

interface ElectronInstanceDependencies {
  app: ElectronInstanceApp
  loadConfig: () => Promise<CraftInstanceConfig>
  loadMain: () => Promise<unknown>
  logger: {
    error(...args: unknown[]): void
  }
}

export async function runElectronBootstrap(
  deps: ElectronInstanceDependencies,
): Promise<void> {
  try {
    const config = await deps.loadConfig()
    deps.app.setName(config.appName)
    if (config.electronUserDataDir !== null) {
      deps.app.setPath('userData', config.electronUserDataDir)
    }
    await deps.loadMain()
  } catch (error) {
    deps.logger.error('Failed to bootstrap Electron instance:', error)
    deps.app.exit(1)
  }
}
