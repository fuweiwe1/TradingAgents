import { describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const sharedSrcDir = join(import.meta.dir, '..', '..');

function moduleUrl(relativePath: string): string {
  return pathToFileURL(join(sharedSrcDir, relativePath)).href;
}

describe('shared instance path consumers', () => {
  it('derives every runtime path from CRAFT_CONFIG_DIR at module load', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'craft-instance-paths-'));

    try {
      const result = Bun.spawnSync(
        [
          process.execPath,
          '--eval',
          `
            const workspaces = await import('${moduleUrl('workspaces/storage.ts')}');
            const docs = await import('${moduleUrl('docs/index.ts')}');
            const releaseNotes = await import('${moduleUrl('release-notes/index.ts')}');
            const credentials = await import('${moduleUrl('credentials/backends/secure-storage.ts')}');
            const interceptor = await import('${moduleUrl('interceptor-common.ts')}');
            const logo = await import('${moduleUrl('utils/logo.ts')}');
            const prerequisites = await import('${moduleUrl('agent/core/prerequisite-manager.ts')}');
            const permissions = await import('${moduleUrl('agent/permissions-config.ts')}');

            console.log(JSON.stringify({
              workspaceDir: workspaces.getDefaultWorkspacesDir(),
              docsDir: docs.DOCS_DIR,
              releaseNotesDir: releaseNotes.RELEASE_NOTES_DIR,
              credentialsFile: credentials.CREDENTIALS_FILE,
              interceptorConfigFile: interceptor.CONFIG_FILE,
              interceptorLogDir: interceptor.LOG_DIR,
              interceptorApiErrorFile: interceptor.getApiErrorFilePath?.(),
              providerDomainsCacheFile: logo.getProviderDomainsCachePath?.(),
              browserToolsDocPath: prerequisites.BROWSER_TOOLS_DOC_PATH,
              permissionsDir: permissions.getAppPermissionsDir(),
              permissionsDefaultPath: permissions.getDefaultPermissionsPath?.(),
            }));
          `,
        ],
        {
          env: {
            ...process.env,
            CRAFT_CONFIG_DIR: configDir,
            CRAFT_SESSION_DIR: '',
          },
          stdout: 'pipe',
          stderr: 'pipe',
        },
      );

      expect(result.exitCode, result.stderr.toString()).toBe(0);
      expect(JSON.parse(result.stdout.toString())).toEqual({
        workspaceDir: join(configDir, 'workspaces'),
        docsDir: join(configDir, 'docs'),
        releaseNotesDir: join(configDir, 'release-notes'),
        credentialsFile: join(configDir, 'credentials.enc'),
        interceptorConfigFile: join(configDir, 'config.json'),
        interceptorLogDir: join(configDir, 'logs'),
        interceptorApiErrorFile: join(configDir, 'api-error.json'),
        providerDomainsCacheFile: join(configDir, 'provider-domains.json'),
        browserToolsDocPath: join(configDir, 'docs', 'browser-tools.md'),
        permissionsDir: join(configDir, 'permissions'),
        permissionsDefaultPath: join(configDir, 'permissions', 'default.json'),
      });
    } finally {
      rmSync(configDir, { recursive: true, force: true });
    }
  });
});
