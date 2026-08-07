# Prive Codex Documentation Package

This package turns persistent agent guidance into a small `AGENTS.md`, targeted reference documents, ADRs, an archive boundary, and reusable Prive workflows.

Start with [migration-guide.md](migration-guide.md). Copy this package into the repository root, then migrate the original Markdown files using that guide. Do not delete the original files until their content has been reviewed and moved.

## Layout

```text
AGENTS.md                  always-loaded operating rules
docs/architecture/         code-structure and cross-cutting contracts
docs/domain/               intended business behaviour and ownership
docs/decisions/            accepted or pending decisions (ADRs)
docs/archive/              non-authoritative historical reports
.agents/skills/            opt-in, reusable workflows
```

The domain files deliberately set a safe baseline where the referenced conversation did not expose the original attachments. Populate them from the source files before treating them as a complete specification.
