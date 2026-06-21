# StockCraft Dev Instance Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `bun run electron:dev` run as a fully isolated `StockCraft Dev` application without reading or writing the installed Craft Agents application's data, locks, Chromium profile, protocol, or package identity.

**Architecture:** Add a runtime-neutral instance configuration module as the single source of truth for application identity and paths. Inject StockCraft Dev defaults from the development launcher, configure Electron `userData` in a tiny bootstrap before importing the existing main process, and replace production `~/.craft-agent` literals with paths derived from `CONFIG_DIR`. Keep production defaults unchanged.

**Tech Stack:** TypeScript, Bun test runner, Electron 39, esbuild, electron-builder, PowerShell smoke tests.

---

## File Structure

New focused files:

- `packages/shared/src/config/instance.ts`: resolve and validate instance identity from environment plus OS paths.
- `packages/shared/src/config/__tests__/instance.test.ts`: pure instance-resolution tests.
- `scripts/electron-instance.ts`: derive development defaults, including numbered development instances.
- `scripts/electron-instance.test.ts`: launcher-default tests.
- `apps/electron/src/main/bootstrap.ts`: set Electron name/userData before dynamically importing the current main implementation.
- `apps/electron/src/main/__tests__/bootstrap-order.test.ts`: assert bootstrap ordering without launching a GUI.
- `scripts/check-instance-paths.ts`: fail when production code introduces a forbidden `~/.craft-agent` runtime path.
- `scripts/check-instance-paths.test.ts`: guard-script fixture tests.
- `apps/electron/electron-builder.dev.yml`: separate StockCraft Dev package identity and update policy.

Existing files remain responsible for their current behavior; only their path source or entry point changes.

### Task 1: Central Instance Configuration

**Files:**

- Create: `packages/shared/src/config/instance.ts`
- Create: `packages/shared/src/config/__tests__/instance.test.ts`
- Modify: `packages/shared/src/config/paths.ts`
- Modify: `packages/shared/src/config/index.ts`
- Modify: `packages/shared/package.json`

- [ ] **Step 1: Write failing instance-resolution tests**

```ts
import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { resolveInstanceConfig } from '../instance'

describe('resolveInstanceConfig', () => {
  test('preserves installed production defaults', () => {
    expect(resolveInstanceConfig({}, {
      homeDir: 'C:\\Users\\tester',
      appDataDir: 'C:\\Users\\tester\\AppData\\Roaming',
    })).toEqual({
      instanceId: 'production',
      appName: 'Craft Agents',
      configDir: join('C:\\Users\\tester', '.craft-agent'),
      electronUserDataDir: null,
      deeplinkScheme: 'craftagents',
      vitePort: 5173,
    })
  })

  test('resolves a fully isolated StockCraft development instance', () => {
    expect(resolveInstanceConfig({
      CRAFT_INSTANCE_ID: 'stockcraft-dev',
      CRAFT_APP_NAME: 'StockCraft Dev',
      CRAFT_CONFIG_DIR: 'C:\\Users\\tester\\.stockcraft-dev',
      CRAFT_ELECTRON_USER_DATA_DIR:
        'C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
      CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev',
      CRAFT_VITE_PORT: '5173',
    }, {
      homeDir: 'C:\\Users\\tester',
      appDataDir: 'C:\\Users\\tester\\AppData\\Roaming',
    })).toMatchObject({
      instanceId: 'stockcraft-dev',
      appName: 'StockCraft Dev',
      configDir: 'C:\\Users\\tester\\.stockcraft-dev',
      electronUserDataDir:
        'C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
      deeplinkScheme: 'stockcraft-dev',
      vitePort: 5173,
    })
  })

  test('rejects a development instance that points at production data', () => {
    expect(() => resolveInstanceConfig({
      CRAFT_INSTANCE_ID: 'stockcraft-dev',
      CRAFT_CONFIG_DIR: 'C:\\Users\\tester\\.craft-agent',
    }, {
      homeDir: 'C:\\Users\\tester',
      appDataDir: 'C:\\Users\\tester\\AppData\\Roaming',
    })).toThrow('development instance cannot use the production config directory')
  })
})
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
bun test packages/shared/src/config/__tests__/instance.test.ts
```

