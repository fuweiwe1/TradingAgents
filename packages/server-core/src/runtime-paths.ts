import { join } from 'node:path'
import { CONFIG_DIR } from '@craft-agent/shared/config/paths'

export const STOCK_DATABASE_PATH = join(CONFIG_DIR, 'stockcraft.sqlite')
export const WINDOW_STATE_PATH = join(CONFIG_DIR, 'window-state.json')
export const MESSAGING_GATEWAY_LOG_PATH = join(
  CONFIG_DIR,
  'logs',
  'messaging-gateway.log',
)
export const PRIVILEGED_AUDIT_LOG_PATH = join(
  CONFIG_DIR,
  'logs',
  'privileged-actions.jsonl',
)
export const AUTH_CONFIG_PATH = join(CONFIG_DIR, 'config.json')
export const DEFAULT_WORKSPACES_DIR = join(CONFIG_DIR, 'workspaces')

export function getWorkspaceMessagingDir(workspaceId: string): string {
  return join(DEFAULT_WORKSPACES_DIR, workspaceId, 'messaging')
}
