# web-skill

`web-skill` helps a web app publish task-level automation APIs for agents and browser tooling.

From one shared config it can:

- register functions under `window._web_skills`
- generate one `SKILL.md` file per published skill
- inject `<link rel="web-skill" ...>` tags into the HTML `<head>` through Vite

The package is source-first and works best in TypeScript apps that already use Vite and Zod.

## Install

```bash
npm install web-skill zod
```

If you want the Vite plugin in your own project:

```bash
npm install vite
```

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
import { webSkillVitePlugin } from "web-skill";
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

## Design guidance

`web-skill` works best when you expose task-level actions instead of raw UI primitives.

Good examples:

- `findCustomer`
- `openInvoiceDraft`
- `fillPurchaseOrderForm`
- `submitCurrentApproval`

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

## Local development

```bash
npm install
npm run check
```

## License

[MIT](./LICENSE)