Expected: FAIL because `../instance` does not exist.

- [ ] **Step 3: Implement the pure resolver**

```ts
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export interface InstanceEnvironment {
  CRAFT_INSTANCE_ID?: string
  CRAFT_APP_NAME?: string
  CRAFT_CONFIG_DIR?: string
  CRAFT_ELECTRON_USER_DATA_DIR?: string
  CRAFT_DEEPLINK_SCHEME?: string
  CRAFT_VITE_PORT?: string
}

export interface InstancePathContext {
  homeDir: string
  appDataDir: string
}

export interface CraftInstanceConfig {
  instanceId: string
  appName: string
  configDir: string
  electronUserDataDir: string | null
  deeplinkScheme: string
  vitePort: number
}

export function resolveInstanceConfig(
  env: InstanceEnvironment = process.env,
  context: InstancePathContext = {
    homeDir: homedir(),
    appDataDir: process.env.APPDATA || join(homedir(), '.config'),
  },
): CraftInstanceConfig {
  const instanceId = env.CRAFT_INSTANCE_ID || 'production'
  const productionConfigDir = resolve(context.homeDir, '.craft-agent')
  const configDir = resolve(
    env.CRAFT_CONFIG_DIR || productionConfigDir,
  )
  const electronUserDataDir = env.CRAFT_ELECTRON_USER_DATA_DIR
    ? resolve(env.CRAFT_ELECTRON_USER_DATA_DIR)
    : null
  const vitePort = Number(env.CRAFT_VITE_PORT || '5173')

  if (!Number.isInteger(vitePort) || vitePort < 1 || vitePort > 65535) {
    throw new Error(`Invalid CRAFT_VITE_PORT: ${env.CRAFT_VITE_PORT}`)
  }
  if (
    instanceId !== 'production' &&
    configDir.toLowerCase() === productionConfigDir.toLowerCase()
  ) {
    throw new Error(
      'development instance cannot use the production config directory',
    )
  }
  if (
    electronUserDataDir &&
    electronUserDataDir.toLowerCase() === configDir.toLowerCase()
  ) {
    throw new Error('configDir and electronUserDataDir must be different')
  }

  return {
    instanceId,
    appName: env.CRAFT_APP_NAME || 'Craft Agents',
    configDir,
    electronUserDataDir,
    deeplinkScheme: env.CRAFT_DEEPLINK_SCHEME || 'craftagents',
    vitePort,
  }
}

export const INSTANCE_CONFIG = resolveInstanceConfig()
```

Change `paths.ts` to:

```ts
export { INSTANCE_CONFIG } from './instance'
export const CONFIG_DIR = INSTANCE_CONFIG.configDir
```

Export the new types and resolver from `packages/shared/src/config/index.ts`.
Add package exports:

```json
"./config/instance": "./src/config/instance.ts",
"./config/paths": "./src/config/paths.ts"
```

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```powershell
bun test packages/shared/src/config/__tests__/instance.test.ts
bun run typecheck:shared
```

Expected: all instance tests PASS and shared typecheck exits 0.

- [ ] **Step 5: Commit**

```powershell
git add packages/shared/src/config/instance.ts packages/shared/src/config/__tests__/instance.test.ts packages/shared/src/config/paths.ts packages/shared/src/config/index.ts packages/shared/package.json
git commit -m "Add centralized application instance config"
```

### Task 2: StockCraft Dev Launcher Defaults

**Files:**

- Create: `scripts/electron-instance.ts`
- Create: `scripts/electron-instance.test.ts`
- Modify: `scripts/electron-dev.ts`

- [ ] **Step 1: Write failing launcher-default tests**

