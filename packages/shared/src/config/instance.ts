import { lstatSync, readlinkSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

export interface InstanceEnvironment {
  [key: string]: string | undefined;
  CRAFT_INSTANCE_PRESET?: string;
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

function defaultRealpath(
  path: string,
  resolvingLinks = new Set<string>(),
): string {
  const resolvedPath = resolve(path);
  try {
    const stats = lstatSync(resolvedPath);
    if (stats.isSymbolicLink()) {
      const cycleKey =
        process.platform === 'win32'
          ? resolvedPath.toLowerCase()
          : resolvedPath;
      if (resolvingLinks.has(cycleKey)) {
        throw new Error(
          `Symlink cycle detected while resolving path: ${resolvedPath}`,
        );
      }

      resolvingLinks.add(cycleKey);
      try {
        const linkTarget = readlinkSync(resolvedPath);
        return defaultRealpath(
          resolve(dirname(resolvedPath), linkTarget),
          resolvingLinks,
        );
      } finally {
        resolvingLinks.delete(cycleKey);
      }
    }

    return realpathSync.native(resolvedPath);
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode !== 'ENOENT' && errorCode !== 'ENOTDIR') {
      throw error;
    }
  }

  const parent = dirname(resolvedPath);
  if (parent === resolvedPath) {
    return resolvedPath;
  }

  return resolve(
    defaultRealpath(parent, resolvingLinks),
    basename(resolvedPath),
  );
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

function getRuntimeInstanceEnvironment(): InstanceEnvironment {
  return {
    ...process.env,
    // Keep this direct access so packaged development builds can bake a
    // runtime preset without embedding build-machine-specific absolute paths.
    CRAFT_INSTANCE_PRESET: process.env.CRAFT_INSTANCE_PRESET,
  };
}

export function resolveInstanceConfig(
  env: InstanceEnvironment = getRuntimeInstanceEnvironment(),
  context: InstancePathContext = {
    homeDir: homedir(),
    appDataDir: process.env.APPDATA || join(homedir(), '.config'),
  },
): CraftInstanceConfig {
  const preset = env.CRAFT_INSTANCE_PRESET?.trim();
  if (preset && preset !== 'stockcraft-dev') {
    throw new Error(`Unknown CRAFT_INSTANCE_PRESET: ${preset}`);
  }

  const presetDefaults = preset === 'stockcraft-dev'
    ? {
        instanceId: 'stockcraft-dev',
        appName: 'StockCraft Dev',
        configDir: join(context.homeDir, '.stockcraft-dev'),
        electronUserDataDir: join(context.appDataDir, 'StockCraft Dev'),
        deeplinkScheme: 'stockcraft-dev',
        vitePort: '5173',
      }
    : null;

  const instanceId =
    env.CRAFT_INSTANCE_ID || presetDefaults?.instanceId || 'production';
  if (instanceId !== 'production') {
    const missingFields = NON_PRODUCTION_REQUIRED_FIELDS.filter(
      field => {
        if (env[field]?.trim()) return false;
        if (!presetDefaults) return true;
        return !({
          CRAFT_APP_NAME: presetDefaults.appName,
          CRAFT_CONFIG_DIR: presetDefaults.configDir,
          CRAFT_ELECTRON_USER_DATA_DIR: presetDefaults.electronUserDataDir,
          CRAFT_DEEPLINK_SCHEME: presetDefaults.deeplinkScheme,
          CRAFT_VITE_PORT: presetDefaults.vitePort,
        } as Record<string, string>)[field];
      },
    );

    if (missingFields.length > 0) {
      throw new Error(
        `Non-production instance ${instanceId} is missing required environment fields: ${missingFields.join(', ')}`,
      );
    }
  }

  const canonicalizePath = context.realpath || defaultRealpath;
  const productionConfigDir = resolve(context.homeDir, '.craft-agent');
  const configDir = resolve(
    env.CRAFT_CONFIG_DIR || presetDefaults?.configDir || productionConfigDir,
  );
  const electronUserDataValue =
    env.CRAFT_ELECTRON_USER_DATA_DIR ||
    presetDefaults?.electronUserDataDir;
  const electronUserDataDir = electronUserDataValue
    ? resolve(electronUserDataValue)
    : null;
  const vitePort = Number(
    env.CRAFT_VITE_PORT || presetDefaults?.vitePort || '5173',
  );

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
    appName: env.CRAFT_APP_NAME || presetDefaults?.appName || 'Craft Agents',
    configDir,
    electronUserDataDir,
    deeplinkScheme:
      env.CRAFT_DEEPLINK_SCHEME ||
      presetDefaults?.deeplinkScheme ||
      'craftagents',
    vitePort,
  };
}

export const INSTANCE_CONFIG = resolveInstanceConfig();
