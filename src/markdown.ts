import type { ZodTypeAny } from "zod";

import type { ResolvedWebSkillDefinition, ResolvedWebSkillFunctionDefinition } from "./types.ts";

const INDENT = "  ";

interface LooseZodDefinition {
  typeName?: string;
  [key: string]: unknown;
}

export function generateSkillMarkdown(skill: ResolvedWebSkillDefinition): string {
  const description =
    skill.description
    ?? `Expose browser-callable functions under \`window._web_skills.${skill.key}\`.`;

  const lines: string[] = [
    "---",
    `name: ${skill.slug}`,
    `description: ${escapeFrontmatterValue(description)}`,
    "---",
    "",
    `# ${skill.title}`,
    "",
    "Use the browser console entrypoint:",
    "",
    "```js",
    `window._web_skills.${skill.key}`,
    "```",
    "",
    "Available functions:",
    "",
  ];

  for (const definition of skill.functions) {
    lines.push(...renderFunctionSection(skill, definition), "");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderFunctionSection(
  skill: ResolvedWebSkillDefinition,
  definition: ResolvedWebSkillFunctionDefinition,
): string[] {
  const inputSchema = definition.inputSchema ? renderZodSchema(definition.inputSchema) : "unknown";
  const outputSchema = definition.outputSchema ? renderZodSchema(definition.outputSchema) : "unknown";

  return [
    `## \`${definition.name}(input)\``,
    "",
    `Purpose: ${definition.description ?? `Invoke \`window._web_skills.${skill.key}.${definition.name}(input)\`.`}`,
    "",
    "Input:",
    "",
    "```ts",
    inputSchema,
    "```",
    "",
    "Output:",
    "",
    "```ts",
    outputSchema,
    "```",
  ];
}

export function renderZodSchema(schema: ZodTypeAny): string {
  return renderSchema(schema, 0);
}

function renderSchema(schema: ZodTypeAny, depth: number): string {
  const definition = getDefinition(schema);
  const typeName = definition?.typeName;

  switch (typeName) {
    case "ZodString":
      return "string";
    case "ZodNumber":
      return "number";
    case "ZodBoolean":
      return "boolean";
    case "ZodBigInt":
      return "bigint";
    case "ZodDate":
      return "Date";
    case "ZodUndefined":
      return "undefined";
    case "ZodNull":
      return "null";
    case "ZodVoid":
      return "void";
    case "ZodAny":
      return "any";
    case "ZodUnknown":
      return "unknown";
    case "ZodNever":
      return "never";
    case "ZodLiteral":
      return JSON.stringify(definition?.value);
    case "ZodEnum":
      return Array.isArray(definition?.values)
        ? definition.values.map((value) => JSON.stringify(value)).join(" | ")
        : "string";
    case "ZodNativeEnum":
      return renderNativeEnum(
        definition?.values && typeof definition.values === "object"
          ? (definition.values as Record<string, string | number>)
          : undefined,
      );
    case "ZodArray":
      return `${wrapType(renderSchema(definition?.type as ZodTypeAny, depth))}[]`;
    case "ZodOptional":
      return `${renderSchema(definition?.innerType as ZodTypeAny, depth)} | undefined`;
    case "ZodNullable":
      return `${renderSchema(definition?.innerType as ZodTypeAny, depth)} | null`;
    case "ZodDefault":
    case "ZodCatch":
      return renderSchema(definition?.innerType as ZodTypeAny, depth);
    case "ZodEffects":
      return renderSchema(definition?.schema as ZodTypeAny, depth);
    case "ZodBranded":
      return renderSchema(definition?.type as ZodTypeAny, depth);
    case "ZodUnion":
      return Array.isArray(definition?.options)
        ? definition.options.map((option) => wrapType(renderSchema(option as ZodTypeAny, depth))).join(" | ")
        : "unknown";
    case "ZodDiscriminatedUnion":
      return Array.from(
        definition?.options instanceof Map ? definition.options.values() : [],
      )
        .map((option) => wrapType(renderSchema(option as ZodTypeAny, depth)))
        .join(" | ");
    case "ZodIntersection":
      return `${wrapType(renderSchema(definition?.left as ZodTypeAny, depth))} & ${wrapType(renderSchema(definition?.right as ZodTypeAny, depth))}`;
    case "ZodTuple":
      return `[${Array.isArray(definition?.items)
        ? definition.items.map((item) => renderSchema(item as ZodTypeAny, depth)).join(", ")
        : ""}]`;
    case "ZodRecord":
      return `Record<${renderRecordKey(definition?.keyType as ZodTypeAny | undefined)}, ${renderSchema(definition?.valueType as ZodTypeAny, depth)}>`;
    case "ZodObject":
      return renderObjectSchema(schema, depth);
    case "ZodLazy":
      return typeof definition?.getter === "function"
        ? renderSchema(definition.getter() as ZodTypeAny, depth)
        : "unknown";
    default:
      return "unknown";
  }
}

function renderObjectSchema(schema: ZodTypeAny, depth: number): string {
  const definition = getDefinition(schema);
  const shapeSource = definition?.shape;
  const shape =
    typeof shapeSource === "function"
      ? (shapeSource() as Record<string, ZodTypeAny>)
      : ((shapeSource ?? {}) as Record<string, ZodTypeAny>);
  const entries = Object.entries(shape);

  if (entries.length === 0) {
    return "{}";
  }

  const propertyLines = entries.map(([key, propertySchema]) => {
    const optional = isOptionalSchema(propertySchema);
    const renderedType = renderSchema(optional ? unwrapOptionalSchema(propertySchema) : propertySchema, depth + 1);
    return `${indent(depth + 1)}${quotePropertyKey(key)}${optional ? "?" : ""}: ${renderedType};`;
  });

  return ["{", ...propertyLines, `${indent(depth)}}`].join("\n");
}

function renderNativeEnum(values: Record<string, string | number> | undefined): string {
  if (!values) {
    return "string | number";
  }

  const rendered = Array.from(
    new Set(
      Object.values(values).filter(
        (value): value is string | number => typeof value === "string" || typeof value === "number",
      ),
    ),
  );

  return rendered.map((value) => JSON.stringify(value)).join(" | ") || "string | number";
}

function renderRecordKey(keyType: ZodTypeAny | undefined): string {
  if (!keyType) {
    return "string";
  }

  return renderSchema(keyType, 0);
}

function isOptionalSchema(schema: ZodTypeAny): boolean {
  return typeof schema.isOptional === "function" ? schema.isOptional() : getDefinition(schema)?.typeName === "ZodOptional";
}

function unwrapOptionalSchema(schema: ZodTypeAny): ZodTypeAny {
  const definition = getDefinition(schema);
  if (definition?.typeName === "ZodOptional") {
    return definition.innerType as ZodTypeAny;
  }

  return schema;
}

function wrapType(value: string): string {
  return /[|&\n]/u.test(value) ? `(${value})` : value;
}

function quotePropertyKey(value: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(value) ? value : JSON.stringify(value);
}

function indent(depth: number): string {
  return INDENT.repeat(depth);
}

function getDefinition(schema: ZodTypeAny): LooseZodDefinition | undefined {
  return (schema as unknown as { _def?: LooseZodDefinition })._def;
}

function escapeFrontmatterValue(value: string): string {
  return JSON.stringify(value);
}
