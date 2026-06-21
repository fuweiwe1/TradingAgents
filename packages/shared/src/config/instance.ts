import { existsSync, realpathSync } from 'node:fs';
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
  realpath?: (path: string) => string;
}

export interface CraftInstanceConfig {
  instanceId: string;
  appName: string;
  configDir: string;
  electronUserDataDir: string | null;
  deeplinkScheme: string;
  vitePort: number;
}

const NON_PRODUCTION_REQUIRED_FIELDS = [
  'CRAFT_APP_NAME',
  'CRAFT_CONFIG_DIR',
  'CRAFT_ELECTRON_USER_DATA_DIR',
  'CRAFT_DEEPLINK_SCHEME',
  'CRAFT_VITE_PORT',
] as const satisfies readonly (keyof InstanceEnvironment)[];

function defaultRealpath(path: string): string {
  const resolvedPath = resolve(path);
  return existsSync(resolvedPath)
    ? realpathSync.native(resolvedPath)
    : resolvedPath;
}

function pathsEqual(
  left: string,
  right: string,
  realpath: (path: string) => string,
): boolean {
  const normalizedLeft = resolve(realpath(left));
  const normalizedRight = resolve(realpath(right));

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
  if (instanceId !== 'production') {
    const missingFields = NON_PRODUCTION_REQUIRED_FIELDS.filter(
      field => !env[field]?.trim(),
    );

    if (missingFields.length > 0) {
      throw new Error(
        `Non-production instance ${instanceId} is missing required environment fields: ${missingFields.join(', ')}`,
      );
    }
  }

  const canonicalizePath = context.realpath || defaultRealpath;
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
    pathsEqual(configDir, productionConfigDir, canonicalizePath)
  ) {
    throw new Error(
      'development instance cannot use the production config directory',
    );
  }

  if (
    electronUserDataDir &&
    pathsEqual(electronUserDataDir, configDir, canonicalizePath)
  ) {
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
