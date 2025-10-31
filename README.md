# @kb-labs/audit

[![npm version](https://img.shields.io/npm/v/@kb-labs/audit.svg?style=flat-square)](https://www.npmjs.com/package/@kb-labs/audit)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg?style=flat-square)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![ESM](https://img.shields.io/badge/Module-ESM-purple.svg?style=flat-square)](https://nodejs.org/api/esm.html)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

Unified quality audit framework for KB Labs monorepo packages. Combines existing quality checks (eslint, tsc, vitest, build, devlink, mind, security) into a single orchestrator, producing machine-readable JSON reports and human-readable summaries (Markdown, Text, HTML) for CI/CD and release-manager integration.

## Features

- **Unified Quality Checks** ![Checks](https://img.shields.io/badge/Checks-7%20Types-4CAF50.svg?style=flat-square): Run all quality checks (style, types, tests, build, devlink, mind, security) with a single command
- **Machine-Readable Reports** ![JSON](https://img.shields.io/badge/JSON-Stable-FF9800.svg?style=flat-square): JSON output for CI/CD pipelines and release-manager integration
- **Human-Readable Reports** ![Reports](https://img.shields.io/badge/Reports-MD%2FTXT%2FHTML-2196F3.svg?style=flat-square): Markdown, Text, and HTML summaries
- **Parallel Execution** ![Parallel](https://img.shields.io/badge/Parallel-Configurable-9C27B0.svg?style=flat-square): Efficient parallel check execution with configurable concurrency (default: 4)
- **Configurable Thresholds** ![Thresholds](https://img.shields.io/badge/Thresholds-Flexible-00BCD4.svg?style=flat-square): Coverage thresholds from devkit profiles or local config
- **Graceful Degradation** ![Degradation](https://img.shields.io/badge/Degradation-Graceful-8BC34A.svg?style=flat-square): Missing tools are skipped gracefully
- **Exit Codes** ![Exit](https://img.shields.io/badge/Exit-Codes-607D8B.svg?style=flat-square): Proper exit codes (0=pass, 2=quality gate fail, 3=misconfig)
- **Package Scope Filtering** ![Scope](https://img.shields.io/badge/Scope-Glob-FF5722.svg?style=flat-square): Run checks per package with glob patterns and aggregate results

## Why Audit?

Working with multiple packages in a monorepo requires consistent quality checks:

- **Manual checks** are time-consuming and error-prone
- **Inconsistent thresholds** across packages cause quality gaps
- **CI/CD integration** needs machine-readable reports
- **Release workflows** require aggregated quality status

Audit solves these problems by providing:

✅ **Single command** — run all checks with `kb audit run`  
✅ **Deterministic reports** — consistent JSON schema for automation  
✅ **Flexible configuration** — devkit profiles + local overrides  
✅ **Graceful degradation** — missing tools don't break the audit  
✅ **Package filtering** — audit specific packages with `--scope`

## Install

```bash
pnpm add -D @kb-labs/audit
# or
npm i -D @kb-labs/audit
```

## Quick Start

### 1. Run audit checks

```bash
# Run all enabled checks at repo level
kb audit run

# Run checks for specific packages (per-package execution)
kb audit run --scope packages/*

# Run with JSON output
kb audit run --json

# Use specific devkit profile
kb audit run --profile frontend
```

### 2. View results

```bash
# Show last report (human-readable)
kb audit show

# Show last report (JSON)
kb audit show --json

# List available checks
kb audit list-checks
```

### 3. Configure (optional)

Create `kb-labs.config.json` to customize behavior:

```json
{
  "audit": {
    "enable": ["style", "types", "tests", "build"],
    "thresholds": {
      "coverage": {
        "lines": 90,
        "branches": 85,
        "functions": 90,
        "statements": 90
      }
    },
    "concurrency": 4
  }
}
```

## Commands

### `kb audit run`

Run quality audit checks across the workspace.

**Flags:**
- `--scope <pattern>`: Package scope (glob pattern). When specified, runs checks per package and aggregates results. If not specified, runs at repo level.
- `--all`: Include private packages in scope filtering
- `--strict`: Fail on any threshold breach
- `--profile <name>`: Devkit profile to use (e.g., `frontend`, `library`)
- `--fail-on <level>`: Exit policy (`warn`, `error`, or `any`). Default: `error`
- `--json`: Print JSON to stdout
- `--md`: Generate markdown summary (default: true)
- `--html`: Generate HTML summary
- `--text`: Generate text summary (default: true)
- `--quiet`: Reduce output verbosity

**Examples:**
```bash
# Run all checks at repo level
kb audit run

# Run checks for specific packages (per-package execution)
kb audit run --scope packages/*

# Run with glob pattern
kb audit run --scope "packages/{core,cli}/*"

# Include private packages
kb audit run --scope packages/* --all

# Run in strict mode with JSON output
kb audit run --strict --json

# Use specific profile
kb audit run --profile frontend --md
```

### `kb audit list-checks`

List all available audit checks.

```bash
kb audit list-checks
kb audit list-checks --json
```

### `kb audit show`

Display the last audit report.

```bash
kb audit show
kb audit show --json
```

### `kb audit clean`

Clean the `.kb/audit/` output directory.

```bash
kb audit clean
```

## Configuration

Configure audit behavior via `kb-labs.config.json`:

```json
{
  "audit": {
    "enable": ["style", "types", "tests", "build", "devlink", "mind", "security"],
    "thresholds": {
      "coverage": {
        "lines": 90,
        "branches": 85,
        "functions": 90,
        "statements": 90
      }
    },
    "timeouts": {
      "styleMs": 30000,
      "typesMs": 60000,
      "testsMs": 300000,
      "buildMs": 180000,
      "devlinkMs": 10000,
      "mindMs": 10000,
      "securityMs": 60000
    },
    "scope": {
      "include": ["packages/*"],
      "exclude": ["packages/internal/*"]
    },
    "output": {
      "json": true,
      "md": true,
      "html": false,
      "text": true
    },
    "concurrency": 4
  }
}
```

**Configuration Priority:**
1. `kb-labs.config.json#audit` (highest priority)
2. Devkit profile thresholds
3. Default values

### Coverage Thresholds

Coverage thresholds come from:
1. `kb-labs.config.json#audit.thresholds.coverage`
2. Devkit profile (e.g., `frontend`, `library`)
3. Defaults (lines: 80, branches: 75, functions: 80, statements: 80)

### Build Check

The build check automatically detects build tools:
- **tsup**: Detects `tsup.config.ts` or `tsup.config.js`
- **rollup**: Detects `rollup.config.js`
- **vite**: Detects `vite.config.ts` or `vite.config.js`
- **fallback**: Runs `pnpm build` if no tool is detected

Build check measures:
- Build success (exit code)
- Artifact size (if available)
- Errors are logged but don't halt audit (unless `--strict`)

## Output

Audit reports are written to `.kb/audit/`:

```
.kb/audit/
├── report.json    # Machine-readable JSON report
├── summary.md     # Human-readable Markdown summary
├── summary.txt    # CI-friendly text summary
└── summary.html   # HTML dashboard (optional)
```

### Report Schema

JSON reports follow a stable schema:

```json
{
  "schemaVersion": "1.0",
  "ts": "2025-01-28T12:00:00Z",
  "context": {
    "repo": "/path/to/repo",
    "cwd": "/path/to/cwd",
    "profile": "frontend"
  },
  "checks": {
    "style": {
      "id": "style",
      "ok": true,
      "details": {},
      "timingMs": 1234
    },
    "types": {
      "id": "types",
      "ok": true,
      "details": {},
      "timingMs": 2345
    }
  },
  "overall": {
    "ok": true,
    "failReasons": []
  },
  "meta": {
    "node": "v20.19.4",
    "kbCli": "1.2.3",
    "pnpm": "9.11.0",
    "timingMs": {
      "total": 5678
    }
  }
}
```

## Exit Codes

- `0` — All checks passed
- `1` — Infrastructure/tool error (unexpected failure)
- `2` — Quality gate failed (expected fail)
- `3` — Misconfiguration (invalid config or flags)

## Architecture

The audit system consists of three packages:

- **@kb-labs/audit-core**: Core orchestrator, configuration, aggregation, and report generation
- **@kb-labs/audit-checks**: Adapters for specific tools (eslint, tsc, vitest, build, devlink, mind, security)
- **@kb-labs/audit-cli**: CLI commands and manifest integration

### Architecture Flow

```
┌──────────────────────┐
│   config phase      │
│  load config        │
│  resolve profile    │
│  merge overrides    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   scope phase        │
│  discover packages   │
│  apply glob filters  │
│  filter private      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   check phase       │
│  run adapters       │
│  parallel execution  │
│  timeout handling   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  aggregate phase    │
│  merge results      │
│  apply thresholds   │
│  compute overall    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   report phase      │
│  generate JSON      │
│  generate MD/TXT   │
│  generate HTML      │
└──────────────────────┘
```

## Packages

This monorepo includes:

| Package                                    | Description                                               |
| ------------------------------------------ | --------------------------------------------------------- |
| [`@kb-labs/audit-core`](./packages/audit-core) | Core orchestrator, configuration, aggregation, and report generation |
| [`@kb-labs/audit-checks`](./packages/audit-checks) | Check adapters for eslint, tsc, vitest, build, devlink, mind, security |
| [`@kb-labs/audit-cli`](./packages/audit-cli) | CLI commands and manifest integration |

## Check Adapters

Each check is implemented as an adapter that normalizes tool output:

### Style Check (ESLint)
- Runs `eslint .`
- Captures errors and warnings
- Normalizes to audit format

### Types Check (TypeScript)
- Runs `tsc --noEmit`
- Captures type errors
- Reports error count

### Tests Check (Vitest)
- Runs `vitest run`
- Captures test results
- Validates coverage thresholds

### Build Check
- Auto-detects build tool (tsup/rollup/vite)
- Runs corresponding build command
- Measures success and artifact size

### DevLink Check
- Runs `kb devlink status --json`
- Validates linking state
- Reports drift if any

### Mind Check
- Runs `kb mind pack --json`
- Validates context layer
- Reports pack status

### Security Check (npm audit)
- Runs `npm audit --json`
- Captures vulnerabilities
- Reports severity levels

## Use Cases

- **CI/CD Integration**: Run audits in CI pipelines with JSON output
- **Release Workflow**: Validate quality before releases
- **Package Validation**: Check specific packages with `--scope`
- **Quality Monitoring**: Track quality metrics over time
- **Team Standards**: Enforce consistent thresholds across packages
- **Development Workflow**: Quick quality check during development

## Design Principles

- **Deterministic**: Reproducible reports across runs
- **Composable**: CLI is a thin wrapper; all logic in packages
- **Isolated**: Each check runs independently
- **Observable**: Everything produces explicit reports
- **Safe**: Graceful degradation for missing tools
- **Fast**: Parallel execution with configurable concurrency

## DevKit Integration

This project uses `@kb-labs/devkit` for shared tooling configurations:

- **TypeScript**: `@kb-labs/devkit/tsconfig/node.json`
- **ESLint**: `@kb-labs/devkit/eslint/node.js`
- **Prettier**: `@kb-labs/devkit/prettier/index.json`
- **Vitest**: `@kb-labs/devkit/vitest/node.js`
- **Tsup**: `@kb-labs/devkit/tsup/node.js`

To sync DevKit assets:

```bash
pnpm devkit:sync
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details on DevKit integration.

## Examples

### Example 1: Basic workflow

```bash
# Run all checks
kb audit run

# View results
kb audit show
```

### Example 2: Package scope filtering

```bash
# Audit specific packages
kb audit run --scope packages/core/*

# Audit multiple patterns
kb audit run --scope "packages/{core,cli}/*"

# Include private packages
kb audit run --scope packages/* --all
```

### Example 3: CI/CD Integration

```bash
# Run with JSON output
kb audit run --json > audit-report.json

# Check exit code
if [ $? -eq 0 ]; then
  echo "All checks passed"
else
  echo "Quality gate failed"
  exit 1
fi
```

### Example 4: Profile-based configuration

```bash
# Use frontend profile (higher coverage thresholds)
kb audit run --profile frontend

# Use library profile (standard thresholds)
kb audit run --profile library
```

### Example 5: Custom configuration

```json
{
  "audit": {
    "enable": ["style", "types", "tests"],
    "thresholds": {
      "coverage": {
        "lines": 95,
        "branches": 90,
        "functions": 95,
        "statements": 95
      }
    },
    "timeouts": {
      "testsMs": 600000
    }
  }
}
```

## FAQ

### General

- **Why use Audit instead of running checks manually?** — Audit provides unified reporting, parallel execution, and CI/CD integration with a single command.
- **Can I customize check behavior?** — Yes, via `kb-labs.config.json` and devkit profiles.
- **What happens if a tool is missing?** — Missing tools are skipped gracefully with a warning.
- **Can I run checks in parallel?** — Yes, default concurrency is 4, configurable via `concurrency` option.

### Configuration

- **How do I set coverage thresholds?** — Use `kb-labs.config.json#audit.thresholds.coverage` or devkit profiles.
- **Can I disable specific checks?** — Yes, via `kb-labs.config.json#audit.enable` array.
- **How do I configure timeouts?** — Use `kb-labs.config.json#audit.timeouts`.
- **What's the configuration priority?** — Local config > devkit profile > defaults.

### Package Scope

- **How does `--scope` work?** — It filters packages using glob patterns and runs checks per package, then aggregates results.
- **What if no `--scope` is provided?** — Audit runs at repo level (all packages in workspace).
- **Can I exclude private packages?** — Yes, by default private packages are excluded unless `--all` is used.
- **How do glob patterns work?** — Uses `globby` to match package directories.

### Reporting

- **Where are reports saved?** — `.kb/audit/` directory in repo root.
- **Can I customize report formats?** — Yes, via `kb-labs.config.json#audit.output`.
- **What's the JSON schema?** — See [Output](#output) section above.
- **Can I use reports in CI/CD?** — Yes, JSON reports are stable and machine-readable.

## Documentation

- **[Contributing Guide](./CONTRIBUTING.md)** — Guidelines for contributors
- **Package READMEs**: See individual package directories for detailed API documentation

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT © 2025 KB Labs — Built for automated developer ecosystems.

## Author

**Kirill Baranov**
- GitHub: [@kirill-baranov](https://github.com/kirill-baranov)
