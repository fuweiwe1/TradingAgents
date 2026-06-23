import {
  INSTANCE_CONFIG,
  type CraftInstanceConfig,
} from './instance'

const INSTANCE_ENVIRONMENT_KEYS = [
  'CRAFT_INSTANCE_ID',
  'CRAFT_CONFIG_DIR',
  'CRAFT_APP_NAME',
  'CRAFT_DEEPLINK_SCHEME',
  'CRAFT_ELECTRON_USER_DATA_DIR',
] as const

function instanceConfigEnvironment(
  config: CraftInstanceConfig,
): Record<(typeof INSTANCE_ENVIRONMENT_KEYS)[number], string | undefined> {
  return {
    CRAFT_INSTANCE_ID: config.instanceId,
    CRAFT_CONFIG_DIR: config.configDir,
    CRAFT_APP_NAME: config.appName,
    CRAFT_DEEPLINK_SCHEME: config.deeplinkScheme,
    CRAFT_ELECTRON_USER_DATA_DIR: config.electronUserDataDir || undefined,
  }
}

export function getInstanceEnvironment(
  env: NodeJS.ProcessEnv = process.env,
  config: CraftInstanceConfig | null =
    env === process.env ? INSTANCE_CONFIG : null,
): Record<string, string> {
  const instanceEnvironment: Record<string, string> = {}
  const resolvedEnvironment = config
    ? instanceConfigEnvironment(config)
    : null

  for (const key of INSTANCE_ENVIRONMENT_KEYS) {
    const value = env[key] || resolvedEnvironment?.[key]
    if (value?.trim()) instanceEnvironment[key] = value
  }

  return instanceEnvironment
}
