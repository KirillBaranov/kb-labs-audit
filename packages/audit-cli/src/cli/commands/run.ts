/**
 * Audit run command
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defineCommand, type CommandResult } from '@kb-labs/cli-command-kit';
import {
  keyValue,
  formatTiming,
  createProgressBar,
} from '@kb-labs/shared-cli-ui';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events.js';
import {
  runAuditCore,
  parseAuditFromCliFlags,
  type AuditRuntimeContext,
} from '../../application/index.js';
import type { ShellApi } from '@kb-labs/plugin-contracts';
import { findRepoRoot } from '../../shared/utils.js';
import { getWorkspacePackages, filterPackagesByScope } from '../../shared/package-scope.js';

type AuditRunFlags = {
  scope: { type: 'string'; description?: string };
  all: { type: 'boolean'; description?: string; default?: boolean };
  strict: { type: 'boolean'; description?: string; default?: boolean };
  profile: { type: 'string'; description?: string };
  'fail-on': { type: 'string'; description?: string; choices?: readonly string[]; default?: string };
  json: { type: 'boolean'; description?: string; default?: boolean };
  md: { type: 'boolean'; description?: string; default?: boolean };
  html: { type: 'boolean'; description?: string; default?: boolean };
  'dry-run': { type: 'boolean'; description?: string; default?: boolean };
  verbose: { type: 'boolean'; description?: string; default?: boolean };
  quiet: { type: 'boolean'; description?: string; default?: boolean };
};

type AuditRunResult = CommandResult & {
  dryRun?: boolean;
  packages?: Array<{ name: string; path: string }>;
  checks?: Record<string, { ok: boolean; timingMs?: number }>;
  overall?: { ok: boolean; failReasons: string[] };
  files?: string[];
  timingMs?: number;
};

async function getPnpmVersion(
  shell?: { exec: (command: string, args: string[], options?: { timeoutMs?: number }) => Promise<{ ok: boolean; stdout: string }> }
): Promise<string | undefined> {
  // ShellBroker handles dryRun mode - if shell is provided, it will return empty stdout in dry-run
  // So we don't need to check dryRun here
  try {
    if (shell) {
      const result = await shell.exec('pnpm', ['--version'], { timeoutMs: 5000 });
      if (result.ok) {
        return result.stdout.trim();
      }
      return undefined;
    }
    // Fallback to execa if shell not available (non-plugin context)
    const { execa } = await import('execa');
    const { stdout } = await execa('pnpm', ['--version'], { timeout: 5000 });
    return stdout.trim();
  } catch {
    return undefined;
  }
}

export const runCommand = defineCommand<AuditRunFlags, AuditRunResult>({
  name: 'audit:run',
  flags: {
    scope: {
      type: 'string',
      description: 'Package scope (glob pattern). If not specified, runs across all workspace packages.',
    },
    all: {
      type: 'boolean',
      description: 'Include private packages in scope filtering',
      default: false,
    },
    strict: {
      type: 'boolean',
      description: 'Fail on any threshold breach',
      default: false,
    },
    profile: {
      type: 'string',
      description: 'Devkit profile to use',
    },
    'fail-on': {
      type: 'string',
      description: 'Exit policy: warn, error, or any',
      choices: ['warn', 'error', 'any'] as const,
      default: 'error',
    },
    json: {
      type: 'boolean',
      description: 'Print JSON to stdout',
      default: false,
    },
    md: {
      type: 'boolean',
      description: 'Generate markdown summary',
      default: false,
    },
    html: {
      type: 'boolean',
      description: 'Generate HTML summary',
      default: false,
    },
    'dry-run': {
      type: 'boolean',
      description: 'Show what would be checked without running checks',
      default: false,
    },
    verbose: {
      type: 'boolean',
      description: 'Show detailed error information per package',
      default: false,
    },
    quiet: {
      type: 'boolean',
      description: 'Suppress non-error output',
      default: false,
    },
  },
  analytics: {
    startEvent: ANALYTICS_EVENTS.RUN_STARTED,
    finishEvent: ANALYTICS_EVENTS.RUN_FINISHED,
    actor: ANALYTICS_ACTOR.id,
    includeFlags: true,
  },
  async handler(ctx, argv, flags) {
    const startTime = Date.now();
    const jsonMode = flags.json;
    const quiet = flags.quiet;
    const cwd = ctx.cwd || process.cwd();
    const repoRoot = await findRepoRoot(cwd);
    
    ctx.tracker.checkpoint('config');

    // Parse CLI flags into normalized input
    const input = parseAuditFromCliFlags(flags, cwd, repoRoot);

    // Estimate total steps: config (1) + checks (up to 7) + reports (1)
    // We'll use a dynamic approach - start with estimate and update as we go
    const totalSteps = 10; // Conservative estimate
    const progressBar = createProgressBar('Running audit', totalSteps, jsonMode);
    
    let currentStep = 0;
    const updateProgress = (step: string) => {
      if (!jsonMode && !quiet) {
        currentStep++;
        const elapsed = Date.now() - startTime;
        const avgTimePerStep = currentStep > 0 ? elapsed / currentStep : 0;
        const remainingSteps = Math.max(0, totalSteps - currentStep);
        const estimatedRemaining = Math.round(avgTimePerStep * remainingSteps);
        
        progressBar.update({
          text: `${step} (${formatTiming(elapsed)} elapsed, ~${formatTiming(estimatedRemaining)} remaining)`,
          current: currentStep,
          total: totalSteps,
        });
      }
    };

    if (!jsonMode && !quiet) {
      progressBar.start();
    }

    // Create runtime context with progress callback
    // Use ctx.runtime.shell if available (plugin context), otherwise fallback to execa
    const shellApi = (ctx as any).runtime?.shell as ShellApi | undefined;
    const runtimeCtx: AuditRuntimeContext = {
      workdir: cwd,
      fs: {
        mkdir,
        writeFile,
      },
      log: (level, msg, meta) => {
        if (!quiet && level !== 'debug') {
          if (ctx.output) {
            if (level === 'error') {
              ctx.output.error(msg instanceof Error ? msg : new Error(msg), meta);
            } else if (level === 'warn') {
              ctx.output.warn(msg);
            } else {
              ctx.output.info(msg, meta);
            }
          }
          // Also log via logger
          ctx.logger?.[level](msg, meta);
        } else {
          // Always log via logger, even in quiet mode
          ctx.logger?.[level](msg, meta);
        }
      },
      getWorkspacePackages,
      filterPackagesByScope,
      // getPnpmVersion: ShellBroker will handle dryRun, so no need to pass it here
      getPnpmVersion: () => getPnpmVersion(shellApi),
      onProgress: updateProgress,
      // Use runtime.shell if available (plugin context)
      // ShellBroker already handles dryRun mode via ctx.dryRun - runtime layer is responsible
      // If shellApi is not available, checks that require shell will fail gracefully
      shell: shellApi || undefined,
    };

    // Execute audit core (progress updates happen inside runAuditCore)
    const result = await runAuditCore(input, runtimeCtx);

    ctx.tracker.checkpoint('complete');

    // Stop progress bar
    if (!jsonMode && !quiet) {
      progressBar.stop();
    }

    // Handle dry-run output
    if (input.dryRun) {
      const packageList = result.packageResults || [{ package: { name: 'root', path: repoRoot }, checks: {}, overall: { ok: true, failReasons: [] } }];

      ctx.logger?.info('Audit dry run completed', { 
        packagesCount: packageList.length,
      });
      
      if (jsonMode) {
        ctx.output?.json({
          ok: true,
          dryRun: true,
          packages: packageList.map((p) => ({ name: p.package.name, path: p.package.path })),
          checks: input.scope ? [] : [],
          summary: {
            totalPackages: packageList.length,
          },
        });
      } else {
        if (!ctx.output) {
          throw new Error('Output not available');
        }
        
        const lines: string[] = [];
        const summaryInfo: Record<string, string> = {
          'Mode': ctx.output.ui.colors.muted('DRY RUN (no checks executed)'),
          'Repository': repoRoot,
          'Packages': `${packageList.length}`,
        };
        lines.push(...keyValue(summaryInfo));
        lines.push('');
        
        if (packageList.length > 0) {
          lines.push('Packages to audit:');
          lines.push('');
          for (const pkg of packageList) {
            const privateLabel = pkg.package.private ? ctx.output.ui.colors.muted(' (private)') : '';
            lines.push(`  ${ctx.output.ui.symbols.bullet} ${ctx.output.ui.colors.bold(pkg.package.name)}${privateLabel}`);
            if (!quiet && packageList.length <= 30) {
              lines.push(`    ${ctx.output.ui.colors.muted(pkg.package.path)}`);
            }
          }
        }
        
        const outputText = ctx.output.ui.box('Audit Dry Run', lines);
        ctx.output.write(outputText);
      }

      return { ok: true, dryRun: true, packages: packageList };
    }

    ctx.logger?.info('Audit run completed', { 
      ok: result.ok,
      checksCount: Object.keys(result.checks).length,
      packagesCount: result.packageResults?.length || 0,
      timingMs: result.timingMs,
    });

    // Output results
    if (jsonMode) {
      ctx.output?.json({
        ok: result.ok,
        checks: result.checks,
        overall: result.overall,
        files: result.files,
        timingMs: result.timingMs,
      });
    } else {
      if (!ctx.output) {
        throw new Error('Output not available');
      }
      
      const summaryLines: string[] = [];

      // Overall status
      const statusIcon = result.overall.ok ? ctx.output.ui.symbols.success : ctx.output.ui.symbols.error;
      const statusText = result.overall.ok
        ? ctx.output.ui.colors.success('All checks passed') 
        : ctx.output.ui.colors.error('Some checks failed');
      summaryLines.push(`${statusIcon} ${statusText}`);

      if (!result.overall.ok && result.overall.failReasons.length > 0) {
        summaryLines.push('');
        summaryLines.push(ctx.output.ui.colors.bold('Fail reasons:'));
        for (const reason of result.overall.failReasons.slice(0, input.verbose ? 50 : 5)) {
          summaryLines.push(`  ${ctx.output.ui.symbols.error} ${reason}`);
        }
        if (!input.verbose && result.overall.failReasons.length > 5) {
          summaryLines.push(
            `  ${ctx.output.ui.colors.muted(`... and ${result.overall.failReasons.length - 5} more (use --verbose to see all)`)}`
          );
        }
      }

      // Detailed package breakdown in verbose mode
      if (input.verbose && result.packageResults && result.packageResults.length > 0) {
        const failedPackages = result.packageResults.filter((p) => !p.overall.ok);
        if (failedPackages.length > 0) {
          summaryLines.push('');
          summaryLines.push(ctx.output.ui.colors.bold('Detailed package errors:'));
          summaryLines.push('');
          
          for (const pkgResult of failedPackages) {
            summaryLines.push(`  ${ctx.output.ui.colors.bold(pkgResult.package.name)}`);
            summaryLines.push(`    ${ctx.output.ui.colors.muted(pkgResult.package.path)}`);
            
            const failedChecks = Object.entries(pkgResult.checks).filter(
              ([, check]) => check && !check.ok
            );
            
            for (const [checkId, check] of failedChecks) {
              summaryLines.push(`    ${ctx.output.ui.symbols.error} ${checkId}:`);
              if (check.code) {
                summaryLines.push(`      ${ctx.output.ui.colors.muted(`Code: ${check.code}`)}`);
              }
              if (check.hint) {
                summaryLines.push(`      ${ctx.output.ui.colors.warn(check.hint)}`);
              }
              
              const details = (check.details && typeof check.details === 'object' 
                ? check.details as Record<string, unknown> 
                : {}) as Record<string, unknown>;
              if (details) {
                if (details.errors !== undefined) {
                  summaryLines.push(`      ${ctx.output.ui.colors.error(`Errors: ${details.errors}`)}`);
                }
                if (details.warnings !== undefined) {
                  summaryLines.push(`      ${ctx.output.ui.colors.warn(`Warnings: ${details.warnings}`)}`);
                }
                if (details.failed !== undefined) {
                  summaryLines.push(
                    `      ${ctx.output.ui.colors.error(`Failed tests: ${details.failed}/${details.total || '?'}`)}`
                  );
                }
                if (details.coverage && details.threshold) {
                  const cov = details.coverage as { lines?: number; branches?: number; functions?: number; statements?: number };
                  const thresh = details.threshold as { lines: number; branches: number; functions: number; statements: number };
                  const issues: string[] = [];
                  if (cov.lines !== undefined && cov.lines < thresh.lines) {
                    issues.push(`lines: ${cov.lines}% < ${thresh.lines}%`);
                  }
                  if (cov.branches !== undefined && cov.branches < thresh.branches) {
                    issues.push(`branches: ${cov.branches}% < ${thresh.branches}%`);
                  }
                  if (cov.functions !== undefined && cov.functions < thresh.functions) {
                    issues.push(`functions: ${cov.functions}% < ${thresh.functions}%`);
                  }
                  if (cov.statements !== undefined && cov.statements < thresh.statements) {
                    issues.push(`statements: ${cov.statements}% < ${thresh.statements}%`);
                  }
                  if (issues.length > 0) {
                    summaryLines.push(
                      `      ${ctx.output.ui.colors.error(`Coverage below threshold: ${issues.join(', ')}`)}`
                    );
                  }
                }
                if (details.exitCode !== undefined && details.exitCode !== 0) {
                  summaryLines.push(`      ${ctx.output.ui.colors.muted(`Exit code: ${details.exitCode}`)}`);
                }
                if (details.error) {
                  summaryLines.push(
                    `      ${ctx.output.ui.colors.error(`Error: ${String(details.error).substring(0, 200)}`)}`
                  );
                }
                if (details.tool) {
                  summaryLines.push(`      ${ctx.output.ui.colors.muted(`Tool: ${details.tool}`)}`);
                }
              }
            }
            summaryLines.push('');
          }
        }
      }

      // Check statuses
      summaryLines.push('');
      const checkStatuses: Record<string, string> = {};
      for (const checkId of ['style', 'types', 'tests', 'build', 'devlink', 'mind', 'security'] as const) {
        const check = result.checks[checkId];
        if (check) {
          const icon = check.ok ? ctx.output.ui.symbols.success : ctx.output.ui.symbols.error;
          const status = check.ok ? ctx.output.ui.colors.success('passed') : ctx.output.ui.colors.error('failed');
          const name = checkId.padEnd(8);
          const timing = check.timingMs ? ctx.output.ui.colors.muted(` (${formatTiming(check.timingMs)})`) : '';
          checkStatuses[name] = `${icon} ${status}${timing}`;
        } else {
          const name = checkId.padEnd(8);
          checkStatuses[name] = ctx.output.ui.colors.muted('skipped');
        }
      }
      summaryLines.push(...keyValue(checkStatuses));

      // Package count if auditing multiple packages
      if (result.packageResults && result.packageResults.length > 1) {
        summaryLines.push('');
        const failedCount = result.overall.failReasons.length;
        const passedCount = result.packageResults.length - failedCount;
        summaryLines.push(
          ctx.output.ui.colors.muted(`Packages: ${passedCount}/${result.packageResults.length} passed`)
        );
      }

      // Report files
      if (result.files.length > 0) {
        summaryLines.push('');
        summaryLines.push(ctx.output.ui.colors.bold('Reports:'));
        for (const file of result.files) {
          summaryLines.push(`  ${ctx.output.ui.symbols.info} ${ctx.output.ui.colors.muted(file)}`);
        }
      }

      // Timing
      summaryLines.push('');
      summaryLines.push(ctx.output.ui.colors.muted(`Total time: ${formatTiming(result.timingMs)}`));

      const outputText = ctx.output.ui.box('Audit Results', summaryLines);
      ctx.output.write(outputText);
    }

    // Determine exit code
    if (!result.ok) {
      // Quality gate fail
      return 2;
    }

    return { ok: result.ok, checks: result.checks, overall: result.overall, timingMs: result.timingMs };
  },
});