```ts
import { describe, expect, test } from 'bun:test'
import { resolveElectronDevEnvironment } from './electron-instance'

describe('resolveElectronDevEnvironment', () => {
  test('uses isolated StockCraft Dev defaults for the normal repository', () => {
    expect(resolveElectronDevEnvironment({
      rootDir: 'C:\\craft_agents',
      homeDir: 'C:\\Users\\tester',
      appDataDir: 'C:\\Users\\tester\\AppData\\Roaming',
      env: {},
    })).toMatchObject({
      CRAFT_INSTANCE_ID: 'stockcraft-dev',
      CRAFT_APP_NAME: 'StockCraft Dev',
      CRAFT_CONFIG_DIR: 'C:\\Users\\tester\\.stockcraft-dev',
      CRAFT_ELECTRON_USER_DATA_DIR:
        'C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
      CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev',
      CRAFT_VITE_PORT: '5173',
    })
  })

  test('derives an independent numbered development instance', () => {
    expect(resolveElectronDevEnvironment({
      rootDir: 'C:\\craft_agents-2',
      homeDir: 'C:\\Users\\tester',
      appDataDir: 'C:\\Users\\tester\\AppData\\Roaming',
      env: {},
    })).toMatchObject({
      CRAFT_INSTANCE_ID: 'stockcraft-dev-2',
      CRAFT_APP_NAME: 'StockCraft Dev [2]',
      CRAFT_CONFIG_DIR: 'C:\\Users\\tester\\.stockcraft-dev-2',
      CRAFT_ELECTRON_USER_DATA_DIR:
        'C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev 2',
      CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev-2',
      CRAFT_VITE_PORT: '2173',
    })
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
bun test scripts/electron-instance.test.ts
```

Expected: FAIL because `electron-instance.ts` is missing.

- [ ] **Step 3: Implement launcher environment resolution**

Create a pure `resolveElectronDevEnvironment()` helper that:

- preserves explicit `CRAFT_*` values;
- defaults the base repository to `stockcraft-dev`;
- derives suffix instances from `-(\d+)$`;
- uses port `5173` for base and `${suffix}173` for numbered instances;
- returns strings suitable for a child-process environment.

Replace `detectInstance()` in `electron-dev.ts` with:

```ts
const devInstanceEnv = resolveElectronDevEnvironment({
  rootDir: ROOT_DIR,
  homeDir: process.env.HOME || process.env.USERPROFILE || '',
  appDataDir: process.env.APPDATA || '',
  env: process.env,
})
Object.assign(process.env, devInstanceEnv)
console.log(
  `🔒 Instance ${process.env.CRAFT_INSTANCE_ID}: ` +
  `config=${process.env.CRAFT_CONFIG_DIR}, ` +
  `userData=${process.env.CRAFT_ELECTRON_USER_DATA_DIR}`,
)
```

- [ ] **Step 4: Verify launcher behavior**

Run:

```powershell
bun test scripts/electron-instance.test.ts
bun run scripts/electron-dev.ts
```

Expected: tests PASS; startup log prints `stockcraft-dev`, `.stockcraft-dev`, and `StockCraft Dev`. Stop the process after the initial instance log because the Electron bootstrap is introduced in Task 3.

- [ ] **Step 5: Commit**

```powershell
git add scripts/electron-instance.ts scripts/electron-instance.test.ts scripts/electron-dev.ts
git commit -m "Default Electron development to StockCraft instance"
```

### Task 3: Electron Bootstrap Before Business Imports

**Files:**

- Create: `apps/electron/src/main/bootstrap.ts`
- Create: `apps/electron/src/main/__tests__/bootstrap-order.test.ts`
- Modify: `scripts/electron-dev.ts`
- Modify: `scripts/electron-build-main.ts`
- Modify: `scripts/build/win32.ts`
- Modify: `apps/electron/package.json`

- [ ] **Step 1: Write a failing bootstrap-order test**

Test a dependency-injected bootstrap helper:

