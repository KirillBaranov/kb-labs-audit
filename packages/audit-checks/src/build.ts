/**
 * Build check adapter
 * Detects build tool (tsup, rollup, vite) and runs build
 */

import { existsSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { BaseCheckAdapter } from './base';
import type { AuditCheckResult } from '@kb-labs/audit-contracts';
import type { ShellApi } from '@kb-labs/audit-core';

export class BuildCheck extends BaseCheckAdapter {
  id = 'build' as const;

  async run(cwd: string, timeoutMs: number, shell?: ShellApi): Promise<AuditCheckResult> {
    const start = Date.now();

    try {
      if (!shell) {
        return this.createErrorResult(
          'SHELL_NOT_AVAILABLE',
          'Shell API not available',
          Date.now() - start,
          { error: 'Shell API is required for running checks' }
        );
      }

      // Detect build tool
      const buildCommand = this.detectBuildTool(cwd);

      if (!buildCommand) {
        // Fallback to pnpm build
        return this.runBuild(cwd, timeoutMs, ['pnpm', 'build'], start, shell);
      }

      return this.runBuild(cwd, timeoutMs, buildCommand, start, shell);
    } catch (error: unknown) {
      const timingMs = Date.now() - start;
      return this.createErrorResult(
        'AUDIT_TOOL_ERROR',
        error instanceof Error ? error.message : String(error),
        timingMs,
        { error: String(error) }
      );
    }
  }

  private detectBuildTool(cwd: string): string[] | null {
    // Check for tsup
    if (existsSync(join(cwd, 'tsup.config.ts')) || existsSync(join(cwd, 'tsup.config.js'))) {
      return ['pnpm', 'build']; // Let package.json script handle it
    }

    // Check for rollup
    if (existsSync(join(cwd, 'rollup.config.js')) || existsSync(join(cwd, 'rollup.config.ts'))) {
      return ['pnpm', 'build'];
    }

    // Check for vite
    if (existsSync(join(cwd, 'vite.config.ts')) || existsSync(join(cwd, 'vite.config.js'))) {
      return ['pnpm', 'exec', 'vite', 'build', '--mode', 'production'];
    }

    return null;
  }

  private async runBuild(
    cwd: string,
    timeoutMs: number,
    command: string[],
    startTime: number,
    shell: ShellApi
  ): Promise<AuditCheckResult> {
    if (command.length === 0) {
      return this.createErrorResult('INVALID_COMMAND', 'Empty build command', Date.now() - startTime);
    }

    const [cmd, ...args] = command;
    if (!cmd) {
      return this.createErrorResult('INVALID_COMMAND', 'No build command', Date.now() - startTime);
    }

    // Run build
    const result = await shell.exec(cmd, args, {
      cwd,
      timeoutMs,
    });
    const { exitCode } = result;

    const timingMs = Date.now() - startTime;

    // Measure artifacts
    const artifacts = await this.measureArtifacts(cwd);
    const ok = exitCode === 0;

    return {
      id: this.id,
      ok,
      details: {
        exitCode,
        artifacts,
        tool: this.detectBuildToolName(cwd),
      },
      hint: ok
        ? undefined
        : 'Build failed. Check the output above for errors.',
      timingMs,
    };
  }

  private detectBuildToolName(cwd: string): string {
    if (existsSync(join(cwd, 'tsup.config.ts')) || existsSync(join(cwd, 'tsup.config.js'))) {
      return 'tsup';
    }
    if (existsSync(join(cwd, 'rollup.config.js')) || existsSync(join(cwd, 'rollup.config.ts'))) {
      return 'rollup';
    }
    if (existsSync(join(cwd, 'vite.config.ts')) || existsSync(join(cwd, 'vite.config.js'))) {
      return 'vite';
    }
    return 'pnpm';
  }

  private async measureArtifacts(cwd: string): Promise<{
    count: number;
    totalSizeBytes: number;
    paths: string[];
  }> {
    const distPath = join(cwd, 'dist');
    if (!existsSync(distPath)) {
      return { count: 0, totalSizeBytes: 0, paths: [] };
    }

    const paths: string[] = [];
    let totalSize = 0;

    async function walkDir(dir: string, basePath: string): Promise<void> {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          const relativePath = join(basePath, entry.name);

          if (entry.isFile()) {
            try {
              const stats = statSync(fullPath);
              totalSize += stats.size;
              paths.push(relativePath);
            } catch {
              // Skip files we can't stat
            }
          } else if (entry.isDirectory()) {
            await walkDir(fullPath, relativePath);
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }

    try {
      await walkDir(distPath, 'dist');
    } catch {
      // If we can't read dir, return empty
    }

    return {
      count: paths.length,
      totalSizeBytes: totalSize,
      paths,
    };
  }
}

