import { describe, expect, it } from 'vitest';
import { manifest } from '../manifest.v2';

describe('audit CLI manifest', () => {
  const commands = manifest.cli?.commands ?? [];

  it('exposes four audit commands', () => {
    expect(commands).toHaveLength(4);
    const ids = commands.map(({ id }) => id);
    expect(ids).toEqual(
      expect.arrayContaining(['audit:run', 'audit:list-checks', 'audit:show', 'audit:clean'])
    );
  });

  it('defines descriptive metadata for audit:run', () => {
    const run = commands.find(({ id }) => id === 'audit:run');
    expect(run?.group).toBe('audit');
    expect(run?.flags?.some((flag) => flag.name === 'scope')).toBe(true);
    expect(run?.examples).toContain('kb audit run --dry-run');
  });

  it('provides handler paths for each command', () => {
    const allowedHandlers = [
      '#runCommand',
      '#listChecksCommand',
      '#showCommand',
      '#cleanCommand',
    ];

    for (const command of commands) {
      expect(command.handler).toMatch(/^\.\/cli\/commands\//);
      expect(
        allowedHandlers.some((suffix) => command.handler?.endsWith(suffix)),
      ).toBe(true);
    }
  });
});


