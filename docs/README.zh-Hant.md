# web-skill

[English README](../README.md)

透過 Web UI 連接人與 agents。

## 願景

AI 代理正變得越來越強大，但在許多真實世界的工作流程中，它們仍然像黑盒一樣運作，缺乏透明度，也缺少讓人類驗證、引導或介入的機會。

Web 本身已經是人們熟悉且信任的介面，因此它是連接人類工作流程與代理工作流程最自然的橋樑。

然而，傳統以 DOM 為核心的瀏覽器自動化，對代理而言仍然是一個不理想的介面：速度慢、成本高，而且不可靠。

`web-skill` 以改變此限制為目標，讓代理的工作更透明、更可中斷，並且更容易在人類與代理之間交接，使 AI 能更安全地參與複雜且關鍵的業務流程。

## 運作方式

`web-skill` 讓 Web 應用把任務層級的 automation API 發布給 agents 與瀏覽器工具。

透過同一份設定，它可以：

- 在 `window._web_skills` 之下註冊函式
- 為每個 skill 生成一份 `SKILL.md`
- 透過 Vite 把 `<link rel="web-skill" ...>` 標籤注入到 HTML `<head>`

入口會按用途分開：

- `web-skill` 用於 browser/runtime API
- `web-skill/vite` 用於 Vite plugin
- `web-skill/dev` 用於 markdown 生成與其他 build-time helper

這個 package 以 TypeScript 為優先，最適合已經使用 Vite 與 Zod 的應用。

## 安裝

```bash
npm install web-skill zod
```

如果你的專案也想使用 Vite plugin：

```bash
npm install vite
```

## 範例

- [`examples/request-workbench`](../examples/request-workbench/)：純前端 React + Zustand mock，示範如何列出既有資料、建立新 draft，並透過 `web-skill` 暴露兩條流程
- [`examples/checkout-desk`](../examples/checkout-desk/)：只有本地 React state 的三步 checkout form，示範 `prepareCheckout` skill 一樣可以驅動傳統 DOM 形態工作流程

checkout 範例係刻意做得比較樸素，想示範就算網站只係一般 form flow、具名欄位同 submit button，`web-skill` 仍然有用，唔一定要先有完整 agent-native 架構。

## Agent 設定

在 agent 端，先安裝或載入 [`use-web-skill`](../skills/use-web-skill/SKILL.md)。它會提供一條簡單的 discovery workflow：先檢查頁面 `<head>`、尋找 `<link rel="web-skill">`、讀取相關 `SKILL.md`，再優先使用頁面已公開的 task-level workflow。

## 快速開始

建立一個 generator，把它接到你已經信任的應用動作上，然後在啟動時安裝：

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

這會暴露出以下可由瀏覽器呼叫的函式：

```js
window._web_skills.erpProcurement.findSupplierItem(input)
window._web_skills.erpProcurement.createPurchaseOrderDraft(input)
window._web_skills.erpProcurement.submitPurchaseRequisition(input)
window._web_skills.erpProcurement._meta
```

## Vite 整合

對同一個 generator instance 使用 Vite plugin：

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

在 dev/build 階段，plugin 會：

- 為每個 skill 生成 `/skills/<skill-slug>/SKILL.md`
- 在 Vite dev server 中提供這些 markdown
- 在 build 時把這些 markdown 當成資產輸出
- 在 HTML `<head>` 中注入每個 skill 對應的 `<link rel="web-skill" ...>` 標籤

## 會生成什麼

每份生成的 `SKILL.md` 都會包含：

- skill 標題
- `window._web_skills.<skillKey>` 之下的 console entrypoint
- 每個 function 的獨立段落
- 輸入與輸出 schema 的摘要

## API 參考

如果你想看 exported surface、預期行為與常見 runtime errors，可參考 [`api.md`](./api.md)。

## 設計建議

`web-skill` 最適合暴露任務層級的動作，而不是原始 UI 操作。

較好的例子：

- `findCustomer`
- `openInvoiceDraft`
- `fillPurchaseOrderForm`
- `submitCurrentApproval`

應避免這種低階包裝：

- `clickSaveButton`
- `setInputValue`
- `selectTableRow`

目標是提供一組穩定、可由瀏覽器呼叫的 API，就算底層頁面本身是老舊、DOM-heavy 或不一致的，也能讓 agents 穩定使用。

## 安全性

對破壞性或不可逆的動作，請特別小心：

- 對 submit/delete/finalize 類流程加入明確確認欄位
- 盡可能用 Zod 驗證輸入
- 回傳結構化結果，而不是只依賴 toast 文字
- 不要因為某些 internal helper 容易呼叫，就直接暴露出去

## 權限建議

`web-skill` 本身不會強制處理 authorization。建議由應用本身決定在目前 session 中要暴露哪些 skill 文件與 runtime functions。

常見做法：

- 只對 admin 使用者輸出 admin-only 的 `<link rel="web-skill" ...>` 標籤
- 針對不同受眾提供不同 skill 文件，例如 `/admin-only/SKILL.md` 與 `/user/SKILL.md`
- 就算某個 browser skill 被看見，仍然由 backend API 作為最後授權邊界

如果你的 agent 流程需要提示資訊，建議直接把它寫在可見的 skill description 或 link title 裡。像 `Admin-only order approval API` 這類標題或描述，通常已足夠讓 agent 在不引入新 permission feature 的情況下作出較合理的選擇。

## 本地開發

```bash
npm install
npm run verify
```

## 授權

[MIT](../LICENSE)
