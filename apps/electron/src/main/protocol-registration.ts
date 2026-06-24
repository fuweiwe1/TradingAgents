import { resolve } from 'node:path'
import type { CraftInstanceConfig } from '@craft-agent/shared/config/instance'

const INSTANCE_ARGUMENTS = {
  '--craft-instance-id': 'CRAFT_INSTANCE_ID',
  '--craft-app-name': 'CRAFT_APP_NAME',
  '--craft-config-dir': 'CRAFT_CONFIG_DIR',
  '--craft-electron-user-data-dir': 'CRAFT_ELECTRON_USER_DATA_DIR',
  '--craft-deeplink-scheme': 'CRAFT_DEEPLINK_SCHEME',
  '--craft-vite-port': 'CRAFT_VITE_PORT',
} as const

function serializeInstanceConfig(config: CraftInstanceConfig): string[] {
  return [
    `--craft-instance-id=${config.instanceId}`,
    `--craft-app-name=${config.appName}`,
    `--craft-config-dir=${config.configDir}`,
    ...(config.electronUserDataDir
      ? [`--craft-electron-user-data-dir=${config.electronUserDataDir}`]
      : []),
    `--craft-deeplink-scheme=${config.deeplinkScheme}`,
    `--craft-vite-port=${config.vitePort}`,
  ]
}

export function getDevelopmentProtocolClientArgs(
  argv: string[] = process.argv,
  resolvePath: (path: string) => string = resolve,
  config?: CraftInstanceConfig,
): string[] | null {
  const appEntry = argv[1]
  if (!appEntry) return null

  return [
    resolvePath(appEntry),
    ...(config ? serializeInstanceConfig(config) : []),
  ]
}

export function applyInstanceEnvironmentFromArgs(
  argv: string[] = process.argv,
  env: Record<string, string | undefined> = process.env,
): void {
  for (const argument of argv.slice(2)) {
    const separatorIndex = argument.indexOf('=')
    if (separatorIndex < 0) continue

    const flag = argument.slice(0, separatorIndex)
    const environmentKey =
      INSTANCE_ARGUMENTS[flag as keyof typeof INSTANCE_ARGUMENTS]
    if (!environmentKey) continue

    env[environmentKey] = argument.slice(separatorIndex + 1)
  }
}
