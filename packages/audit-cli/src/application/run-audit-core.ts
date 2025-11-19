/**
 * @module @kb-labs/audit-cli/application/run-audit-core
 * Core audit execution logic (shared between CLI and REST)
 */

import { join } from 'node:path';
import type * as fsPromises from 'node:fs/promises';
import {
  loadConfig,
  runAudit,
  createCheckRegistry,
  aggregateResults,
  renderJson,
  renderMarkdown,
  renderText,
  renderHtml,
  type RunnerOptions,
} from '@kb-labs/audit-core';
import type { CheckId, AuditCheckResult, PackageScopedCheckDetails } from '@kb-labs/audit-contracts';
import type { AuditReportContract } from '@kb-labs/audit-contracts';
import type { ShellApi, ShellResult } from '@kb-labs/plugin-contracts';

/**
 * Normalized audit input (independent of CLI/REST interface)
 */
export interface AuditCoreInput {
  /** Working directory */
  cwd: string;
  /** Repository root */
  repoRoot: string;
  /** Package scope pattern (glob) */
  scope?: string;
  /** Include private packages */
  all?: boolean;
  /** Profile to use */
  profile?: string;
  /** Dry run mode */
  dryRun?: boolean;
  /** Output options */
  output?: {
    json?: boolean;
    md?: boolean;
    text?: boolean;
    html?: boolean;
  };
  /** Verbose mode */
  verbose?: boolean;
  /** Quiet mode */
  quiet?: boolean;
  /** Fail on policy */
  failOn?: 'warn' | 'error' | 'any';
}

/**
 * Normalized audit result (independent of CLI/REST interface)
 */
export interface AuditCoreResult {
  /** Overall status */
  ok: boolean;
  /** Check results */
  checks: Partial<Record<CheckId, AuditCheckResult>>;
  /** Overall status details */
  overall: {
    ok: boolean;
    failReasons: string[];
  };
  /** Generated report files */
  files: string[];
  /** Package results (if scope was used) */
  packageResults?: Array<{
    package: { name: string; path: string; private?: boolean };
    checks: Partial<Record<CheckId, AuditCheckResult>>;
    overall: { ok: boolean; failReasons: string[] };
  }>;
  /** Report contract */
  report: AuditReportContract;
  /** Timing information */
  timingMs: number;
}

// ShellApi is imported from @kb-labs/audit-core (which uses @kb-labs/plugin-contracts)

/**
 * Runtime context for core functions (minimal interface)
 */
