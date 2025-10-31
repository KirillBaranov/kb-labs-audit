# KB Labs Audit - JSON Schema Contracts

## Report Schema

### AuditReport

The canonical JSON report structure:

```typescript
interface AuditReport {
  schemaVersion: '1.0';
  ts: string; // ISO 8601 timestamp
  context: {
    repo: string; // Repository root path
    cwd: string; // Working directory
    profile?: string; // Devkit profile ID
  };
  checks: Partial<Record<CheckId, AuditCheckResult>>;
  overall: {
    ok: boolean;
    failReasons: string[];
  };
  meta: {
    node: string; // Node.js version
    kbCli?: string; // KB Labs CLI version
    pnpm?: string; // pnpm version
    timingMs: { total: number };
  };
}
```

### CheckId

```typescript
type CheckId = 'style' | 'types' | 'tests' | 'build' | 'devlink' | 'mind' | 'security';
```

### AuditCheckResult

```typescript
interface AuditCheckResult {
  id: CheckId;
  ok: boolean;
  code?: string; // Error code (e.g., "PARSE_ERROR", "AUDIT_TOOL_ERROR")
  details?: unknown; // Check-specific details
  hint?: string; // Human-readable recommendation
  timingMs?: number; // Execution time in milliseconds
}
```

## Check-Specific Details

### Style Check

```typescript
{
  id: 'style',
  ok: boolean,
  details: {
    errors: number,
    warnings: number,
    exitCode: number
  },
  hint?: string,
  timingMs: number
}
```

### Types Check

```typescript
{
  id: 'types',
  ok: boolean,
  details: {
    errors: number,
    exitCode: number
  },
  hint?: string,
  timingMs: number
}
```

### Tests Check

```typescript
{
  id: 'tests',
  ok: boolean,
  details: {
    passed: number,
    failed: number,
    total: number,
    coverage: {
      lines: number,
      branches: number,
      functions: number,
      statements: number
    },
    threshold: {
      lines: number,
      branches: number,
      functions: number,
      statements: number
    }
  },
  hint?: string,
  timingMs: number
}
```

### Build Check

```typescript
{
  id: 'build',
  ok: boolean,
  details: {
    exitCode: number,
    artifacts: {
      count: number,
      totalSizeBytes: number,
      paths: string[]
    },
    tool: 'tsup' | 'rollup' | 'vite' | 'pnpm'
  },
  hint?: string,
  timingMs: number
}
```

### DevLink Check

```typescript
{
  id: 'devlink',
  ok: boolean,
  details: {
    cycles: string[][], // Array of dependency cycles
    mismatches: unknown[], // Version mismatches
    exitCode: number
  },
  hint?: string,
  timingMs: number
}
```

### Mind Check

```typescript
{
  id: 'mind',
  ok: boolean,
  details: {
    verify: {
      ok: boolean,
      inconsistencies: unknown[]
    },
    updatedAt?: string // ISO timestamp
  },
  hint?: string,
  timingMs: number
}
```

### Security Check

```typescript
{
  id: 'security',
  ok: boolean,
  details: {
    total: number,
    summary: {
      info: number,
      low: number,
      moderate: number,
      high: number,
      critical: number
    },
    exitCode: number
  },
  hint?: string,
  timingMs: number
}
```

## Error Codes

### AUDIT_TOOL_ERROR

Generic tool execution error. Check `details.error` for the underlying error message.

### PARSE_ERROR

Failed to parse tool output (usually JSON parsing).

### INVALID_COMMAND

Invalid or missing build command.

## Fail Reasons Format

Fail reasons follow the pattern: `<checkId>.<code>` or `<checkId>.<metric><threshold>`

Examples:
- `tests.coverage.lines<90`
- `tests.coverage.branches<85`
- `style.ERROR`
- `build.FAILED`

## Timestamp Format

All timestamps use ISO 8601 format:
```
2025-10-31T18:35:00.000Z
```

## Numeric Precision

- Timing values (ms) are rounded to 2 decimal places
- Coverage percentages are rounded to whole numbers
- File sizes (bytes) are integers

## Schema Stability

The JSON schema version `1.0` is stable. All numeric values are normalized, timestamps are deterministic, and field order is consistent for snapshot testing.

## Example Report

```json
{
  "schemaVersion": "1.0",
  "ts": "2025-10-31T18:35:00.000Z",
  "context": {
    "repo": "/path/to/kb-labs-audit",
    "cwd": "/path/to/kb-labs-audit",
    "profile": "frontend"
  },
  "checks": {
    "style": {
      "id": "style",
      "ok": true,
      "details": {
        "errors": 0,
        "warnings": 2,
        "exitCode": 0
      },
      "timingMs": 420.5
    },
    "tests": {
      "id": "tests",
      "ok": false,
      "details": {
        "passed": 73,
        "failed": 1,
        "total": 74,
        "coverage": {
          "lines": 88,
          "branches": 84,
          "functions": 89,
          "statements": 89
        },
        "threshold": {
          "lines": 90,
          "branches": 85,
          "functions": 90,
          "statements": 90
        }
      },
      "hint": "Coverage below threshold.",
      "timingMs": 3560
    }
  },
  "overall": {
    "ok": false,
    "failReasons": [
      "tests.coverage.lines<90",
      "tests.coverage.statements<90"
    ]
  },
  "meta": {
    "node": "v20.11.0",
    "pnpm": "9.12.0",
    "timingMs": {
      "total": 7770.5
    }
  }
}
```


