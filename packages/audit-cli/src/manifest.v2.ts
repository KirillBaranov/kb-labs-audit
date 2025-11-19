import { createManifestV2 } from '@kb-labs/plugin-manifest';
import { pluginContractsManifest } from '@kb-labs/audit-contracts';

/**
 * Level 2: Типизация через contracts для автодополнения и проверки ID
 */

const fileAllowList = ['.kb/audit/**', '.kb/devkit/**', 'package.json', '**/package.json'];

type CliCommands = NonNullable<ManifestV2['cli']>['commands'];

const commands: CliCommands = [
  {
    manifestVersion: '1.0',
    id: 'audit:run',
    group: 'audit',
    describe: 'Run quality audit checks',
    longDescription: 'Run all enabled quality checks (style, types, tests, build, devlink, mind) and generate reports',
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
      {
        name: 'dry-run',
        type: 'boolean',
        alias: 'n',
        description: 'Show what would be checked without running checks',
      },
      {
        name: 'verbose',
        type: 'boolean',
        alias: 'v',
        description: 'Show detailed error information per package',
      },
    ],
    examples: [
      'kb audit run',
      'kb audit run --scope packages/*',
      'kb audit run --strict --json',
      'kb audit run --profile frontend --md',
      'kb audit run --dry-run',
    ],
    handler: './cli/commands/run#runCommand',
  },
  {
    manifestVersion: '1.0',
    id: 'audit:list-checks',
    group: 'audit',
    describe: 'List available audit checks',
    flags: [
      {
        name: 'json',
        type: 'boolean',
        description: 'Output in JSON format',
      },
    ],
    examples: ['kb audit list-checks', 'kb audit list-checks --json'],
    handler: './cli/commands/list-checks#listChecksCommand',
  },
  {
    manifestVersion: '1.0',
    id: 'audit:show',
    group: 'audit',
    describe: 'Show last audit report',
    flags: [
      {
        name: 'json',
        type: 'boolean',
        description: 'Output in JSON format',
      },
    ],
    examples: ['kb audit show', 'kb audit show --json'],
    handler: './cli/commands/show#showCommand',
  },
  {
    manifestVersion: '1.0',
    id: 'audit:clean',
    group: 'audit',
    describe: 'Clean audit output directory',
    flags: [],
    examples: ['kb audit clean'],
    handler: './cli/commands/clean#cleanCommand',
  },
];

