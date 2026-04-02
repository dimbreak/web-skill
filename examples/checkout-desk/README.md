# Checkout Desk Example

This example is a deliberately simple three-step checkout form built with React, Vite, and `web-skill`.

It is intentionally plain on purpose. The point is to show that `web-skill` does not require an advanced agent-native app shell first. A conventional checkout page with named form fields and normal submit buttons can already expose a cleaner task-level handoff for agents.

It demonstrates:

- no Zustand or external state management
- a conventional multi-step UI with local component state only
- a `prepareCheckout` skill that uses named forms, form fields, and submit actions
- how `web-skill` can still help older or more ordinary sites expose stable task-level actions

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Exposed browser skill

The example publishes a checkout skill with one core function:

- `prepareCheckout`, which fills contact and card details, advances the flow, and lands the page on the confirm step

## Agent note

Agents should load [`use-web-skill`](../../skills/use-web-skill/SKILL.md) before interacting with a live site that publishes browser skills. The expected flow is:

- inspect the page `<head>`
- look for `<link rel="web-skill" ...>`
- fetch the linked `SKILL.md`
- then follow that skill instead of defaulting straight to raw browser automation