```ts
import { expect, test } from 'bun:test'
import { configureElectronInstance } from '../bootstrap'

test('sets app identity before loading main implementation', async () => {
  const calls: string[] = []
  await configureElectronInstance({
    app: {
      setName: (name: string) => calls.push(`name:${name}`),
      setPath: (key: string, value: string) =>
        calls.push(`path:${key}:${value}`),
    },
    config: {
      instanceId: 'stockcraft-dev',
      appName: 'StockCraft Dev',
      configDir: 'C:\\Users\\tester\\.stockcraft-dev',
      electronUserDataDir:
        'C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
      deeplinkScheme: 'stockcraft-dev',
      vitePort: 5173,
    },
    loadMain: async () => { calls.push('load-main') },
  })

  expect(calls).toEqual([
    'name:StockCraft Dev',
    'path:userData:C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
    'load-main',
  ])
})
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
bun test apps/electron/src/main/__tests__/bootstrap-order.test.ts
```

Expected: FAIL because `bootstrap.ts` is missing.

- [ ] **Step 3: Implement bootstrap and remove late app naming**

`bootstrap.ts` exports `configureElectronInstance()` for tests and then executes:

```ts
import { app } from 'electron'
import { INSTANCE_CONFIG } from '@craft-agent/shared/config/instance'

export async function configureElectronInstance(deps = {
  app,
  config: INSTANCE_CONFIG,
  loadMain: () => import('./index'),
}) {
  deps.app.setName(deps.config.appName)
  if (deps.config.electronUserDataDir) {
    deps.app.setPath('userData', deps.config.electronUserDataDir)
  }
  await deps.loadMain()
}

void configureElectronInstance().catch((error) => {
  console.error('Failed to bootstrap Electron instance:', error)
  app.exit(1)
})
```

Remove the later `app.setName(...)` call from `index.ts`; retain Deep Link and single-instance logic there.

Update every main-process build entry from:

```text
apps/electron/src/main/index.ts
```

to:

```text
apps/electron/src/main/bootstrap.ts
```

- [ ] **Step 4: Verify test, typecheck, and all build entry points**

Run:

```powershell
bun test apps/electron/src/main/__tests__/bootstrap-order.test.ts
Push-Location apps/electron
bun run typecheck
bun run build:main:win
Pop-Location
bun run electron:build:main
```

Expected: bootstrap test PASS; typecheck and both main builds exit 0.

- [ ] **Step 5: Commit**

```powershell
git add apps/electron/src/main/bootstrap.ts apps/electron/src/main/__tests__/bootstrap-order.test.ts apps/electron/src/main/index.ts scripts/electron-dev.ts scripts/electron-build-main.ts scripts/build/win32.ts apps/electron/package.json
git commit -m "Bootstrap isolated Electron user data"
```

### Task 4: Shared Runtime Paths

**Files:**

- Modify: `packages/shared/src/workspaces/storage.ts`
- Modify: `packages/shared/src/docs/index.ts`
- Modify: `packages/shared/src/release-notes/index.ts`
- Modify: `packages/shared/src/credentials/backends/secure-storage.ts`
- Modify: `packages/shared/src/interceptor-common.ts`
- Modify: `packages/shared/src/utils/logo.ts`
- Modify: `packages/shared/src/agent/core/prerequisite-manager.ts`
- Modify: `packages/shared/src/agent/permissions-config.ts`
- Create: `packages/shared/src/config/__tests__/instance-path-consumers.test.ts`

- [ ] **Step 1: Write a subprocess test proving path consumers honor `CRAFT_CONFIG_DIR`**

The test should spawn Bun with a temporary config directory and import these concrete exports:

- existing `getDefaultWorkspacesDir()`;
- new `DOCS_DIR`;
- new `RELEASE_NOTES_DIR`;
- new `CREDENTIALS_FILE`;
- existing interceptor `LOG_DIR`.

```ts
expect(result).toMatchObject({
  workspaceDir: join(configDir, 'workspaces'),
  docsDir: join(configDir, 'docs'),
  releaseNotesDir: join(configDir, 'release-notes'),
  credentialsFile: join(configDir, 'credentials.enc'),
  interceptorLogDir: join(configDir, 'logs'),
})
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
bun test packages/shared/src/config/__tests__/instance-path-consumers.test.ts
```

