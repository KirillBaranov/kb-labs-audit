/**
 * Audit CLI manifest
 */

// Local type definition to avoid external dependencies
export type CommandManifest = {
  manifestVersion: '1.0';
  id: string;
  aliases?: string[];
  group: string;
  describe: string;
  longDescription?: string;
  requires?: string[];
  flags?: FlagDefinition[];
  examples?: string[];
  loader: () => Promise<{ run: any }>;
};

export type FlagDefinition = {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'array';
  alias?: string;
  default?: any;
  description?: string;
  choices?: string[];
  required?: boolean;
};

export const commands: CommandManifest[] = [
  {
    manifestVersion: '1.0',
    id: 'audit:run',
    group: 'audit',
    describe: 'Run quality audit checks',
    longDescription: 'Run all enabled quality checks (style, types, tests, build, devlink, mind) and generate reports',
    loader: async () => {
      const mod = await import('./commands/run');
      return { run: mod.run.run };
    },
    flags: [
      {
        name: 'scope',
        type: 'string',
        description: 'Package scope (glob pattern). If not specified, runs across all workspace packages.',
      },
      {
        name: 'all',
        type: 'boolean',
        description: 'Include private packages in scope filtering',
      },
      {
        name: 'strict',
        type: 'boolean',
        description: 'Fail on any threshold breach',
      },
      {
        name: 'profile',
        type: 'string',
        description: 'Devkit profile to use',
      },
      {
        name: 'fail-on',
        type: 'string',
        choices: ['warn', 'error', 'any'],
        default: 'error',
        description: 'Exit policy: warn, error, or any',
      },
      {
        name: 'json',
        type: 'boolean',
        description: 'Print JSON to stdout',
      },
      {
        name: 'md',
        type: 'boolean',
        description: 'Generate markdown summary',
      },
      {
        name: 'html',
        type: 'boolean',
        description: 'Generate HTML summary',
      },
    ],
    examples: [
      'kb audit run',
      'kb audit run --scope packages/*',
      'kb audit run --strict --json',
      'kb audit run --profile frontend --md',
    ],
  },
  {
    manifestVersion: '1.0',
    id: 'audit:list-checks',
    group: 'audit',
    describe: 'List available audit checks',
    loader: async () => {
      const mod = await import('./commands/list-checks');
      return { run: mod.listChecks.run };
    },
    flags: [
      {
        name: 'json',
        type: 'boolean',
        description: 'Output in JSON format',
      },
    ],
    examples: ['kb audit list-checks', 'kb audit list-checks --json'],
  },
  {
    manifestVersion: '1.0',
    id: 'audit:show',
    group: 'audit',
    describe: 'Show last audit report',
    loader: async () => {
      const mod = await import('./commands/show');
      return { run: mod.show.run };
    },
    flags: [
      {
        name: 'json',
        type: 'boolean',
        description: 'Output in JSON format',
      },
    ],
    examples: ['kb audit show', 'kb audit show --json'],
  },
  {
    manifestVersion: '1.0',
    id: 'audit:clean',
    group: 'audit',
    describe: 'Clean audit output directory',
    loader: async () => {
      const mod = await import('./commands/clean');
      return { run: mod.clean.run };
    },
    examples: ['kb audit clean'],
  },
];

