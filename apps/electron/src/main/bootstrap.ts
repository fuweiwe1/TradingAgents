import { app } from 'electron'
import { runElectronBootstrap } from './configure-instance'
import { applyInstanceEnvironmentFromArgs } from './protocol-registration'

applyInstanceEnvironmentFromArgs()
void runElectronBootstrap({
  app,
  loadConfig: async () =>
    (await import('@craft-agent/shared/config/instance')).INSTANCE_CONFIG,
  loadMain: () => import('./index'),
  logger: console,
})