Expected: FAIL with one or more paths under the real `~/.craft-agent`.

- [ ] **Step 3: Replace shared runtime literals**

For each production module, replace:

```ts
import { homedir } from 'node:os'
const CONFIG_DIR = join(homedir(), '.craft-agent')
```

with:

```ts
import { CONFIG_DIR } from '../config/paths'
```

Adjust relative paths correctly for each module. In `interceptor-common.ts`, use:

```ts
import { CONFIG_DIR } from './config/paths'
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json')
export const LOG_DIR = join(CONFIG_DIR, 'logs')
```

Ensure `permissions-config.ts` uses the centralized imported `CONFIG_DIR` consistently rather than recomputing it dynamically.
Export `DOCS_DIR`, `RELEASE_NOTES_DIR`, and `CREDENTIALS_FILE` from their owning modules so the subprocess regression test can inspect the same paths used by production code.

- [ ] **Step 4: Verify shared path behavior**

Run:

```powershell
bun test packages/shared/src/config/__tests__/instance-path-consumers.test.ts
bun run typecheck:shared
```

Expected: tests PASS and no tested path points to production.

- [ ] **Step 5: Commit**

```powershell
git add packages/shared/src/workspaces/storage.ts packages/shared/src/docs/index.ts packages/shared/src/release-notes/index.ts packages/shared/src/credentials/backends/secure-storage.ts packages/shared/src/interceptor-common.ts packages/shared/src/utils/logo.ts packages/shared/src/agent/core/prerequisite-manager.ts packages/shared/src/agent/permissions-config.ts packages/shared/src/config/__tests__/instance-path-consumers.test.ts
git commit -m "Route shared storage through instance config"
```

### Task 5: Electron and Server Runtime Paths

**Files:**

- Modify: `apps/electron/src/main/index.ts`
- Modify: `apps/electron/src/main/window-state.ts`
- Modify: `apps/electron/src/main/logger.ts`
- Modify: `packages/server/src/index.ts`
- Modify: `packages/server-core/src/handlers/rpc/auth.ts`
- Modify: `packages/server-core/src/handlers/rpc/workspace.ts`
- Modify: `packages/server-core/src/services/privileged-execution-broker.ts`
- Modify: `packages/session-tools-core/src/handlers/config-validate.ts`
- Create: `apps/electron/src/main/__tests__/instance-storage-paths.test.ts`

- [ ] **Step 1: Write failing runtime-path tests**

Spawn a subprocess with `CRAFT_CONFIG_DIR=<temp>/stockcraft-dev` and assert:

```ts
expect(paths).toEqual({
  stockDatabase: join(configDir, 'stockcraft.sqlite'),
  windowState: join(configDir, 'window-state.json'),
  messagingLog: join(configDir, 'logs', 'messaging-gateway.log'),
  privilegedAudit: join(configDir, 'logs', 'privileged-actions.jsonl'),
  defaultWorkspaces: join(configDir, 'workspaces'),
})
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
bun test apps/electron/src/main/__tests__/instance-storage-paths.test.ts
```

Expected: FAIL because current paths still use `homedir()/.craft-agent`.

- [ ] **Step 3: Route Electron and server paths through `CONFIG_DIR`**

Examples:

```ts
import { CONFIG_DIR } from '@craft-agent/shared/config/paths'

databasePath: join(CONFIG_DIR, 'stockcraft.sqlite')
```

```ts
const WINDOW_STATE_FILE = join(CONFIG_DIR, 'window-state.json')
```

```ts
export const messagingGatewayLogPath =
  join(CONFIG_DIR, 'logs', 'messaging-gateway.log')
```

Apply the same pattern to headless server StockCraft storage, workspace messaging directories, auth configuration, default workspace creation, privileged audit logs, and config validation.

- [ ] **Step 4: Verify focused tests and typechecks**

Run:

