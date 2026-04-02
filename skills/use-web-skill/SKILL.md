---
name: use-web-skill
description: Discover browser-advertised `web-skill` links in a page head, fetch the relevant `SKILL.md`, verify the matching runtime entrypoint under `window._web_skills`, and prefer direct task-level calls before falling back to raw browser automation.
---

# use-web-skill

Use this skill when an agent is working on a live webpage with Browser MCP, Playwright, or similar browser tooling.

It helps the agent look for `<link rel="web-skill" ...>` in the document `<head>`, read the linked `SKILL.md`, verify the matching browser runtime entrypoint, and prefer the page's advertised workflow before falling back to generic DOM automation.

This is most useful on sites that already publish task-level browser skills and want agents to discover them reliably.

## Workflow

1. Read the page head and look for:
   - `<link rel="web-skill" ...>`
   - especially `href` and `title`
2. Compare each link `title` against the current task.
3. If a title looks relevant, fetch the linked `SKILL.md`.
4. Read the downloaded skill, identify the documented console entrypoint, and check whether the page exposes it under `window._web_skills`.
5. If the matching runtime entrypoint exists, prefer direct task-level function calls through `window._web_skills.*` instead of recreating the flow with DOM clicks and typed input.
6. If no relevant `web-skill` link exists, or the linked skill cannot be used, continue with the normal browser workflow.

## Selection rules

- Prefer the most task-specific title.
- Prefer exact domain or product matches over generic titles.
- If multiple links look useful, start with the closest match rather than loading everything.
- Ignore links with vague titles unless the task is also vague.

## Fetch rules

- Resolve relative `href` values against the current page URL.
- Treat the linked file as the source of truth for browser-specific workflow.
- If the file cannot be fetched, note that and fall back to standard browsing.

## Runtime checks

- After reading the linked `SKILL.md`, verify that the described runtime key exists under `window._web_skills`.
- Sanity-check that the link title, skill description, and runtime entrypoint all point to the same workflow before invoking anything.
- If the skill document is present but the runtime entrypoint is missing, treat that as an incomplete integration and fall back carefully.

## Browser MCP guidance

- Use Browser MCP or the active browser tool to inspect `<head>` content first.
- Only switch into the linked skill workflow after confirming the title is relevant and the runtime entrypoint is available.
- Prefer direct `window._web_skills.*` calls whenever the page exposes them.
- Keep the fallback order simple:
  1. discover `<link rel="web-skill">`
  2. fetch the linked `SKILL.md`
  3. verify the runtime entrypoint under `window._web_skills`
  4. direct-call the task-level function
  5. only then fall back to raw DOM automation

## Output expectation

After discovering a relevant `web-skill`, continue the task using that downloaded `SKILL.md` as the active operating guide.
