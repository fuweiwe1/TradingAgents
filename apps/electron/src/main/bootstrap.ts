import { INSTANCE_CONFIG } from '@craft-agent/shared/config/instance'
import { app } from 'electron'
import { configureElectronInstance } from './configure-instance'

void configureElectronInstance({
  app,
  config: INSTANCE_CONFIG,
  loadMain: () => import('./index'),
}).catch(error => {
  console.error('Failed to bootstrap Electron instance:', error)
  app.exit(1)
})
