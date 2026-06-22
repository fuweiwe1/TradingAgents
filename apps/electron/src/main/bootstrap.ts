import { app } from 'electron'
import { runElectronBootstrap } from './configure-instance'

void runElectronBootstrap({
  app,
  loadConfig: async () =>
    (await import('@craft-agent/shared/config/instance')).INSTANCE_CONFIG,
  loadMain: () => import('./index'),
  logger: console,
})
