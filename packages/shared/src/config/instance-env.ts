const INSTANCE_ENVIRONMENT_KEYS = [
  'CRAFT_INSTANCE_ID',
  'CRAFT_CONFIG_DIR',
  'CRAFT_APP_NAME',
  'CRAFT_DEEPLINK_SCHEME',
  'CRAFT_ELECTRON_USER_DATA_DIR',
] as const

export function getInstanceEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const instanceEnvironment: Record<string, string> = {}

  for (const key of INSTANCE_ENVIRONMENT_KEYS) {
    const value = env[key]
    if (value?.trim()) instanceEnvironment[key] = value
  }

  return instanceEnvironment
}
