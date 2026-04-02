# web-skill

[繁體中文說明](./docs/README.zh-Hant.md)

[Contributing](./CONTRIBUTING.md)

Bridge humans and agents through web UI.

## Vision

AI agents are becoming increasingly capable, but in many real-world workflows they still behave like black boxes, with too little transparency and too few chances for humans to verify, guide, or step in.

The web is already the interface people know and trust. That makes it the most natural bridge between human workflows and agent workflows.

Yet conventional DOM-driven browser automation is still a poor interface for agents: slow, expensive, and often unreliable.

`web-skill` aims to change that by making agent work more transparent, more interruptible, and easier to hand over between humans and agents, enabling safer participation in complex, high-stakes, and business-critical workflows.

## How it works

`web-skill` helps a web app publish task-level automation APIs for agents and browser tooling.

From one shared config it can:

- register functions under `window._web_skills`
- generate one `SKILL.md` file per published skill
- inject `<link rel="web-skill" ...>` tags into the HTML `<head>` through Vite

Entry points are split by purpose:

- `web-skill` for browser/runtime APIs
- `web-skill/vite` for the Vite plugin
- `web-skill/dev` for markdown generation and other build-time helpers

The package is TypeScript-first and works best in apps that already use Vite and Zod.

Status: early, but installable. The package now ships compiled `dist/` output, basic automated tests, and a small API reference so adopters do not need to compile TypeScript source themselves just to try it.

## Install

```bash
npm install web-skill zod
```

If you want the Vite plugin in your own project:

```bash
npm install vite
```

## Examples

- [`examples/request-workbench`](./examples/request-workbench/): a pure front-end React + Zustand mock showing how to list existing records, create new drafts, and expose both flows through `web-skill`
- [`examples/checkout-desk`](./examples/checkout-desk/): a three-step checkout form with local React state only, showing how a `prepareCheckout` skill can still drive a conventional DOM-shaped workflow

The checkout example is intentionally plain. `web-skill` is still useful when the site is just a conventional form flow with named inputs and submit buttons, not only when the app already has a polished agent-native architecture.

## Agent setup

On the agent side, install or load [`use-web-skill`](./skills/use-web-skill/SKILL.md). That gives the agent a simple discovery workflow: inspect the page `<head>`, look for `<link rel="web-skill">`, fetch the relevant `SKILL.md`, and only then continue with browser interaction.

## Quick start

Create one generator, point it at the app actions you already trust, and install it at startup:

```ts
import { createWebSkillGenerator } from "web-skill";
import { z } from "zod";
import { useProcurementStore } from "./stores/procurement-store";

const webSkills = createWebSkillGenerator();
const procurementStore = useProcurementStore;

const procurementSkill = webSkills.newSkill({
  name: "erpProcurement",
  title: "ERP procurement console API for supplier lookup and purchase order preparation",
  description: "Expose ERP procurement actions to browser agents and the dev console.",
});

procurementSkill.addFunction(
  (input) => procurementStore.getState().findSupplierItem(input),
  "findSupplierItem",
  {
    description: "Search supplier catalog items and return normalized matches.",
    inputSchema: z.object({
      supplierId: z.string().min(1).optional(),
      keyword: z.string().min(1).optional(),
      activeOnly: z.boolean().optional(),
      limit: z.number().int().positive().optional(),
    }),
    outputSchema: z.array(
      z.object({
        itemId: z.string(),
        sku: z.string(),
        itemName: z.string(),
        unitCost: z.number().nullable(),
      }),
    ),
  },
);

procurementSkill
  .addFunction(
    (input) => procurementStore.getState().createPurchaseOrderDraft(input),
    "createPurchaseOrderDraft",
    {
      description: "Prepare a purchase order draft and navigate to the ERP purchase order screen.",
      inputSchema: z.object({
        supplierId: z.string().min(1),
        requesterId: z.string().min(1),
        currency: z.string().min(1),
        lines: z.array(
          z.object({
            itemId: z.string(),
            quantity: z.number().positive(),
            expectedUnitCost: z.number().nonnegative().optional(),
          }),
        ),
      }),
      outputSchema: z.object({
        draftId: z.string(),
        route: z.string(),
      }),
    },
  )
  .addFunction(
    (input) => procurementStore.getState().submitPurchaseRequisition(input),
    "submitPurchaseRequisition",
    {
      description: "Create and submit a purchase requisition from the current selection.",
      inputSchema: z.object({
        departmentCode: z.string().min(1),
        neededByDate: z.string().min(1),
        lines: z.array(
          z.object({
            itemId: z.string(),
            quantity: z.number().int().positive().optional(),
          }),
        ),
      }),
    },
  );

webSkills.install();
```

That exposes browser-callable functions like:

```js
window._web_skills.erpProcurement.findSupplierItem(input)
window._web_skills.erpProcurement.createPurchaseOrderDraft(input)
window._web_skills.erpProcurement.submitPurchaseRequisition(input)
window._web_skills.erpProcurement._meta
```

## Vite integration

Use the Vite plugin with the same generator instance:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { webSkillVitePlugin } from "web-skill/vite";
import { webSkills } from "./src/web-skills.ts";

export default defineConfig({
  plugins: [
    react(),
    webSkillVitePlugin({
      generator: webSkills,
    }),
  ],
});
```

At dev/build time the plugin will:

- generate `/skills/<skill-slug>/SKILL.md` for every configured skill
- serve those markdown files in Vite dev
- emit those markdown files as build assets
- inject one `<link rel="web-skill" ...>` tag per skill into the HTML `<head>`

## What gets generated

Each generated `SKILL.md` contains:

- the skill title
- the console entrypoint under `window._web_skills.<skillKey>`
- one section per function
- summarized input and output schemas

The repository also includes [`skills/use-web-skill/SKILL.md`](./skills/use-web-skill/SKILL.md), a discovery workflow for agents that inspect `<head>` before automating a page.

## API reference

For the exported surface, expected behaviors, and common runtime errors, see [`docs/api.md`](./docs/api.md).

## Design guidance

`web-skill` works best when you expose task-level actions instead of raw UI primitives.

Good examples:

- `findCustomer`
- `openInvoiceDraft`
- `fillPurchaseOrderForm`
- `submitCurrentApproval`

Well-designed functions should also help move the workflow to the right interface for the next step. When appropriate, a function can open the relevant screen, navigate to a draft, or return route and record identifiers that make human handoff easy.

Avoid low-level wrappers like:

- `clickSaveButton`
- `setInputValue`
- `selectTableRow`

The goal is to publish a stable, browser-callable API even when the underlying page is old, DOM-heavy, or inconsistent.

## Safety

Treat destructive actions as special cases:

- require explicit confirmation fields for submit/delete/finalize flows
- validate inputs with Zod whenever possible
- return structured results instead of relying on toast text
- avoid exposing unstable internal helpers just because they are easy to call

## Authorization guidance

`web-skill` does not enforce authorization by itself. The recommended model is for the application to decide which skill documents and runtime functions are exposed in the current session.

Typical patterns:

- only render admin-only `<link rel="web-skill" ...>` tags for admin users
- serve different skill documents for different audiences such as `/admin-only/SKILL.md` and `/user/SKILL.md`
- keep backend APIs as the final authorization boundary even if a browser skill becomes visible

If your agent flow benefits from advisory hints, prefer putting that information directly in the visible skill description or link title. For example, titles and descriptions such as `Admin-only order approval API` are often enough to help agents choose the right skill without adding new package-level permission features.

## Local development

```bash
npm install
npm run verify
```

## License

[MIT](./LICENSE)
