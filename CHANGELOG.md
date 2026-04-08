# Changelog

All notable changes to `web-skill` should be documented in this file.

## 0.3.1 - 2026-04-08

- render generated `SKILL.md` function headings as full callable `window._web_skills.<skill>.<function>(input)` paths
- remove the redundant standalone console entrypoint block from generated markdown

## 0.3.0 - 2026-04-07

- normalize `z.file()` inputs and outputs from `File`, `Blob`, and `data:` URL values before Zod parsing
- render schema restrictions as compact end-of-line comments in generated markdown
- fix multiline nested schema comment terminators in markdown output

## 0.2.2 - 2026-04-05

- harden markdown schema rendering against Zod v4 metadata layouts that expose schema kind via `def.type` or `schema.type`
- add regression coverage for generated `SKILL.md` schema summaries when `_def.typeName` is absent

## 0.2.0 - 2026-04-02

- split public entry points into `web-skill`, `web-skill/vite`, and `web-skill/dev`
- keep runtime imports separate from markdown and build-time helpers
- update repository metadata to the `dimbreak/web-skill` repository path

## 0.1.1 - 2026-04-02

- ship compiled `dist/` output for npm consumers
- add TypeScript tests and verification workflow
- add API reference and contribution/community documentation
- clarify authorization guidance in the README

## 0.1.0 - 2026-04-01

- initial public release
