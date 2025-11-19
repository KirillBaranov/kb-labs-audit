# Package Architecture Description: @kb-labs/audit-cli

**Version**: 0.1.0
**Last Updated**: 2025-11-16

## Executive Summary

**@kb-labs/audit-cli** provides CLI commands for KB Labs Audit. It includes commands for running audits, listing checks, showing reports, and cleaning audit artifacts.

## 1. Package Overview

### 1.1 Purpose & Scope

**Primary Purpose**: Provide CLI commands for audit system.

**Scope Boundaries**:
- **In Scope**: CLI commands, manifest definition, REST handlers, analytics
- **Out of Scope**: Check execution (in audit-core), check implementations (in audit-checks)

**Domain**: Audit System / CLI Commands

### 1.2 Key Responsibilities

1. **CLI Commands**: Implement CLI commands for audit
2. **Manifest Definition**: Define plugin manifest
3. **REST Handlers**: Provide REST API handlers
4. **Analytics Integration**: Track analytics events

## 2. High-Level Architecture

### 2.1 Architecture Diagram

```
Audit CLI
    │
    ├──► CLI Commands (commands/)
    │   ├──► run.ts
    │   ├──► list-checks.ts
    │   ├──► show.ts
    │   └──► clean.ts
    │
    ├──► Manifest Definition (manifest.v2.ts)
    │   ├──► Plugin manifest
    │   └──► CLI commands definition
    │
    ├──► REST Handlers (rest/handlers/)
    │   ├──► list-checks-handler.ts
    │   └──► report-handler.ts
    │
    └──► Analytics Integration (analytics/)
        └──► Event tracking
```

### 2.2 Architectural Style

- **Style**: CLI Adapter Pattern
- **Rationale**: Adapt audit core to CLI interface

## 3. Component Architecture

### 3.1 Component: CLI Commands

- **Purpose**: Implement CLI commands
- **Responsibilities**: Command execution, output formatting
- **Dependencies**: cli-core, cli-commands, audit-core, audit-checks

### 3.2 Component: Manifest Definition

- **Purpose**: Define plugin manifest
- **Responsibilities**: Manifest structure, command definitions
- **Dependencies**: plugin-manifest

### 3.3 Component: REST Handlers

- **Purpose**: Provide REST API handlers
- **Responsibilities**: Handle REST requests, return responses
- **Dependencies**: audit-core, audit-contracts

### 3.4 Component: Analytics Integration

- **Purpose**: Track analytics events
- **Responsibilities**: Emit analytics events
- **Dependencies**: analytics-sdk-node

## 4. Data Flow

```
command.run(ctx, argv, flags)
    │
    ├──► Load configuration
    ├──► Execute audit (via audit-core)
    ├──► Format output
    ├──► Emit analytics
    └──► return exit code
```

## 5. Design Patterns

- **CLI Adapter Pattern**: CLI adapter for audit system
- **Command Pattern**: CLI commands as command objects
- **Factory Pattern**: Command creation

## 6. Performance Architecture

- **Time Complexity**: O(n) for command execution, O(1) for command registration
- **Space Complexity**: O(n) where n = number of packages
- **Bottlenecks**: Audit execution time

## 7. Security Architecture

- **Scope Validation**: Package scope validation
- **Path Validation**: Path validation for file operations

---

**Last Updated**: 2025-11-16