export const manifest = createManifestV2<typeof pluginContractsManifest>({
  schema: 'kb.plugin/2',
  id: '@kb-labs/audit',
  version: '0.1.0',
  display: {
    name: 'Audit',
    description: 'Unified quality audit orchestrator for KB Labs repositories.',
    tags: ['audit', 'quality', 'lint', 'tests'],
  },
  setup: {
    handler: './setup/handler.js#run',
    describe: 'Prepare the .kb/audit workspace and default ignore files.',
    permissions: {
      fs: {
        mode: 'readWrite',
        allow: fileAllowList,
        deny: ['**/*.key', '**/*.secret'],
      },
      net: 'none',
      env: {
        allow: ['NODE_ENV', 'KB_LABS_REPO_ROOT'],
      },
      quotas: {
        timeoutMs: 30000,
        memoryMb: 1024,
        cpuMs: 10000,
      },
      capabilities: ['fs:read', 'fs:write'],
    },
  },
  cli: {
    commands,
  },
  rest: {
    basePath: '/v1/plugins/audit',
    routes: [
      {
        method: 'GET',
        path: '/checks',
        output: {
          zod: '@kb-labs/audit-contracts/schema#AuditListChecksResponseSchema',
        },
        handler: './rest/handlers/list-checks-handler.js#handleListChecks',
        permissions: {
          fs: {
            mode: 'read',
            allow: fileAllowList,
            deny: ['**/*.key', '**/*.secret'],
          },
          net: 'none',
          env: {
            allow: ['NODE_ENV'],
          },
          quotas: {
            timeoutMs: 5000,
            memoryMb: 128,
            cpuMs: 2500,
          },
          capabilities: ['fs:read'],
        },
      },
      {
        method: 'GET',
        path: '/report/latest',
        output: {
          zod: '@kb-labs/audit-contracts/schema#AuditReportSchema',
        },
        errors: [
          {
            code: 'AUDIT_REPORT_NOT_FOUND',
            http: 404,
            description: 'Latest audit report is missing. Run "kb audit run" first.',
          },
          {
            code: 'AUDIT_REPORT_PARSE_ERROR',
            http: 422,
            description: 'Audit report exists but failed schema validation.',
          },
        ],
        handler: './rest/handlers/report-handler.js#handleGetLatestReport',
        permissions: {
          fs: {
            mode: 'read',
            allow: fileAllowList,
            deny: ['**/*.key', '**/*.secret'],
          },
          net: 'none',
          env: {
            allow: ['NODE_ENV'],
          },
          quotas: {
            timeoutMs: 5000,
            memoryMb: 128,
            cpuMs: 2500,
          },
          capabilities: ['fs:read'],
        },
      },
    ],
  },
  studio: {
    widgets: [
      {
        id: 'audit.checks',
        kind: 'cardlist',
        title: 'Audit Checks',
        description: 'Shows availability of each audit check adapter.',
        data: {
          source: {
            type: 'rest',
            routeId: 'checks',
            method: 'GET',
          },
        },
        layoutHint: {
          w: 4,
          h: 4,
          minW: 3,
          minH: 3,
        },
      },
      {
        id: 'audit.report',
        kind: 'infopanel',
        title: 'Latest Audit Report',
        description: 'High-level summary of the most recent audit execution.',
        data: {
          source: {
            type: 'rest',
            routeId: 'report/latest',
            method: 'GET',
          },
        },
        layoutHint: {
          w: 6,
          h: 6,
          minW: 4,
          minH: 4,
        },
      },
    ],
    menus: [
      {
        id: 'audit-dashboard',
        label: 'Audit Dashboard',
        target: '/plugins/audit/dashboard',
        order: 0,
      },
    ],
    layouts: [
      {
        id: 'audit.dashboard',
        kind: 'grid',
        title: 'Audit Dashboard',
        description: 'Default arrangement for audit monitoring widgets.',
        config: {
          cols: { sm: 2, md: 4, lg: 6 },
          rowHeight: 6,
        },
      },
    ],
  },
    capabilities: ['fs:read', 'fs:write', 'shell:exec'],
    permissions: {
      fs: {
        mode: 'readWrite',
        allow: fileAllowList,
        deny: ['**/*.key', '**/*.secret', '**/node_modules/**'],
      },
      net: 'none',
      env: {
        allow: ['NODE_ENV', 'KB_LABS_REPO_ROOT'],
      },
      quotas: {
        timeoutMs: 120000,
        memoryMb: 4096,
        cpuMs: 45000,
      },
      capabilities: ['fs:read', 'fs:write', 'shell:exec'],
      artifacts: {
        write: [
          {
            to: 'self',
            paths: ['.kb/audit/**'],
          },
        ],
      },
      shell: {
        allow: [
          'tsc',
          'eslint',
          'vitest',
          'pnpm',
          'pnpm exec vite',
          'pnpm exec *',
          'npm audit',
          'kb --version',
        ],
        requireConfirmation: [
          'rm -rf',
          'rm -r',
          'git reset --hard',
        ],
        timeoutMs: 120000,
      },
    },
  artifacts: [
    {
      id: 'audit.report.json',
      pathTemplate: '.kb/audit/report.json',
      description: 'Full JSON payload with per-check details.',
    },
    {
      id: 'audit.summary.md',
      pathTemplate: '.kb/audit/summary.md',
      description: 'Markdown summary generated by kb audit run.',
    },
    {
      id: 'audit.summary.txt',
      pathTemplate: '.kb/audit/summary.txt',
      description: 'Plain text summary for CI logs.',
    },
  ],
});

export default manifest;


