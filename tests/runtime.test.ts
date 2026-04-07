import assert from "node:assert/strict";
import test from "node:test";

import { z } from "zod";

import { createWebSkillGenerator } from "../dist/index.js";

test("generator installs validated functions into a browser-like window", async () => {
  const generator = createWebSkillGenerator();
  const skill = generator.newSkill({
    name: "erpProcurement",
    title: "ERP procurement API",
    description: "Expose procurement actions.",
  });

  const inputSchema = z.object({
    quantity: z.number().int().positive(),
  });
  const outputSchema = z.object({
    total: z.number(),
  });

  skill.addFunction(
    async (input) => ({
      total: input.quantity * 2,
    }),
    "quoteLine",
    {
      description: "Quote one line item.",
      inputSchema,
      outputSchema,
    },
  );

  const fakeWindow = {} as Window;
  const registry = generator.install(fakeWindow);
  const skills = generator.getSkills();

  assert.equal(skills.length, 1);
  assert.equal(skills[0]?.key, "erpProcurement");
  assert.equal(skills[0]?.name, "erpProcurement");
  assert.equal(skills[0]?.slug, "erpprocurement");
  assert.equal(skills[0]?.title, "ERP procurement API");
  assert.equal(skills[0]?.functions[0]?.name, "quoteLine");
  assert.equal(skills[0]?.functions[0]?.description, "Quote one line item.");
  assert.equal(skills[0]?.functions[0]?.inputSchema, inputSchema);
  assert.equal(skills[0]?.functions[0]?.outputSchema, outputSchema);

  assert.equal(typeof registry.erpProcurement?.quoteLine, "function");
  assert.deepEqual(registry.erpProcurement?._meta, {
    description: "Expose procurement actions.",
    functions: [
      {
        description: "Quote one line item.",
        hasInputSchema: true,
        hasOutputSchema: true,
        name: "quoteLine",
      },
    ],
    key: "erpProcurement",
    name: "erpProcurement",
    title: "ERP procurement API",
  });

  const result = await registry.erpProcurement!.quoteLine({
    quantity: 4,
  });
  assert.deepEqual(result, {
    total: 8,
  });

  await assert.rejects(
    registry.erpProcurement!.quoteLine({
      quantity: 0,
    }),
  );
});

test("generator creates unique fallback names, keys, and slugs", () => {
  const generator = createWebSkillGenerator();

  generator.newSkill({
    title: "Sales Console",
  });
  generator.newSkill({
    title: "Sales Console",
  });

  assert.deepEqual(
    generator.getSkills().map((skill) => ({
      key: skill.key,
      name: skill.name,
      slug: skill.slug,
      title: skill.title,
    })),
    [
      {
        key: "salesConsole",
        name: "sales-console",
        slug: "sales-console",
        title: "Sales Console",
      },
      {
        key: "salesConsole2",
        name: "sales-console-2",
        slug: "sales-console-2",
        title: "Sales Console",
      },
    ],
  );
});

test("generator normalizes blob, file, and data URL values for z.file() inputs", async () => {
  const generator = createWebSkillGenerator();
  const skill = generator.newSkill({
    name: "assetDesk",
    title: "Asset desk API",
  });

  skill.addFunction(
    async (input) => ({
      file: input.file,
      mimeType: input.file.type,
      name: input.file.name,
      text: await input.file.text(),
    }),
    "prepareUpload",
    {
      inputSchema: z.object({
        file: z.file(),
      }),
      outputSchema: z.object({
        file: z.file(),
        mimeType: z.string(),
        name: z.string(),
        text: z.string(),
      }),
    },
  );

  const fakeWindow = {} as Window;
  const registry = generator.install(fakeWindow);

  const blobResult = await registry.assetDesk!.prepareUpload({
    file: new Blob(["hello blob"], { type: "text/plain" }),
  });
  assert.ok(blobResult.file instanceof File);
  assert.equal(blobResult.file.name, "blob");
  assert.equal(blobResult.mimeType, "text/plain");
  assert.equal(blobResult.text, "hello blob");

  const providedFile = new File(["hello file"], "note.txt", { type: "text/plain" });
  const fileResult = await registry.assetDesk!.prepareUpload({
    file: providedFile,
  });
  assert.equal(fileResult.file, providedFile);
  assert.equal(fileResult.name, "note.txt");
  assert.equal(fileResult.text, "hello file");

  const dataUrlResult = await registry.assetDesk!.prepareUpload({
    file: "data:text/plain;base64,aGVsbG8gZGF0YSB1cmw=",
  });
  assert.ok(dataUrlResult.file instanceof File);
  assert.equal(dataUrlResult.file.name, "file");
  assert.equal(dataUrlResult.mimeType, "text/plain");
  assert.equal(dataUrlResult.text, "hello data url");
});
