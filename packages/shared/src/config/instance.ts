import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export interface InstanceEnvironment {
  [key: string]: string | undefined;
  CRAFT_INSTANCE_ID?: string;
  CRAFT_APP_NAME?: string;
  CRAFT_CONFIG_DIR?: string;
  CRAFT_ELECTRON_USER_DATA_DIR?: string;
  CRAFT_DEEPLINK_SCHEME?: string;
  CRAFT_VITE_PORT?: string;
}

export interface InstancePathContext {
  homeDir: string;
  appDataDir: string;
}

export interface CraftInstanceConfig {
  instanceId: string;
  appName: string;
  configDir: string;
  electronUserDataDir: string | null;
  deeplinkScheme: string;
  vitePort: number;
}

function pathsEqual(left: string, right: string): boolean {
  const normalizedLeft = resolve(left);
  const normalizedRight = resolve(right);

  return process.platform === 'win32'
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

export function resolveInstanceConfig(
  env: InstanceEnvironment = process.env,
  context: InstancePathContext = {
    homeDir: homedir(),
    appDataDir: process.env.APPDATA || join(homedir(), '.config'),
  },
): CraftInstanceConfig {
  const instanceId = env.CRAFT_INSTANCE_ID || 'production';
  const productionConfigDir = resolve(context.homeDir, '.craft-agent');
  const configDir = resolve(env.CRAFT_CONFIG_DIR || productionConfigDir);
  const electronUserDataDir = env.CRAFT_ELECTRON_USER_DATA_DIR
    ? resolve(env.CRAFT_ELECTRON_USER_DATA_DIR)
    : null;
  const vitePort = Number(env.CRAFT_VITE_PORT || '5173');

  if (!Number.isInteger(vitePort) || vitePort < 1 || vitePort > 65535) {
    throw new Error(`Invalid CRAFT_VITE_PORT: ${env.CRAFT_VITE_PORT}`);
  }

  if (
    instanceId !== 'production' &&
    pathsEqual(configDir, productionConfigDir)
  ) {
    throw new Error(
      'development instance cannot use the production config directory',
    );
  }

  if (electronUserDataDir && pathsEqual(electronUserDataDir, configDir)) {
    throw new Error('configDir and electronUserDataDir must be different');
  }

  return {
    instanceId,
    appName: env.CRAFT_APP_NAME || 'Craft Agents',
    configDir,
    electronUserDataDir,
    deeplinkScheme: env.CRAFT_DEEPLINK_SCHEME || 'craftagents',
    vitePort,
  };
}

export const INSTANCE_CONFIG = resolveInstanceConfig();
