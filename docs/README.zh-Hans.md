# web-skill

[English README](../README.md)

透过 Web UI 连接人与 agents。

## 愿景

AI 代理正变得越来越强大，但在许多真实世界的工作流程中，它们仍然像黑盒一样运作，缺乏透明度，也缺少让人类验证丶引导或介入的机会。

Web 本身已经是人们熟悉且信任的介面，因此它是连接人类工作流程与代理工作流程最自然的桥梁。

然而，传统以 DOM 为核心的浏览器自动化，对代理而言仍然是一个不理想的介面：速度慢丶成本高，而且不可靠。

`web-skill` 以改变此限制为目标，让代理的工作更透明丶更可中断，并且更容易在人类与代理之间交接，使 AI 能更安全地参与复杂且关键的业务流程。

## 运作方式

`web-skill` 让 Web 应用把任务层级的 automation API 发布给 agents 与浏览器工具。

透过同一份设定，它可以：

- 在 `window._web_skills` 之下注册函式
- 为每个 skill 生成一份 `SKILL.md`
- 透过 Vite 把 `<link rel="web-skill" ...>` 标签注入到 HTML `<head>`

入口会按用途分开：

- `web-skill` 用於 browser/runtime API
- `web-skill/vite` 用於 Vite plugin
- `web-skill/dev` 用於 markdown 生成与其他 build-time helper

这个 package 以 TypeScript 为优先，最适合已经使用 Vite 与 Zod 的应用。

## 安装

```bash
npm install web-skill zod
```

如果你的专案也想使用 Vite plugin：

```bash
npm install vite
```

## 范例

- [`examples/request-workbench`](../examples/request-workbench/)：纯前端 React + Zustand mock，示范如何列出既有资料丶建立新 draft，并透过 `web-skill` 暴露两条流程
- [`examples/checkout-desk`](../examples/checkout-desk/)：只有本地 React state 的三步 checkout form，示范 `prepareCheckout` skill 一样可以驱动传统 DOM 形态工作流程

checkout 范例系刻意做得比较朴素，想示范就算网站只系一般 form flow丶具名栏位同 submit button，`web-skill` 仍然有用，唔一定要先有完整 agent-native 架构。

## Agent 设定

在 agent 端，先安装或载入 [`use-web-skill`](../skills/use-web-skill/SKILL.md)。它会提供一条简单的 discovery workflow：先检查页面 `<head>`丶寻找 `<link rel="web-skill">`丶读取相关 `SKILL.md`，再优先使用页面已公开的 task-level workflow。

## 快速开始

建立一个 generator，把它接到你已经信任的应用动作上，然後在启动时安装：

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

这会暴露出以下可由浏览器呼叫的函式：

```js
window._web_skills.erpProcurement.findSupplierItem(input)
window._web_skills.erpProcurement.createPurchaseOrderDraft(input)
window._web_skills.erpProcurement.submitPurchaseRequisition(input)
window._web_skills.erpProcurement._meta
```

## Vite 整合

对同一个 generator instance 使用 Vite plugin：

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

在 dev/build 阶段，plugin 会：

- 为每个 skill 生成 `/skills/<skill-slug>/SKILL.md`
- 在 Vite dev server 中提供这些 markdown
- 在 build 时把这些 markdown 当成资产输出
- 在 HTML `<head>` 中注入每个 skill 对应的 `<link rel="web-skill" ...>` 标签

## 会生成什麽

每份生成的 `SKILL.md` 都会包含：

- skill 标题
- `window._web_skills.<skillKey>` 之下的 console entrypoint
- 每个 function 的独立段落
- 输入与输出 schema 的摘要

## API 参考

如果你想看 exported surface丶预期行为与常见 runtime errors，可参考 [`api.md`](./api.md)。

## 设计建议

`web-skill` 最适合暴露任务层级的动作，而不是原始 UI 操作。

较好的例子：

- `findCustomer`
- `openInvoiceDraft`
- `fillPurchaseOrderForm`
- `submitCurrentApproval`

应避免这种低阶包装：

- `clickSaveButton`
- `setInputValue`
- `selectTableRow`

目标是提供一组稳定丶可由浏览器呼叫的 API，就算底层页面本身是老旧丶DOM-heavy 或不一致的，也能让 agents 稳定使用。

## 安全性

对破坏性或不可逆的动作，请特别小心：

- 对 submit/delete/finalize 类流程加入明确确认栏位
- 尽可能用 Zod 验证输入
- 回传结构化结果，而不是只依赖 toast 文字
- 不要因为某些 internal helper 容易呼叫，就直接暴露出去

## 权限建议

`web-skill` 本身不会强制处理 authorization。建议由应用本身决定在目前 session 中要暴露哪些 skill 文件与 runtime functions。

常见做法：

- 只对 admin 使用者输出 admin-only 的 `<link rel="web-skill" ...>` 标签
- 针对不同受众提供不同 skill 文件，例如 `/admin-only/SKILL.md` 与 `/user/SKILL.md`
- 就算某个 browser skill 被看见，仍然由 backend API 作为最後授权边界

如果你的 agent 流程需要提示资讯，建议直接把它写在可见的 skill description 或 link title 里。像 `Admin-only order approval API` 这类标题或描述，通常已足够让 agent 在不引入新 permission feature 的情况下作出较合理的选择。

## 本地开发

```bash
npm install
npm run verify
```

## 授权

[MIT](../LICENSE)
