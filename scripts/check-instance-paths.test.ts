import { describe, expect, test } from 'bun:test'
import { checkSourceText } from './check-instance-paths'

describe('instance path guard', () => {
  test('rejects runtime homedir .craft-agent joins', () => {
    expect(checkSourceText(
      'packages/shared/src/example.ts',
      `const path = join(homedir(), '.craft-agent', 'config.json')`,
    )).toHaveLength(1)
  })

  test('rejects runtime HOME .craft-agent joins', () => {
    expect(checkSourceText(
      'scripts/example.ts',
      `const path = resolve(process.env.HOME || '', '.craft-agent')`,
    )).toHaveLength(1)
  })

  test('allows comments and documentation strings', () => {
    expect(checkSourceText(
      'packages/shared/src/example.ts',
      `
        // Runtime defaults historically used ~/.craft-agent.
        const help = 'Open ~/.craft-agent/config.json for production.'
      `,
    )).toEqual([])
  })

  test('allows centralized production fallback in config paths', () => {
    expect(checkSourceText(
      'packages/shared/src/config/instance.ts',
      `const production = resolve(context.homeDir, '.craft-agent')`,
    )).toEqual([])
  })

  test('ignores test files', () => {
    expect(checkSourceText(
      'packages/shared/src/example.test.ts',
      `const path = join(homedir(), '.craft-agent')`,
    )).toEqual([])
  })
})
