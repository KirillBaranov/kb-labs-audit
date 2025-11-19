# KB Labs Audit Documentation Standard

> **This document is a project-specific copy of the KB Labs Documentation Standard.**  
> See [Main Documentation Standard](https://github.com/KirillBaranov/kb-labs/blob/main/docs/DOCUMENTATION.md) for the complete ecosystem standard.

This document defines the documentation standards for **KB Labs Audit**. This project follows the [KB Labs Documentation Standard](https://github.com/KirillBaranov/kb-labs/blob/main/docs/DOCUMENTATION.md) with the following project-specific customizations:

## Project-Specific Customizations

KB Labs Audit is a unified quality audit framework for KB Labs monorepo packages. Documentation should focus on:

- Quality checks orchestration
- Configuration and thresholds
- Report formats (JSON, Markdown, Text, HTML)
- CI/CD integration
- Package scope filtering

## Project Documentation Structure

```
docs/
├── DOCUMENTATION.md       # This standard (REQUIRED)
├── contracts.md            # Check contracts
├── usage.md                # Usage guide
└── adr/                    # Architecture Decision Records
    ├── 0000-template.md   # ADR template
    └── *.md                # ADR files
```

## Required Documentation

This project requires:

- [x] `README.md` in root with all required sections
- [x] `CONTRIBUTING.md` in root with development guidelines
- [x] `docs/DOCUMENTATION.md` (this file)
- [x] `docs/adr/0000-template.md` (ADR template exists)
- [x] `LICENSE` in root

## Optional Documentation

This project has:

- [x] `docs/contracts.md` - Check contracts
- [x] `docs/usage.md` - Usage guide

## ADR Requirements

All ADRs must follow the format defined in the [main standard](https://github.com/KirillBaranov/kb-labs/blob/main/docs/DOCUMENTATION.md#architecture-decision-records-adr) with:

- Required metadata: Date, Status, Deciders, Last Reviewed, Tags
- Minimum 1 tag, maximum 5 tags
- Tags from approved list
- See main standard `docs/templates/ADR.template.md` for template

## Cross-Linking

This project links to:

**Dependencies:**
- [@kb-labs/core](https://github.com/KirillBaranov/kb-labs-core) - Core utilities
- [@kb-labs/devkit](https://github.com/KirillBaranov/kb-labs-devkit) - DevKit profiles

**Used By:**
- All KB Labs projects for quality checking
- CI/CD pipelines

**Ecosystem:**
- [KB Labs](https://github.com/KirillBaranov/kb-labs) - Main ecosystem repository

---

**Last Updated:** 2025-11-03  
**Standard Version:** 1.0 (following KB Labs ecosystem standard)  
**See Main Standard:** [KB Labs Documentation Standard](https://github.com/KirillBaranov/kb-labs/blob/main/docs/DOCUMENTATION.md)