```powershell
bun test apps/electron/src/main/__tests__/instance-storage-paths.test.ts
bun test packages/server-core/src/stock/stock-storage.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts
bun run typecheck:shared
Push-Location packages/server-core; bun run typecheck; Pop-Location
Push-Location packages/server; bun run typecheck; Pop-Location
Push-Location apps/electron; bun run typecheck; Pop-Location
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```powershell
git add apps/electron/src/main/index.ts apps/electron/src/main/window-state.ts apps/electron/src/main/logger.ts packages/server/src/index.ts packages/server-core/src/handlers/rpc/auth.ts packages/server-core/src/handlers/rpc/workspace.ts packages/server-core/src/services/privileged-execution-broker.ts packages/session-tools-core/src/handlers/config-validate.ts apps/electron/src/main/__tests__/instance-storage-paths.test.ts
git commit -m "Isolate Electron and server storage paths"
```

### Task 6: Child-Process Environment Propagation

**Files:**

- Modify: `packages/shared/src/agent/pi-agent.ts`
- Modify: `packages/shared/src/agent/options.ts`
- Modify: `packages/shared/src/mcp/client.ts`
- Modify: `packages/shared/src/mcp/validation.ts`
- Modify: `packages/shared/src/automations/sdk-bridge.ts`
- Modify: `packages/shared/src/automations/utils.ts`
- Modify: `packages/server-core/src/sessions/SessionManager.ts`
- Create: `packages/shared/src/config/instance-env.ts`
- Create: `packages/shared/src/config/__tests__/instance-env.test.ts`

- [ ] **Step 1: Write failing environment tests**

```ts
import { expect, test } from 'bun:test'
import { getInstanceEnvironment } from '../instance-env'

test('returns every identity variable required by child processes', () => {
  expect(getInstanceEnvironment({
    CRAFT_INSTANCE_ID: 'stockcraft-dev',
    CRAFT_CONFIG_DIR: 'C:\\Users\\tester\\.stockcraft-dev',
    CRAFT_APP_NAME: 'StockCraft Dev',
    CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev',
    CRAFT_ELECTRON_USER_DATA_DIR:
      'C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
  })).toEqual({
    CRAFT_INSTANCE_ID: 'stockcraft-dev',
    CRAFT_CONFIG_DIR: 'C:\\Users\\tester\\.stockcraft-dev',
    CRAFT_APP_NAME: 'StockCraft Dev',
    CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev',
    CRAFT_ELECTRON_USER_DATA_DIR:
      'C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
  })
})
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
bun test packages/shared/src/config/__tests__/instance-env.test.ts
```

Expected: FAIL because `instance-env.ts` is missing.

- [ ] **Step 3: Implement and use a single environment helper**

Implement:

```ts
const INSTANCE_KEYS = [
  'CRAFT_INSTANCE_ID',
  'CRAFT_CONFIG_DIR',
  'CRAFT_APP_NAME',
  'CRAFT_DEEPLINK_SCHEME',
  'CRAFT_ELECTRON_USER_DATA_DIR',
] as const

export function getInstanceEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  return Object.fromEntries(
    INSTANCE_KEYS.flatMap((key) =>
      env[key] ? [[key, env[key] as string]] : [],
    ),
  )
}
```

At each explicit spawn environment boundary, merge:

```ts
env: {
  ...process.env,
  ...getInstanceEnvironment(),
  // existing boundary-specific values
}
```

Do not mutate global `process.env` per session except for existing `CRAFT_SESSION_DIR` behavior; pass instance identity explicitly to child processes.

- [ ] **Step 4: Verify propagation tests and agent typechecks**

Run:

```powershell
bun test packages/shared/src/config/__tests__/instance-env.test.ts
bun run typecheck:shared
Push-Location packages/server-core; bun run typecheck; Pop-Location
```

Expected: tests PASS and typechecks exit 0.

- [ ] **Step 5: Commit**

```powershell
git add packages/shared/src/config/instance-env.ts packages/shared/src/config/__tests__/instance-env.test.ts packages/shared/src/agent/pi-agent.ts packages/shared/src/agent/options.ts packages/shared/src/mcp/client.ts packages/shared/src/mcp/validation.ts packages/shared/src/automations/sdk-bridge.ts packages/shared/src/automations/utils.ts packages/server-core/src/sessions/SessionManager.ts
git commit -m "Propagate instance identity to child processes"
```

### Task 7: Hard-Coded Path Regression Guard

**Files:**

- Create: `scripts/check-instance-paths.ts`
- Create: `scripts/check-instance-paths.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write guard-script tests**

