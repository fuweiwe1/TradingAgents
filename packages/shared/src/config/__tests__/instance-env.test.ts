import { afterEach, describe, expect, test } from 'bun:test'
import { buildClaudeSubprocessEnv } from '../../agent/options'
import { buildEnvFromSdkInput } from '../../automations/sdk-bridge'
import { buildEnvFromPayload } from '../../automations/utils'
import { getInstanceEnvironment } from '../instance-env'

const INSTANCE_ENV = {
  CRAFT_INSTANCE_ID: 'stockcraft-dev',
  CRAFT_CONFIG_DIR: 'C:\\Users\\tester\\.stockcraft-dev',
  CRAFT_APP_NAME: 'StockCraft Dev',
  CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev',
  CRAFT_ELECTRON_USER_DATA_DIR:
    'C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
}

const originalValues = Object.fromEntries(
  Object.keys(INSTANCE_ENV).map((key) => [key, process.env[key]]),
)

afterEach(() => {
  for (const [key, value] of Object.entries(originalValues)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('getInstanceEnvironment', () => {
  test('returns only nonempty instance identity values', () => {
    expect(getInstanceEnvironment({
      ...INSTANCE_ENV,
      CRAFT_INSTANCE_NUMBER: '2',
      CRAFT_CONFIG_DIR: ' ',
      UNRELATED: 'ignored',
    })).toEqual({
      CRAFT_INSTANCE_ID: 'stockcraft-dev',
      CRAFT_APP_NAME: 'StockCraft Dev',
      CRAFT_DEEPLINK_SCHEME: 'stockcraft-dev',
      CRAFT_ELECTRON_USER_DATA_DIR:
        'C:\\Users\\tester\\AppData\\Roaming\\StockCraft Dev',
    })
  })

  test('does not mutate the input environment', () => {
    const env = { ...INSTANCE_ENV }
    getInstanceEnvironment(env)
    expect(env).toEqual(INSTANCE_ENV)
  })
})

describe('child environment builders', () => {
  test('prevents per-session Claude overrides from replacing instance identity', () => {
    Object.assign(process.env, INSTANCE_ENV)

    expect(buildClaudeSubprocessEnv({
      CRAFT_CONFIG_DIR: 'C:\\malicious',
      CUSTOM_VALUE: 'allowed',
    })).toMatchObject({
      ...INSTANCE_ENV,
      CUSTOM_VALUE: 'allowed',
    })
  })

  test('keeps instance identity in SDK automation environments', () => {
    Object.assign(process.env, INSTANCE_ENV)

    expect(buildEnvFromSdkInput('Stop', {
      hook_event_name: 'Stop',
    })).toMatchObject(INSTANCE_ENV)
  })

  test('keeps instance identity in event automation environments', () => {
    Object.assign(process.env, INSTANCE_ENV)

    expect(buildEnvFromPayload('SchedulerTick', {
      workspaceId: 'workspace-1',
      timestamp: Date.now(),
    })).toMatchObject(INSTANCE_ENV)
  })
})
