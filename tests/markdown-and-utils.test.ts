import assert from "node:assert/strict";
import test from "node:test";

import { z } from "zod";

import {
  buildWebSkillLinkTags,
  generateSkillMarkdown,
  renderZodSchema,
} from "../dist/dev.js";

test("renderZodSchema prints nested objects, enums, arrays, and optionals", () => {
  const schema = z.object({
    itemId: z.string(),
    status: z.enum(["draft", "submitted"]),
    tags: z.array(z.string()),
    comment: z.string().optional(),
  });

  assert.equal(
    renderZodSchema(schema),
    [
      "{",
      "  itemId: string;",
      "  status: \"draft\" | \"submitted\";",
      "  tags: string[];",
      "  comment?: string;",
      "}",
    ].join("\n"),
  );
});

test("generateSkillMarkdown emits frontmatter, entrypoint, and schema sections", () => {
  const markdown = generateSkillMarkdown({
    description: "Use this skill for procurement lookups.",
    functions: [
      {
        description: "Look up one supplier item.",
        inputSchema: z.object({
          keyword: z.string().min(1),
        }),
        name: "findSupplierItem",
        outputSchema: z.array(
          z.object({
            itemId: z.string(),
          }),
        ),
      },
    ],
    key: "erpProcurement",
    name: "erp-procurement",
    slug: "erp-procurement",
    title: "ERP procurement API",
  });

  assert.match(markdown, /^---\nname: erp-procurement\n/u);
  assert.match(markdown, /window\._web_skills\.erpProcurement/u);
  assert.match(markdown, /## `findSupplierItem\(input\)`/u);
  assert.match(markdown, /Purpose: Look up one supplier item\./u);
  assert.match(markdown, /keyword: string;/u);
  assert.equal(markdown.includes("({\n  itemId: string;\n})[]"), true);
});

test("link tags respect base paths and use generated skill markdown locations", () => {
  const tags = buildWebSkillLinkTags(
    [
      {
        description: null,
        functions: [],
        key: "erpProcurement",
        name: "erp-procurement",
        slug: "erp-procurement",
        title: "ERP procurement API",
      },
    ],
    "/console/",
  );

  assert.deepEqual(tags, [
    {
      href: "/console/skills/erp-procurement/SKILL.md",
      title: "ERP procurement API",
      type: "text/markdown",
    },
  ]);
});
