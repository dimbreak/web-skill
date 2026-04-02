# Request Workbench Example

This example is a pure front-end mock built with React, Zustand, Vite, and `web-skill`.

It demonstrates:

- reading existing mock records from a Zustand store
- creating new draft records locally with no backend
- exposing task-level actions to agents through `web-skill`
- guiding the workflow toward the right interface after each action

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

The example publishes a request-workbench skill with functions for:

- listing existing requests
- opening the selected request workspace
- creating a new mock request draft
