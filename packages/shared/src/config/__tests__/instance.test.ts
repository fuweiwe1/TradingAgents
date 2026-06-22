import { describe, expect, test } from 'bun:test';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  resolveInstanceConfig,
  type InstancePathContext,
} from '../instance.ts';

const context: InstancePathContext = {
  homeDir: resolve('test-home'),
  appDataDir: resolve('test-app-data'),
};

describe('resolveInstanceConfig', () => {
  test('preserves installed production defaults', () => {
    expect(resolveInstanceConfig({}, context)).toEqual({
      instanceId: 'production',
      appName: 'Craft Agents',
      configDir: join(context.homeDir, '.craft-agent'),
      electronUserDataDir: null,
      deeplinkScheme: 'craftagents',
      vitePort: 5173,
    });
  });

  test('resolves explicit StockCraft environment values exactly', () => {
    const configDir = resolve('stockcraft-config');
    const electronUserDataDir = resolve('stockcraft-user-data');

    expect(
      resolveInstanceConfig(
        {
          CRAFT_INSTANCE_ID: 'stockcraft-dev',
          CRAFT_APP_NAME: 'StockCraft Dev',
          CRAFT_CONFIG_DIR: configDir,
          CRAFT_ELECTRON_USER_DATA_DIR: electronUserDataDir,
          CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev',
          CRAFT_VITE_PORT: '5174',
        },
        context,
      ),
    ).toEqual({
      instanceId: 'stockcraft-dev',
      appName: 'StockCraft Dev',
      configDir,
      electronUserDataDir,
      deeplinkScheme: 'stockcraft-dev',
      vitePort: 5174,
    });
  });

  test('requires every explicit identity field for non-production instances', () => {
    expect(() =>
      resolveInstanceConfig(
        {
          CRAFT_INSTANCE_ID: 'stockcraft-dev',
          CRAFT_APP_NAME: ' ',
          CRAFT_CONFIG_DIR: '',
          CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev',
        },
        context,
      ),
    ).toThrow(
      'Non-production instance stockcraft-dev is missing required environment fields: CRAFT_APP_NAME, CRAFT_CONFIG_DIR, CRAFT_ELECTRON_USER_DATA_DIR, CRAFT_VITE_PORT',
    );
  });

  test('rejects a development instance that points at production data', () => {
    const productionConfigDir = join(context.homeDir, '.craft-agent');

    expect(() =>
      resolveInstanceConfig(
        {
          CRAFT_INSTANCE_ID: 'stockcraft-dev',
          CRAFT_APP_NAME: 'StockCraft Dev',
          CRAFT_CONFIG_DIR:
            process.platform === 'win32'
              ? productionConfigDir.toUpperCase()
              : productionConfigDir,
          CRAFT_ELECTRON_USER_DATA_DIR: resolve('stockcraft-user-data'),
          CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev',
          CRAFT_VITE_PORT: '5174',
        },
        context,
      ),
    ).toThrow(
      'development instance cannot use the production config directory',
    );
  });

  test('rejects a filesystem alias to the production config directory', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'craft-instance-test-'));
    const homeDir = join(tempRoot, 'home');
    const productionConfigDir = join(homeDir, '.craft-agent');
    const configAlias = join(tempRoot, 'stockcraft-config');

    mkdirSync(productionConfigDir, { recursive: true });

    try {
      symlinkSync(
        productionConfigDir,
        configAlias,
        process.platform === 'win32' ? 'junction' : 'dir',
      );

      expect(() =>
        resolveInstanceConfig(
          {
            CRAFT_INSTANCE_ID: 'stockcraft-dev',
            CRAFT_APP_NAME: 'StockCraft Dev',
            CRAFT_CONFIG_DIR: configAlias,
            CRAFT_ELECTRON_USER_DATA_DIR: join(tempRoot, 'stockcraft-user-data'),
            CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev',
            CRAFT_VITE_PORT: '5174',
          },
          {
            homeDir,
            appDataDir: join(tempRoot, 'app-data'),
          },
        ),
      ).toThrow(
        'development instance cannot use the production config directory',
      );
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('rejects an aliased production path before its leaf exists', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'craft-instance-test-'));
    const homeDir = join(tempRoot, 'home');
    const homeAlias = join(tempRoot, 'home-alias');
    const productionConfigDir = join(homeDir, '.craft-agent');
    const configAlias = join(homeAlias, '.craft-agent');

    mkdirSync(homeDir, { recursive: true });

    try {
      symlinkSync(
        homeDir,
        homeAlias,
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      expect(existsSync(productionConfigDir)).toBe(false);
      expect(existsSync(configAlias)).toBe(false);

      expect(() =>
        resolveInstanceConfig(
          {
            CRAFT_INSTANCE_ID: 'stockcraft-dev',
            CRAFT_APP_NAME: 'StockCraft Dev',
            CRAFT_CONFIG_DIR: configAlias,
            CRAFT_ELECTRON_USER_DATA_DIR: join(tempRoot, 'stockcraft-user-data'),
            CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev',
            CRAFT_VITE_PORT: '5174',
          },
          {
            homeDir,
            appDataDir: join(tempRoot, 'app-data'),
          },
        ),
      ).toThrow(
        'development instance cannot use the production config directory',
      );
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('rejects a dangling alias whose target is the production config directory', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'craft-instance-test-'));
    const homeDir = join(tempRoot, 'home');
    const productionConfigDir = join(homeDir, '.craft-agent');
    const configAlias = join(tempRoot, 'stockcraft-config');

    mkdirSync(homeDir, { recursive: true });

    try {
      symlinkSync(
        productionConfigDir,
        configAlias,
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      expect(lstatSync(configAlias).isSymbolicLink()).toBe(true);
      expect(existsSync(configAlias)).toBe(false);
      expect(resolve(readlinkSync(configAlias))).toBe(productionConfigDir);

      expect(() =>
        resolveInstanceConfig(
          {
            CRAFT_INSTANCE_ID: 'stockcraft-dev',
            CRAFT_APP_NAME: 'StockCraft Dev',
            CRAFT_CONFIG_DIR: configAlias,
            CRAFT_ELECTRON_USER_DATA_DIR: join(tempRoot, 'stockcraft-user-data'),
            CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev',
            CRAFT_VITE_PORT: '5174',
          },
          {
            homeDir,
            appDataDir: join(tempRoot, 'app-data'),
          },
        ),
      ).toThrow(
        'development instance cannot use the production config directory',
      );
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('rejects symlink cycles while canonicalizing instance paths', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'craft-instance-test-'));
    const firstAlias = join(tempRoot, 'first-alias');
    const secondAlias = join(tempRoot, 'second-alias');

    try {
      symlinkSync(
        secondAlias,
        firstAlias,
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      symlinkSync(
        firstAlias,
        secondAlias,
        process.platform === 'win32' ? 'junction' : 'dir',
      );

      expect(() =>
        resolveInstanceConfig(
          {
            CRAFT_INSTANCE_ID: 'stockcraft-dev',
            CRAFT_APP_NAME: 'StockCraft Dev',
            CRAFT_CONFIG_DIR: firstAlias,
            CRAFT_ELECTRON_USER_DATA_DIR: join(tempRoot, 'stockcraft-user-data'),
            CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev',
            CRAFT_VITE_PORT: '5174',
          },
          {
            homeDir: join(tempRoot, 'home'),
            appDataDir: join(tempRoot, 'app-data'),
          },
        ),
      ).toThrow('Symlink cycle detected while resolving path');
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test.each(['0', '65536', '5173.5', 'not-a-port'])(
    'rejects invalid Vite port %s',
    vitePort => {
      expect(() =>
        resolveInstanceConfig({ CRAFT_VITE_PORT: vitePort }, context),
      ).toThrow('Invalid CRAFT_VITE_PORT');
    },
  );

  test('rejects identical config and Electron user data directories', () => {
    const sharedDir = resolve('shared-instance-data');

    expect(() =>
      resolveInstanceConfig(
        {
          CRAFT_CONFIG_DIR: sharedDir,
          CRAFT_ELECTRON_USER_DATA_DIR:
            process.platform === 'win32' ? sharedDir.toUpperCase() : sharedDir,
        },
        context,
      ),
    ).toThrow('configDir and electronUserDataDir must be different');
  });
});

describe('central path exports', () => {
  test('derives CONFIG_DIR from INSTANCE_CONFIG', async () => {
    const { CONFIG_DIR, INSTANCE_CONFIG } = await import('../paths.ts');

    expect(CONFIG_DIR).toBe(INSTANCE_CONFIG.configDir);
  });
});
