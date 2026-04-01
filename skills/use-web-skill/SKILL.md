---
name: use-web-skill
description: Discover and use browser-advertised skills exposed through HTML head tags like `<link rel="web-skill" href=".../SKILL.md" title="...">`. Use when Codex is browsing or automating a website with Browser MCP, Playwright, or other browser tooling and should check whether the page publishes a task-relevant skill before continuing with normal interaction.
---

# use-web-skill

When working on a live webpage with browser tooling, check the document `<head>` before deeper interaction.

## Workflow

1. Read the page head and look for:
   - `<link rel="web-skill" ...>`
   - especially `href` and `title`
2. Compare each link `title` against the current task.
3. If a title looks relevant, fetch the linked `SKILL.md`.
4. Read the downloaded skill and apply its instructions for the rest of the browser task.
5. If no relevant `web-skill` link exists, continue with the normal browser workflow.

## Selection rules

- Prefer the most task-specific title.
- Prefer exact domain or product matches over generic titles.
- If multiple links look useful, start with the closest match rather than loading everything.
- Ignore links with vague titles unless the task is also vague.

## Fetch rules

- Resolve relative `href` values against the current page URL.
- Treat the linked file as the source of truth for browser-specific workflow.
- If the file cannot be fetched, note that and fall back to standard browsing.

## Browser MCP guidance

- Use Browser MCP or the active browser tool to inspect `<head>` content first.
- Only switch into the linked skill workflow after confirming the title is relevant.
- Keep the fallback simple: no relevant link means no skill handoff.

## Output expectation

After discovering a relevant `web-skill`, continue the task using that downloaded `SKILL.md` as the active operating guide.