export interface AuditRuntimeContext {
  /** Working directory */
  workdir: string;
  /** Output directory */
  outdir?: string;
  /** File system access */
  fs: {
    mkdir: typeof fsPromises.mkdir;
    writeFile: typeof fsPromises.writeFile;
  };
  /** Logging */
  log: (level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void;
  /** Get workspace packages */
  getWorkspacePackages: (repoRoot: string) => Promise<Array<{ name: string; path: string; private?: boolean }>>;
  /** Filter packages by scope */
  filterPackagesByScope: (
    repoRoot: string,
    scope: string,
    excludePrivate: boolean
  ) => Promise<Array<{ name: string; path: string; private?: boolean }>>;
  /** Get pnpm version */
  getPnpmVersion: () => Promise<string | undefined>;
  /** Progress callback (optional) */
  onProgress?: (step: string) => void;
  /** Shell execution API (optional, uses runtime.shell if available) */
  shell?: ShellApi;
}

/**
 * Core audit execution (shared between CLI and REST)
 * This is the single source of truth for audit logic
 */
export async function runAuditCore(
  input: AuditCoreInput,
  ctx: AuditRuntimeContext
): Promise<AuditCoreResult> {
  const startTime = Date.now();
  const { cwd, repoRoot, scope, all, profile, dryRun, output, verbose, quiet, failOn } = input;

  // Load configuration
  ctx.onProgress?.('Loading configuration');
  const config = await loadConfig({
    cwd: repoRoot,
  });

  // Apply scope filtering if specified, otherwise discover all workspace packages
  let packagesToAudit: Array<{ name: string; path: string; private?: boolean }> | null = null;

  if (scope) {
    // Filter packages by scope pattern
    const filteredPackages = await ctx.filterPackagesByScope(
      repoRoot,
      scope,
      !all // exclude private unless --all flag
    );

    if (filteredPackages.length === 0) {
      throw new Error(`No packages found matching scope: ${scope}`);
    }

    packagesToAudit = filteredPackages;
  } else {
    // No scope specified - discover all workspace packages
    const allPackages = await ctx.getWorkspacePackages(repoRoot);

    if (allPackages.length > 0) {
      // Filter out private packages unless --all flag is set
      packagesToAudit = all
        ? allPackages
        : allPackages.filter((pkg) => !pkg.private);

      if (packagesToAudit.length === 0) {
        throw new Error(
          'No packages found in workspace (all packages are private). Use --all to include private packages.'
        );
      }
    }
    // If no packages found, packagesToAudit remains null and we'll run at repo level
  }

  // Dry-run mode: just return what would be checked
  if (dryRun) {
    const enabledChecks = config.enable || [];
    const packageList = packagesToAudit || [{ name: 'root', path: repoRoot }];

    // ShellBroker handles dryRun mode - getPnpmVersion will return empty/undefined in dry-run
    // Add timeout as safety net
    const pnpmVersion = await Promise.race([
      ctx.getPnpmVersion().catch(() => undefined),
      new Promise<string | undefined>((resolve) => setTimeout(() => resolve(undefined), 2000)),
    ]);

    return {
      ok: true,
      checks: {},
      overall: { ok: true, failReasons: [] },
      files: [],
      packageResults: packageList.map((p) => ({
        package: { name: p.name, path: p.path },
        checks: {},
        overall: { ok: true, failReasons: [] },
      })),
      report: {
        schemaVersion: '1.0',
        ts: new Date().toISOString(),
        context: {
          repo: repoRoot,
          cwd: packageList.map((p) => p.path).join(','),
          profile,
        },
        checks: {},
        overall: { ok: true, failReasons: [] },
        meta: {
          node: process.version,
          pnpm: pnpmVersion,
          timingMs: { total: Date.now() - startTime },
        },
      },
      timingMs: Date.now() - startTime,
    };
  }

  // Create check registry
  ctx.onProgress?.('Initializing check registry');
  const adapters = await createCheckRegistry();

  // Run audit for each package if scope is specified, otherwise run at repo level
  let allChecks: Partial<Record<CheckId, AuditCheckResult>> = {};
  let allOverall: { ok: boolean; failReasons: string[] } = { ok: true, failReasons: [] };
  const packageResults: Array<{
    package: { name: string; path: string; private?: boolean };
    checks: Partial<Record<CheckId, AuditCheckResult>>;
    overall: { ok: boolean; failReasons: string[] };
  }> = [];

  if (packagesToAudit && packagesToAudit.length > 0) {
    // Run checks per package and aggregate
    for (let i = 0; i < packagesToAudit.length; i++) {
      const pkg = packagesToAudit[i];
      if (!pkg) continue;
      ctx.onProgress?.(`Running checks for ${pkg.name} (${i + 1}/${packagesToAudit.length})`);
            const runAuditOptions = {
              config,
              cwd: pkg.path,
              profile,
              adapters,
              // ShellBroker handles dryRun mode - just pass shell through
              shell: ctx.shell,
            };
            const auditResult = await runAudit(runAuditOptions as RunnerOptions);
            const pkgChecks = auditResult.checks;
            const pkgOverall = auditResult.overall;

      packageResults.push({
        package: pkg,
        checks: pkgChecks,
        overall: pkgOverall,
      });

      // Merge results (any failure = overall failure)
      for (const [checkId, result] of Object.entries(pkgChecks)) {
        if (result && !result.ok) {
          const existing = allChecks[checkId as CheckId];
          const packageDetail = {
            name: pkg.name,
            path: pkg.path,
            ok: false,
            code: result.code,
            hint: result.hint,
            details: result.details,
            timingMs: result.timingMs,
          };

          if (!existing || existing.ok) {
            // Override with failure
            const existingDetails = (existing?.details && typeof existing.details === 'object' 
              ? existing.details as PackageScopedCheckDetails 
              : {}) as PackageScopedCheckDetails;
            allChecks[checkId as CheckId] = {
              ...result,
              details: {
                ...(result.details && typeof result.details === 'object' ? result.details as object : {}),
                packages: [
                  ...(existingDetails.packages || []).filter(
                    (p) => (typeof p === 'object' ? p.name !== pkg.name : p !== pkg.name)
                  ),
                  packageDetail,
                ],
              },
            } as AuditCheckResult;
          } else {
            // Add package to existing failure
            const details = (existing.details && typeof existing.details === 'object' 
              ? existing.details as PackageScopedCheckDetails 
              : {}) as PackageScopedCheckDetails;
            const existingPackages = (details.packages || []).filter(
              (p) => (typeof p === 'object' ? p.name !== pkg.name : p !== pkg.name)
            );
            allChecks[checkId as CheckId] = {
              ...existing,
              details: {
                ...details,
                packages: [...existingPackages, packageDetail],
              },
            } as AuditCheckResult;
          }
        } else if (result && result.ok) {
          // Only keep success if no failures exist
          if (!allChecks[checkId as CheckId] || allChecks[checkId as CheckId]?.ok) {
            allChecks[checkId as CheckId] = result;
          }
        }
      }

      // Aggregate overall status
      if (!pkgOverall.ok) {
        allOverall.ok = false;
        allOverall.failReasons.push(...pkgOverall.failReasons.map((r) => `${pkg.name}:${r}`));
      }
    }

    // Re-aggregate final results
    const finalAggregation = aggregateResults(allChecks, {
      coverageThresholds: config.thresholds?.coverage,
    });
    allOverall = finalAggregation.overall;
  } else {
    // Run at repo level (no scope)
    ctx.onProgress?.('Running checks');
    const runAuditOptionsRepo = {
      config,
      cwd: repoRoot,
      profile,
      adapters,
      // ShellBroker handles dryRun mode - just pass shell through
      shell: ctx.shell,
    };
    const auditResult = await runAudit(runAuditOptionsRepo as RunnerOptions);
    allChecks = auditResult.checks;
    allOverall = auditResult.overall;
  }

  // Build report
  const reportContext: AuditReportContract['context'] & {
    packages?: Array<{ name: string; path: string; ok: boolean }>;
  } = {
    repo: repoRoot,
    cwd: packagesToAudit ? packagesToAudit.map((p) => p.path).join(',') : repoRoot,
    profile,
  };

  if (packageResults.length > 0) {
    reportContext.packages = packageResults.map((p) => ({
      name: p.package.name,
      path: p.package.path,
      ok: p.overall.ok,
    }));
  }

  const report: AuditReportContract = {
    schemaVersion: '1.0',
    ts: new Date().toISOString(),
    context: reportContext,
    checks: allChecks,
    overall: allOverall,
    meta: {
      node: process.version,
      pnpm: await ctx.getPnpmVersion(),
      timingMs: { total: Date.now() - startTime },
    },
  };

  // Determine output formats
  const outputJson = output?.json !== false; // Default true
  const outputMd = output?.md !== false; // Default true
  const outputText = output?.text !== false; // Default true
  const outputHtml = !!output?.html;

  // Write reports to .kb/audit/
  ctx.onProgress?.('Generating reports');
  const auditDir = join(repoRoot, '.kb', 'audit');
  await ctx.fs.mkdir(auditDir, { recursive: true });

  const files: string[] = [];

  if (outputJson) {
    const jsonPath = join(auditDir, 'report.json');
    await ctx.fs.writeFile(jsonPath, renderJson(report), 'utf-8');
    files.push(jsonPath);
  }

  // Prepare options for verbose reports
  const reportOptions = verbose && packageResults.length > 0
    ? { verbose: true, packageResults }
    : undefined;

  if (outputMd) {
    const mdPath = join(auditDir, 'summary.md');
    await ctx.fs.writeFile(mdPath, renderMarkdown(report, reportOptions), 'utf-8');
    files.push(mdPath);
  }

  if (outputText) {
    const txtPath = join(auditDir, 'summary.txt');
    await ctx.fs.writeFile(txtPath, renderText(report, reportOptions), 'utf-8');
    files.push(txtPath);
  }

  if (outputHtml) {
    const htmlPath = join(auditDir, 'summary.html');
    await ctx.fs.writeFile(htmlPath, renderHtml(report, reportOptions), 'utf-8');
    files.push(htmlPath);
  }

  return {
    ok: allOverall.ok,
    checks: allChecks,
    overall: allOverall,
    files,
    packageResults: packageResults.length > 0 ? packageResults : undefined,
    report,
    timingMs: Date.now() - startTime,
  };
}

/**
 * Parse CLI flags into normalized audit input
 */
export function parseAuditFromCliFlags(
  flags: Record<string, unknown>,
  cwd: string,
  repoRoot: string
): AuditCoreInput {
  return {
    cwd,
    repoRoot,
    scope: flags.scope as string | undefined,
    all: flags.all as boolean | undefined,
    profile: flags.profile as string | undefined,
    dryRun: flags['dry-run'] as boolean | undefined || flags.dryRun as boolean | undefined,
    output: {
      json: flags.json as boolean | undefined,
      md: flags.md as boolean | undefined,
      text: true, // Always generate text
      html: flags.html as boolean | undefined,
    },
    verbose: flags.verbose as boolean | undefined,
    quiet: flags.quiet as boolean | undefined,
    failOn: (flags['fail-on'] as 'warn' | 'error' | 'any') || 'error',
  };
}

