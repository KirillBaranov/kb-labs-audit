# @kb-labs/audit-core

KB Labs Audit - core orchestrator, configuration, and report generation.

## Vision & Purpose

**@kb-labs/audit-core** provides core orchestrator for KB Labs Audit. It includes configuration loading, check execution, result aggregation, and report generation in multiple formats.

### Core Goals

- **Configuration Loading**: Load audit configuration from kb-labs.config.json
- **Check Execution**: Orchestrate check execution with concurrency control
- **Result Aggregation**: Aggregate check results into overall status
- **Report Generation**: Generate reports in multiple formats (JSON, Markdown, HTML, Text)

## Package Status

- **Version**: 0.1.0
- **Stage**: Stable
- **Status**: Production Ready ✅

## Architecture

### High-Level Overview

```
Audit Core
    │
    ├──► Configuration Loading
    ├──► Check Execution
    ├──► Result Aggregation
    └──► Report Generation
```

### Key Components

1. **Config** (`config.ts`): Configuration loading
2. **Runner** (`runner.ts`): Check execution orchestrator
3. **Aggregator** (`aggregator.ts`): Result aggregation
4. **Check Registry** (`check-registry.ts`): Check adapter registry
5. **Reporters** (`reporters/`): Report generation (JSON, Markdown, HTML, Text)

## ✨ Features

- **Configuration loading** from kb-labs.config.json
- **Check execution** with concurrency control
- **Result aggregation** into overall status
- **Report generation** in multiple formats
- **Timeout handling** per check type
- **Scope filtering** for package selection

## 📦 API Reference

### Main Exports

#### Configuration Functions

- `loadConfig(opts)`: Load audit configuration

#### Execution Functions

- `runAudit(options)`: Run audit checks
- `createCheckRegistry()`: Create check registry

#### Aggregation Functions

- `aggregateResults(checks, config)`: Aggregate check results

#### Report Functions

- `renderJson(report)`: Render JSON report
- `renderMarkdown(report)`: Render Markdown report
- `renderHtml(report)`: Render HTML report
- `renderText(report)`: Render text report

### Types & Interfaces

#### `AuditConfig`

```typescript
interface AuditConfig {
  enable: CheckId[];
  thresholds?: {
    coverage?: CoverageThresholds;
  };
  timeouts?: {
    styleMs?: number;
    typesMs?: number;
    testsMs?: number;
    buildMs?: number;
    devlinkMs?: number;
    mindMs?: number;
  };
  scope?: {
    include?: string[];
    exclude?: string[];
  };
  output?: {
    json?: boolean;
    md?: boolean;
    html?: boolean;
    text?: boolean;
  };
  concurrency?: number;
}
```

#### `AuditReport`

```typescript
interface AuditReport {
  schemaVersion: '1.0';
  ts: string;
  context: {
    repo: string;
    cwd: string;
    profile?: string;
  };
  checks: Partial<Record<CheckId, AuditCheckResult>>;
  overall: {
    ok: boolean;
    failReasons: string[];
  };
  meta: {
    node: string;
    kbCli?: string;
    pnpm?: string;
    timingMs: { total: number };
  };
}
```

## 🔧 Configuration

### Configuration File

Configuration loaded from `kb-labs.config.json`:

```json
{
  "audit": {
    "enable": ["style", "types", "tests", "build"],
    "thresholds": {
      "coverage": {
        "lines": 80,
        "branches": 80,
        "functions": 80,
        "statements": 80
      }
    },
    "timeouts": {
      "styleMs": 30000,
      "typesMs": 60000
    },
    "concurrency": 4
  }
}
```

## 🔗 Dependencies

### Runtime Dependencies

- `@kb-labs/audit-checks` (`link:../audit-checks`): Audit checks
- `@kb-labs/core` (`link:../../../kb-labs-core`): Core package
- `globby` (`^11.0.0`): File pattern matching
- `yaml` (`^2.8.0`): YAML parsing

### Development Dependencies

- `@kb-labs/devkit` (`link:../../../kb-labs-devkit`): DevKit presets
- `@types/node` (`^24.7.0`): Node.js types
- `tsup` (`^8`): TypeScript bundler
- `typescript` (`^5`): TypeScript compiler
- `vitest` (`^3`): Test runner

## 🧪 Testing

### Test Structure

```
src/__tests__/
└── aggregator.spec.ts
```

### Test Coverage

- **Current Coverage**: ~70%
- **Target Coverage**: 90%

## 📈 Performance

### Performance Characteristics

- **Time Complexity**: O(n) for check execution, O(1) for aggregation
- **Space Complexity**: O(n) where n = number of checks
- **Bottlenecks**: Check execution time

## 🔒 Security

### Security Considerations

- **Configuration Validation**: Configuration validation
- **Timeout Limits**: Timeout limits per check

### Known Vulnerabilities

- None

## 🐛 Known Issues & Limitations

### Known Issues

- None currently

### Limitations

- **Check Types**: Fixed check types
- **Report Formats**: Fixed report formats

### Future Improvements

- **More Check Types**: Additional check types
- **Custom Report Formats**: Custom report format support

## 🔄 Migration & Breaking Changes

### Migration from Previous Versions

No breaking changes in current version (0.1.0).

### Breaking Changes in Future Versions

- None planned

## 📚 Examples

### Example 1: Load Configuration

```typescript
import { loadConfig } from '@kb-labs/audit-core';

const config = await loadConfig({ cwd: process.cwd() });
```

### Example 2: Run Audit

```typescript
import { runAudit, createCheckRegistry } from '@kb-labs/audit-core';

const registry = await createCheckRegistry();
const result = await runAudit({
  config,
  cwd: process.cwd(),
  adapters: registry,
});
```

### Example 3: Generate Report

```typescript
import { renderMarkdown } from '@kb-labs/audit-core';

const markdown = renderMarkdown(report);
```

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT © KB Labs

