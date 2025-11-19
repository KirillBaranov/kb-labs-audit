/**
 * Check adapter registry
 */

import type { CheckId } from '@kb-labs/audit-contracts';
import type { CheckAdapter } from './runner';

/**
 * Registry of all available check adapters
 * This will be populated at runtime when audit-checks is available
 */
export async function createCheckRegistry(): Promise<Map<CheckId, CheckAdapter>> {
  const registry = new Map<CheckId, CheckAdapter>();

  // Lazy load adapters to avoid circular dependencies
  // Try multiple resolution strategies for different runtime contexts
  let adaptersModule: any;
  
  try {
    // Strategy 1: Direct import (works in same workspace)
    adaptersModule = await import('@kb-labs/audit-checks');
  } catch {
    try {
      // Strategy 2: Try relative path from audit-core location
      const { createRequire } = await import('node:module');
      const require = createRequire(import.meta.url);
      adaptersModule = require('@kb-labs/audit-checks');
    } catch {
      try {
        // Strategy 3: Try file path resolution
        const { pathToFileURL } = await import('node:url');
        const { join, dirname } = await import('node:path');
        const { fileURLToPath } = await import('node:url');
        const currentDir = dirname(fileURLToPath(import.meta.url));
        const adaptersPath = join(currentDir, '../../audit-checks/dist/index.js');
        adaptersModule = await import(pathToFileURL(adaptersPath).href);
      } catch (err) {
        // Adapters not available - will be skipped
        console.warn('[Audit] Failed to load check adapters:', err instanceof Error ? err.message : String(err));
        return registry;
      }
    }
  }

  try {
    const {
      StyleCheck,
      TypesCheck,
      TestsCheck,
      BuildCheck,
      DevLinkCheck,
      MindCheck,
      SecurityCheck,
    } = adaptersModule;

    if (StyleCheck) {registry.set('style', new StyleCheck());}
    if (TypesCheck) {registry.set('types', new TypesCheck());}
    if (TestsCheck) {registry.set('tests', new TestsCheck());}
    if (BuildCheck) {registry.set('build', new BuildCheck());}
    if (DevLinkCheck) {registry.set('devlink', new DevLinkCheck());}
    if (MindCheck) {registry.set('mind', new MindCheck());}
    if (SecurityCheck) {registry.set('security', new SecurityCheck());}
  } catch (err) {
    console.warn('[Audit] Failed to instantiate check adapters:', err instanceof Error ? err.message : String(err));
  }

  return registry;
}

