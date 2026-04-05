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

test("renderZodSchema supports zod v4-style schema metadata exposed through def.type", () => {
  const schema = {
    def: {
      shape: {
        itemId: {
          def: { type: "string" },
          type: "string",
        },
        comment: {
          def: {
            innerType: {
              def: { type: "string" },
              type: "string",
            },
            type: "optional",
          },
          type: "optional",
        },
      },
      type: "object",
    },
    type: "object",
  } as unknown as z.ZodTypeAny;

  assert.equal(
    renderZodSchema(schema),
    [
      "{",
      "  itemId: string;",
      "  comment?: string;",
      "}",
    ].join("\n"),
  );
});

enum DeliveryState {
  Pending = "pending",
  Sent = "sent",
}

test("renderZodSchema prints unions, tuples, records, native enums, and nested arrays", () => {
  const schema = z.object({
    deliveryState: z.nativeEnum(DeliveryState),
    lineItems: z.array(
      z.object({
        quantity: z.number(),
        sku: z.string(),
      }),
    ),
    metadata: z.record(z.string(), z.union([z.string(), z.number()])),
    result: z.discriminatedUnion("kind", [
      z.object({
        invoiceId: z.string(),
        kind: z.literal("invoice"),
      }),
      z.object({
        kind: z.literal("receipt"),
        receiptNumber: z.number(),
      }),
    ]),
    tupleValue: z.tuple([z.string(), z.number()]),
  });

  assert.equal(
    renderZodSchema(schema),
    [
      "{",
      "  deliveryState: \"pending\" | \"sent\";",
      "  lineItems: ({",
      "    quantity: number;",
      "    sku: string;",
      "  })[];",
      "  metadata: Record<string, string | number>;",
      "  result: ({",
      "    invoiceId: string;",
      "    kind: \"invoice\";",
      "  }) | ({",
      "    kind: \"receipt\";",
      "    receiptNumber: number;",
      "  });",
      "  tupleValue: [string, number];",
      "}",
    ].join("\n"),
  );
});

test("renderZodSchema prints file schemas as File", () => {
  assert.equal(renderZodSchema(z.file()), "File");
});

test("renderZodSchema prints inline comments for string, number, and file restrictions", () => {
  const schema = z.object({
    amount: z.number().int().min(1).max(10),
    attachment: z.file().min(10).max(100).mime(["image/png", "image/jpeg"]),
    email: z.string().email().min(5).max(50),
  });

  assert.equal(
    renderZodSchema(schema),
    [
      "{",
      "  amount: number; // int, min: 1, max: 10",
      "  attachment: File; // minSize: 10, maxSize: 100, mime: image/png | image/jpeg",
      "  email: string; // format: email, minLength: 5, maxLength: 50",
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
  assert.match(markdown, /keyword: string; \/\/ minLength: 1/u);
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
