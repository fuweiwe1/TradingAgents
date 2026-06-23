import { spawn } from 'bun'
import { fileURLToPath } from 'node:url'
import { resolveElectronDevEnvironment } from './electron-instance'

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url))
const targetArgs = process.argv.slice(2)

const instanceEnv = resolveElectronDevEnvironment({
  rootDir: ROOT_DIR,
  homeDir: process.env.HOME || process.env.USERPROFILE || '',
  appDataDir: process.env.APPDATA || '',
  env: process.env,
})

const env = {
  ...process.env,
  ...instanceEnv,
  CRAFT_INSTANCE_PRESET: 'stockcraft-dev',
  CRAFT_DEV_RUNTIME: '1',
}

async function run(command: string[], cwd: string): Promise<void> {
  const processHandle = spawn({
    cmd: command,
    cwd,
    env,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const exitCode = await processHandle.exited
  if (exitCode !== 0) process.exit(exitCode)
}

await run(['bun', 'run', 'electron:build'], ROOT_DIR)
await run(
  [
    'bun',
    'x',
    'electron-builder',
    '--config',
    'electron-builder.dev.yml',
    ...targetArgs,
  ],
  `${ROOT_DIR}/apps/electron`,
)
