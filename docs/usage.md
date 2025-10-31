# KB Labs Audit - Usage Guide

## Overview

KB Labs Audit provides a unified interface for running quality checks across monorepo packages. It aggregates results from multiple tools (eslint, tsc, vitest, devlink, mind) and produces comprehensive reports.

## Basic Usage

### Running Audit

```bash
# Run all enabled checks
kb audit run

# Output JSON to stdout
kb audit run --json

# Generate specific report formats
kb audit run --md --html
```

### Package Scope

```bash
# Audit specific packages
kb audit run --scope packages/core

# Audit multiple packages
kb audit run --scope "packages/{core,cli}/*"

# Audit all packages (default)
kb audit run
```

### Exit Policies

```bash
# Fail on errors only (default)
kb audit run --fail-on error

# Fail on warnings or errors
kb audit run --fail-on warn

# Fail on any issue (including skipped checks)
kb audit run --fail-on any
```

### Strict Mode

```bash
# Fail if any check is below threshold
kb audit run --strict
```

## Configuration

### Local Configuration

Create or edit `kb-labs.config.json`:

```json
{
  "audit": {
    "enable": ["style", "types", "tests", "build"],
    "thresholds": {
      "coverage": {
        "lines": 85,
        "branches": 80,
        "functions": 85,
        "statements": 85
      }
    },
    "timeouts": {
      "testsMs": 600000
    },
    "concurrency": 2
  }
}
```

### Profile-Based Thresholds

Coverage thresholds can be loaded from devkit profiles:

```bash
# Use frontend profile
kb audit run --profile frontend

# Use library profile
kb audit run --profile library
```

Thresholds are resolved in this order:
1. `kb-labs.config.json#audit.thresholds.coverage`
2. Devkit profile `policies.coverageThresholds` or `meta.coverageThresholds`
3. Defaults: `{lines: 90, branches: 85, functions: 90, statements: 90}`

## Checks

### Style Check

Runs `eslint . --format json` and reports errors/warnings.

**Requirements**: eslint installed and configured

### Types Check

Runs `tsc --noEmit --pretty false` and reports type errors.

**Requirements**: TypeScript installed with tsconfig.json

### Tests Check

Runs `vitest run --reporter=json` and checks:
- Test pass/fail status
- Coverage metrics against thresholds

**Requirements**: vitest installed

### Build Check

Auto-detects build tool (tsup, rollup, vite) and runs build, measuring:
- Build success/failure
- Artifact count and total size

**Requirements**: Build tool configured in package

### DevLink Check

Runs `kb devlink check --json` and reports:
- Dependency cycles
- Version mismatches

**Requirements**: KB Labs CLI with devlink command

### Mind Check

Runs `kb mind verify --json` and checks:
- Index consistency
- Freshness (updatedAt)

**Requirements**: Mind workspace initialized

### Security Check

Runs `npm audit --json` and reports vulnerabilities.

**Requirements**: npm installed

## Reports

### JSON Report

Machine-readable format for CI/CD and release-manager:

```json
{
  "schemaVersion": "1.0",
  "ts": "2025-10-31T18:35:00Z",
  "context": {
    "repo": "kb-labs-audit",
    "cwd": "/path/to/repo",
    "profile": "frontend"
  },
  "checks": {
    "style": { "ok": true, "errors": 0, "warnings": 2, "timingMs": 420 },
    "tests": { "ok": false, "failed": 1, "coverage": { "lines": 88 } }
  },
  "overall": { "ok": false, "failReasons": ["tests.coverage.lines<90"] },
  "meta": { "node": "v20.11.0", "timingMs": { "total": 7770 } }
}
```

### Markdown Report

Human-readable summary with detailed sections:

```markdown
## ✅ Code Style
> eslint — passed with 0 errors, 2 warnings
- Duration: 320ms

## ❌ Tests
> vitest — 1 failed, coverage below threshold
- Coverage: 88% lines (threshold 90%)
```

### Text Report

CI-friendly compact format:

```
[style] OK (0e, 2w)
[tests] FAIL coverage<90%
Overall: ❌
```

### HTML Report

Interactive dashboard with collapsible sections.

## CI/CD Integration

### Basic Integration

```yaml
# .github/workflows/audit.yml
- name: Run Audit
  run: kb audit run --json
  
- name: Upload Report
  uses: actions/upload-artifact@v3
  with:
    name: audit-report
    path: .kb/audit/report.json
```

### Exit Code Handling

```bash
# In CI script
kb audit run --strict || {
  echo "Quality gate failed"
  kb audit show
  exit 2
}
```

## Troubleshooting

### Check Skipped

If a check shows as "skipped", the required tool may not be installed:

```bash
# Check if eslint is available
eslint --version

# Install missing tools
pnpm add -D eslint typescript vitest
```

### Timeout Issues

Increase timeout in config:

```json
{
  "audit": {
    "timeouts": {
      "testsMs": 600000
    }
  }
}
```

### Coverage Threshold Not Met

Either fix coverage or adjust threshold:

```json
{
  "audit": {
    "thresholds": {
      "coverage": {
        "lines": 80
      }
    }
  }
}
```

