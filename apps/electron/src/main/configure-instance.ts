import type { CraftInstanceConfig } from '@craft-agent/shared/config/instance'

interface ElectronInstanceApp {
  setName(name: string): void
  setPath(name: string, path: string): void
}

interface ElectronInstanceDependencies {
  app: ElectronInstanceApp
  config: CraftInstanceConfig
  loadMain: () => Promise<unknown>
}

export async function configureElectronInstance(
  deps: ElectronInstanceDependencies,
): Promise<void> {
  deps.app.setName(deps.config.appName)
  if (deps.config.electronUserDataDir !== null) {
    deps.app.setPath('userData', deps.config.electronUserDataDir)
  }
  await deps.loadMain()
}
