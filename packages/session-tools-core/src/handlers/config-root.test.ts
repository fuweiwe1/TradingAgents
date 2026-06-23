import { describe, expect, it } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveSessionToolsConfigRoot } from './config-validate.ts';

describe('session tools config root', () => {
  it('uses CRAFT_CONFIG_DIR when provided', () => {
    const configDir = join(tmpdir(), 'custom-craft-config');

    expect(resolveSessionToolsConfigRoot({ CRAFT_CONFIG_DIR: configDir }, homedir())).toBe(
      configDir,
    );
  });

  it('uses the production config directory by default', () => {
    const homeDir = join(tmpdir(), 'production-home');

    expect(resolveSessionToolsConfigRoot({}, homeDir)).toBe(
      join(homeDir, '.craft-agent'),
    );
  });

  it('captures CRAFT_CONFIG_DIR when the handler module loads', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'session-tools-config-root-'));
    const moduleUrl = pathToFileURL(join(import.meta.dir, 'config-validate.ts')).href;

    try {
      const result = Bun.spawnSync(
        [
          process.execPath,
          '--eval',
          `
            const configValidate = await import(${JSON.stringify(moduleUrl)});
            console.log(configValidate.SESSION_TOOLS_CONFIG_ROOT);
          `,
        ],
        {
          env: {
            ...process.env,
            CRAFT_CONFIG_DIR: configDir,
          },
          stdout: 'pipe',
          stderr: 'pipe',
        },
      );

      expect(result.exitCode, result.stderr.toString()).toBe(0);
      expect(result.stdout.toString().trim()).toBe(configDir);
    } finally {
      rmSync(configDir, { recursive: true, force: true });
    }
  });

  it('does not depend on the higher-level shared package', () => {
    const source = readFileSync(join(import.meta.dir, 'config-validate.ts'), 'utf8');

    expect(source).not.toContain('@craft-agent/shared');
  });
});