Use temporary fixtures:

```ts
test('rejects runtime homedir .craft-agent joins', async () => {
  const result = await checkFiles([fixture(`
    const path = join(homedir(), '.craft-agent', 'config.json')
  `)])
  expect(result.violations).toHaveLength(1)
})

test('allows comments and test fixtures', async () => {
  const result = await checkFiles([fixture(`
    // Production example: ~/.craft-agent/config.json
  `, 'sample.test.ts')])
  expect(result.violations).toEqual([])
})
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
bun test scripts/check-instance-paths.test.ts
```

Expected: FAIL because the guard module is missing.

- [ ] **Step 3: Implement the guard and package script**

Scan production `.ts`/`.tsx` files under `apps`, `packages`, and `scripts`, excluding tests, generated files, comments-only matches, and documentation strings. Reject runtime patterns including:

```text
join(homedir(), '.craft-agent'
resolve(homedir(), '.craft-agent'
process.env.HOME + '/.craft-agent'
```

Add:

```json
"lint:instance-paths": "bun run scripts/check-instance-paths.ts"
```

Run the guard and migrate any remaining production match to `CONFIG_DIR`.

- [ ] **Step 4: Verify guard and repository scans**

Run:

```powershell
bun test scripts/check-instance-paths.test.ts
bun run lint:instance-paths
rg -n -F "join(homedir(), '.craft-agent'" apps packages scripts -g "*.ts" -g "*.tsx"
```

Expected: guard tests PASS and lint exits 0. Review any raw `rg` matches and confirm they are tests, comments, or user-facing documentation rather than runtime path construction.

- [ ] **Step 5: Commit**

```powershell
git add scripts/check-instance-paths.ts scripts/check-instance-paths.test.ts package.json
git commit -m "Guard against shared production data paths"
```

### Task 8: Separate Development Package Identity

**Files:**

- Create: `apps/electron/electron-builder.dev.yml`
- Create: `scripts/electron-dist-dev.ts`
- Modify: `package.json`
- Create: `scripts/electron-builder-dev-config.test.ts`

- [ ] **Step 1: Write failing builder-config test**

Parse YAML and assert:

```ts
expect(config).toMatchObject({
  appId: 'com.stockcraft.dev',
  productName: 'StockCraft Dev',
  publish: [],
})
expect(config.win.artifactName).toContain('StockCraft-Dev')
expect(config.nsis.deleteAppDataOnUninstall).toBe(true)
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
bun test scripts/electron-builder-dev-config.test.ts
```

Expected: FAIL because `electron-builder.dev.yml` is missing.

- [ ] **Step 3: Add an independent development package configuration**

Create a configuration extending the base settings while overriding:

```yaml
extends: ./electron-builder.yml
appId: com.stockcraft.dev
productName: StockCraft Dev
publish: []

win:
  artifactName: "StockCraft-Dev-${arch}.${ext}"

mac:
  artifactName: "StockCraft-Dev-${arch}.${ext}"

linux:
  artifactName: "StockCraft-Dev-${arch}.${ext}"

nsis:
  oneClick: true
  perMachine: false
  deleteAppDataOnUninstall: true
```

Add scripts:

```json
"electron:dist:stockcraft-dev:win": "bun run scripts/electron-dist-dev.ts --win"
```

Implement `scripts/electron-dist-dev.ts` with Bun subprocesses. It must set the same StockCraft Dev identity environment as `electron-dev.ts`, run `bun run electron:build`, and then run:

```ts
['bun', 'x', 'electron-builder', '--config', 'electron-builder.dev.yml', '--win']
```

