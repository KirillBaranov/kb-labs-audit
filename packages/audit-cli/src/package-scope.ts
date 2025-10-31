/**
 * Package scope filtering utilities
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import globby from 'globby';

export interface PackageInfo {
  name: string;
  path: string;
  private?: boolean;
}

/**
 * Get workspace packages from pnpm-workspace.yaml
 */
export async function getWorkspacePackages(
  repoRoot: string
): Promise<PackageInfo[]> {
  const workspaceYamlPath = join(repoRoot, 'pnpm-workspace.yaml');
  let packages: string[] = [];

  try {
    const content = await readFile(workspaceYamlPath, 'utf-8');
    const config = parse(content) as { packages?: string[] };
    packages = config.packages || [];
  } catch {
    // No workspace.yaml - treat as single package
    return [];
  }

  const packageInfos: PackageInfo[] = [];

  for (const pattern of packages) {
    try {
      const packageDirs = await globby(pattern, {
        cwd: repoRoot,
        onlyDirectories: true,
        absolute: false,
      });

      for (const dir of packageDirs) {
        const packagePath = join(repoRoot, dir as string);
        const packageJsonPath = join(packagePath, 'package.json');

        try {
          const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
          const packageJson = JSON.parse(packageJsonContent) as {
            name?: string;
            private?: boolean;
          };

          if (packageJson.name) {
            packageInfos.push({
              name: packageJson.name,
              path: packagePath,
              private: packageJson.private,
            });
          }
        } catch {
          // Skip packages without valid package.json
        }
      }
    } catch {
      // Skip invalid patterns
    }
  }

  return packageInfos;
}

/**
 * Filter packages by scope glob pattern
 */
export async function filterPackagesByScope(
  repoRoot: string,
  scopePattern?: string,
  excludePrivate = false
): Promise<PackageInfo[]> {
  const allPackages = await getWorkspacePackages(repoRoot);

  if (!scopePattern) {
    // No scope = all packages
    return excludePrivate
      ? allPackages.filter((pkg) => !pkg.private)
      : allPackages;
  }

  // Apply glob pattern
  const matchedDirs = await globby(scopePattern, {
    cwd: repoRoot,
    onlyDirectories: true,
    absolute: false,
  });

  const matchedPaths = new Set(matchedDirs.map((d: string) => join(repoRoot, d)));

  return allPackages
    .filter((pkg) => matchedPaths.has(pkg.path))
    .filter((pkg) => (excludePrivate ? !pkg.private : true));
}

