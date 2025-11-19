# Package Architecture Description: @kb-labs/audit-core

**Version**: 0.1.0
**Last Updated**: 2025-11-16

## Executive Summary

**@kb-labs/audit-core** provides core orchestrator for KB Labs Audit. It includes configuration loading, check execution, result aggregation, and report generation in multiple formats.

## 1. Package Overview

### 1.1 Purpose & Scope

**Primary Purpose**: Provide core orchestrator for audit system.

**Scope Boundaries**:
- **In Scope**: Configuration loading, check execution, result aggregation, report generation
- **Out of Scope**: Check implementations (in audit-checks), CLI commands (in audit-cli)

**Domain**: Audit System / Core Orchestrator

### 1.2 Key Responsibilities

1. **Configuration Loading**: Load audit configuration from kb-labs.config.json
2. **Check Execution**: Orchestrate check execution with concurrency control
3. **Result Aggregation**: Aggregate check results into overall status
4. **Report Generation**: Generate reports in multiple formats

## 2. High-Level Architecture

### 2.1 Architecture Diagram

```
Audit Core
    │
    ├──► Configuration Loading (config.ts)
    │   ├──► Load kb-labs.config.json
    │   ├──► Merge defaults
    │   └──► Return AuditConfig
    │
    ├──► Check Execution (runner.ts)
    │   ├──► Get enabled checks
    │   ├──► Execute checks with concurrency
    │   ├──► Handle timeouts
    │   └──► Collect results
    │
    ├──► Result Aggregation (aggregator.ts)
    │   ├──► Aggregate check results
    │   ├──► Calculate overall status
    │   └──► Generate fail reasons
    │
    ├──► Check Registry (check-registry.ts)
    │   ├──► Create registry
    │   └──► Map check IDs to adapters
    │
    └──► Report Generation (reporters/)
        ├──► JSON reporter
        ├──► Markdown reporter
        ├──► HTML reporter
        └──► Text reporter
```

### 2.2 Architectural Style

- **Style**: Orchestrator Pattern
- **Rationale**: Central orchestrator for audit execution

## 3. Component Architecture

### 3.1 Component: Configuration Loading

- **Purpose**: Load configuration
- **Responsibilities**: Load config, merge defaults, validate
- **Dependencies**: core, yaml

### 3.2 Component: Check Execution

- **Purpose**: Execute checks
- **Responsibilities**: Orchestrate execution, handle concurrency, timeouts
- **Dependencies**: audit-checks

### 3.3 Component: Result Aggregation

- **Purpose**: Aggregate results
- **Responsibilities**: Aggregate results, calculate overall status
- **Dependencies**: None

### 3.4 Component: Report Generation

- **Purpose**: Generate reports
- **Responsibilities**: Render reports in multiple formats
- **Dependencies**: None

## 4. Data Flow

```
loadConfig(opts)
    │
    ├──► Find kb-labs.config.json
    ├──► Load and parse
    ├──► Merge defaults
    └──► return AuditConfig

runAudit(options)
    │
    ├──► Get enabled checks
    ├──► Execute checks (with concurrency)
    ├──► Aggregate results
    └──► return results
```

## 5. Design Patterns

- **Orchestrator Pattern**: Central orchestrator for audit execution
- **Strategy Pattern**: Different reporters for different formats
- **Registry Pattern**: Check adapter registry

## 6. Performance Architecture

- **Time Complexity**: O(n) for check execution, O(1) for aggregation
- **Space Complexity**: O(n) where n = number of checks
- **Bottlenecks**: Check execution time

## 7. Security Architecture

- **Configuration Validation**: Configuration validation
- **Timeout Limits**: Timeout limits per check

---

**Last Updated**: 2025-11-16