from `apps/electron`, inheriting stdio and returning the first non-zero exit code.

- [ ] **Step 4: Verify package identity without publishing**

Run:

```powershell
bun test scripts/electron-builder-dev-config.test.ts
Push-Location apps/electron
..\..\node_modules\.bin\electron-builder.exe --config electron-builder.dev.yml --dir --win
Pop-Location
```

Expected: test PASS; unpacked output identifies `StockCraft Dev`; no original Craft Agents installation directory is modified.

- [ ] **Step 5: Commit**

```powershell
git add apps/electron/electron-builder.dev.yml scripts/electron-dist-dev.ts scripts/electron-builder-dev-config.test.ts package.json
git commit -m "Add separate StockCraft development package identity"
```

### Task 9: End-to-End Dual-Instance Verification and Records

**Files:**

- Modify: `feature_list.json`
- Modify: `claude-progress.md`
- Modify: `session-handoff.md` if the session is near compaction

- [ ] **Step 1: Run the complete focused verification**

```powershell
bun test packages/shared/src/config/__tests__/instance.test.ts packages/shared/src/config/__tests__/instance-path-consumers.test.ts packages/shared/src/config/__tests__/instance-env.test.ts scripts/electron-instance.test.ts apps/electron/src/main/__tests__/bootstrap-order.test.ts apps/electron/src/main/__tests__/instance-storage-paths.test.ts scripts/check-instance-paths.test.ts scripts/electron-builder-dev-config.test.ts
bun run lint:instance-paths
bun run typecheck:shared
Push-Location packages/server-core; bun run typecheck; Pop-Location
Push-Location packages/server; bun run typecheck; Pop-Location
Push-Location packages/session-tools-core; bun run typecheck; Pop-Location
Push-Location apps/electron; bun run typecheck; bun run build:main:win; Pop-Location
powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1
```

Expected: all tests and typechecks PASS; main build and init entry exit 0.

- [ ] **Step 2: Start the installed original**

Start:

```powershell
Start-Process -FilePath "$env:LOCALAPPDATA\Programs\@craft-agentelectron\Craft Agents.exe"
```

Confirm its main process exists and its original data timestamps can be observed before starting development:

```powershell
Get-Process "Craft Agents" | Select-Object Id,Path,MainWindowHandle
Get-Item "$HOME\.craft-agent" | Select-Object FullName,LastWriteTime
```

- [ ] **Step 3: Start StockCraft Dev concurrently**

Run:

```powershell
bun run electron:dev
```

Expected startup evidence:

```text
instanceId=stockcraft-dev
configDir=...\ .stockcraft-dev
userData=...\StockCraft Dev
App initialized successfully
```

- [ ] **Step 4: Verify both instances and storage boundaries**

Confirm:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match 'Craft Agents|electron' } |
  Select-Object ProcessId,Name,ExecutablePath,CommandLine

Test-Path "$HOME\.craft-agent\.server.lock"
Test-Path "$HOME\.stockcraft-dev\.server.lock"
Test-Path "$HOME\.stockcraft-dev\stockcraft.sqlite"
Test-Path "$env:APPDATA\StockCraft Dev"
```

Use both UIs to create one development workspace or preference change. Verify it appears only under `.stockcraft-dev` and does not modify the original workspace/config files. Quit and relaunch each app independently.

- [ ] **Step 5: Verify Deep Link separation**

Invoke `craftagents://` and `stockcraft-dev://` separately. Confirm each focuses only its matching application. Record any OS protocol-registration limitation explicitly; the development package test must still prove distinct protocol identity.

- [ ] **Step 6: Update persistent records**

Mark `infra-002` `passing` only if all automated checks and dual-instance verification succeeded. Record:

- exact commands;
- test counts;
- observed config and userData paths;
- both process identities;
- any remaining platform warning.

- [ ] **Step 7: Commit final verification records**

```powershell
python -m json.tool feature_list.json > $null
git diff --check
git add feature_list.json claude-progress.md session-handoff.md
git commit -m "Verify isolated StockCraft development instance"
```
