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
