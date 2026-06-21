import { describe, expect, test } from 'bun:test';
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

  test('rejects a development instance that points at production data', () => {
    const productionConfigDir = join(context.homeDir, '.craft-agent');

    expect(() =>
      resolveInstanceConfig(
        {
          CRAFT_INSTANCE_ID: 'stockcraft-dev',
          CRAFT_CONFIG_DIR:
            process.platform === 'win32'
              ? productionConfigDir.toUpperCase()
              : productionConfigDir,
        },
        context,
      ),
    ).toThrow(
      'development instance cannot use the production config directory',
    );
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
