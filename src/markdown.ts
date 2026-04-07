import type { ZodTypeAny } from "zod";

import type { ResolvedWebSkillDefinition, ResolvedWebSkillFunctionDefinition } from "./types.ts";

const INDENT = "  ";

interface LooseZodDefinition {
  check?: string;
  checks?: unknown[];
  format?: string;
  inclusive?: boolean;
  includes?: string;
  length?: number;
  maximum?: number;
  mime?: string | string[];
  minimum?: number;
  pattern?: RegExp;
  prefix?: string;
  suffix?: string;
  value?: unknown;
  type?: string;
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
  const typeName = getSchemaKind(schema);

  switch (typeName) {
    case "ZodString":
    case "string":
      return withSchemaComment("string", schema);
    case "ZodNumber":
    case "number":
      return withSchemaComment("number", schema);
    case "ZodBoolean":
    case "boolean":
      return "boolean";
    case "ZodBigInt":
    case "bigint":
      return "bigint";
    case "ZodDate":
    case "date":
      return "Date";
    case "ZodFile":
    case "file":
      return withSchemaComment("File", schema);
    case "ZodUndefined":
    case "undefined":
      return "undefined";
    case "ZodNull":
    case "null":
      return "null";
    case "ZodVoid":
    case "void":
      return "void";
    case "ZodAny":
    case "any":
      return "any";
    case "ZodUnknown":
    case "unknown":
      return "unknown";
    case "ZodNever":
    case "never":
      return "never";
    case "ZodLiteral":
    case "literal":
      return JSON.stringify(
        definition?.value ?? (Array.isArray(definition?.values) ? definition.values[0] : undefined),
      );
    case "ZodEnum":
    case "enum":
      return Array.isArray(definition?.values)
        ? definition.values.map((value) => JSON.stringify(value)).join(" | ")
        : definition?.entries && typeof definition.entries === "object"
          ? Object.values(definition.entries)
            .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
            .map((value) => JSON.stringify(value))
            .join(" | ")
        : "string";
    case "ZodNativeEnum":
      return renderNativeEnum(
        definition?.values && typeof definition.values === "object"
          ? (definition.values as Record<string, string | number>)
          : undefined,
      );
    case "ZodArray":
    case "array":
      return `${wrapType(renderSchema((definition?.element ?? definition?.type) as unknown as ZodTypeAny, depth))}[]`;
    case "ZodOptional":
    case "optional":
      return `${renderSchema(definition?.innerType as ZodTypeAny, depth)} | undefined`;
    case "ZodNullable":
    case "nullable":
      return `${renderSchema(definition?.innerType as ZodTypeAny, depth)} | null`;
    case "ZodDefault":
    case "ZodCatch":
    case "default":
    case "catch":
      return renderSchema(definition?.innerType as ZodTypeAny, depth);
    case "ZodEffects":
    case "pipe":
      return renderSchema((definition?.schema ?? definition?.in) as ZodTypeAny, depth);
    case "ZodBranded":
      return renderSchema(definition?.type as unknown as ZodTypeAny, depth);
    case "ZodUnion":
    case "union":
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
    case "intersection":
      return `${wrapType(renderSchema(definition?.left as ZodTypeAny, depth))} & ${wrapType(renderSchema(definition?.right as ZodTypeAny, depth))}`;
    case "ZodTuple":
    case "tuple":
      return `[${Array.isArray(definition?.items)
        ? definition.items.map((item) => renderSchema(item as ZodTypeAny, depth)).join(", ")
        : ""}]`;
    case "ZodRecord":
    case "record":
      return `Record<${renderRecordKey(definition?.keyType as ZodTypeAny | undefined)}, ${renderSchema(definition?.valueType as ZodTypeAny, depth)}>`;
    case "ZodObject":
    case "object":
      return renderObjectSchema(schema, depth);
    case "ZodLazy":
    case "lazy":
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
    return `${indent(depth + 1)}${quotePropertyKey(key)}${optional ? "?" : ""}: ${appendPropertyTerminator(renderedType)}`;
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
  return typeof schema.isOptional === "function"
    ? schema.isOptional()
    : ["ZodOptional", "optional"].includes(getSchemaKind(schema));
}

function unwrapOptionalSchema(schema: ZodTypeAny): ZodTypeAny {
  const definition = getDefinition(schema);
  if (definition && ["ZodOptional", "optional"].includes(getSchemaKind(schema))) {
    return definition.innerType as ZodTypeAny;
  }

  return schema;
}

function wrapType(value: string): string {
  return /[|&\n]/u.test(value) ? `(${value})` : value;
}

function withSchemaComment(rendered: string, schema: ZodTypeAny): string {
  const comment = renderSchemaComment(schema);
  return comment ? `${rendered} // ${comment}` : rendered;
}

function appendPropertyTerminator(rendered: string): string {
  if (rendered.includes("\n")) {
    return `${rendered};`;
  }

  const commentIndex = rendered.indexOf(" // ");
  if (commentIndex === -1) {
    return `${rendered};`;
  }

  return `${rendered.slice(0, commentIndex)};${rendered.slice(commentIndex)}`;
}

function renderSchemaComment(schema: ZodTypeAny): string {
  const definition = getDefinition(schema);
  const checks = Array.isArray(definition?.checks) ? definition.checks : [];
  const parts = [renderCheckComment(definition), ...checks
    .map((check) => renderCheckComment(getDefinition(check as ZodTypeAny)))
    .filter((part): part is string => Boolean(part))]
    .filter((part): part is string => Boolean(part));

  return Array.from(new Set(parts)).join(", ");
}

function renderCheckComment(definition: LooseZodDefinition | undefined): string | undefined {
  switch (definition?.check) {
    case "min_length":
      return `minLength: ${definition.minimum}`;
    case "max_length":
      return `maxLength: ${definition.maximum}`;
    case "length_equals":
      return `length: ${definition.length}`;
    case "string_format":
      return renderStringFormatComment(definition);
    case "greater_than":
      return `${definition.inclusive ? "min" : "gt"}: ${definition.value}`;
    case "less_than":
      return `${definition.inclusive ? "max" : "lt"}: ${definition.value}`;
    case "multiple_of":
      return `multipleOf: ${definition.value}`;
    case "number_format":
      return definition.format === "safeint" ? "int" : `format: ${definition.format}`;
    case "min_size":
      return `minSize: ${definition.minimum}`;
    case "max_size":
      return `maxSize: ${definition.maximum}`;
    case "mime_type":
      return Array.isArray(definition.mime)
        ? `mime: ${definition.mime.join(" | ")}`
        : `mime: ${definition.mime}`;
    default:
      return undefined;
  }
}

function renderStringFormatComment(definition: LooseZodDefinition): string | undefined {
  switch (definition.format) {
    case "starts_with":
      return `startsWith: ${JSON.stringify(definition.prefix)}`;
    case "ends_with":
      return `endsWith: ${JSON.stringify(definition.suffix)}`;
    case "includes":
      return `includes: ${JSON.stringify(definition.includes)}`;
    case "regex":
      return `pattern: ${String(definition.pattern)}`;
    default:
      return definition.format ? `format: ${definition.format}` : undefined;
  }
}

function quotePropertyKey(value: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(value) ? value : JSON.stringify(value);
}

function indent(depth: number): string {
  return INDENT.repeat(depth);
}

function getDefinition(schema: ZodTypeAny): LooseZodDefinition | undefined {
  const zodSchema = schema as unknown as {
    _def?: LooseZodDefinition;
    def?: LooseZodDefinition;
    _zod?: {
      def?: LooseZodDefinition;
    };
  };

  return zodSchema._def ?? zodSchema.def ?? zodSchema._zod?.def;
}

function getSchemaKind(schema: ZodTypeAny): string {
  const definition = getDefinition(schema);
  const zodSchema = schema as unknown as {
    type?: string;
  };

  return definition?.typeName ?? definition?.type ?? zodSchema.type ?? "";
}

function escapeFrontmatterValue(value: string): string {
  return JSON.stringify(value);
}
