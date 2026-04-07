import type { ZodTypeAny } from "zod";

import type {
  AddWebSkillFunctionOptions,
  NewWebSkillOptions,
  ResolvedWebSkillDefinition,
  ResolvedWebSkillFunctionDefinition,
  WebSkillBuilder,
  WebSkillFunctionDefinition,
  WebSkillFunctionHandler,
  WebSkillGenerator,
  WebSkillMetadata,
  WebSkillsWindowShape,
  WebSkillWindowEntry,
  WebSkillWindowFunction,
} from "./types.ts";
import { ensureUniqueString, slugifySkillSegment, titleFromName, toSkillKey } from "./utils.ts";

interface MutableWebSkillDefinition {
  description: string | null;
  functions: WebSkillFunctionDefinition<any, any>[];
  key: string;
  name: string;
  slug: string;
  title: string;
}

class WebSkillBuilderImpl implements WebSkillBuilder {
  constructor(private readonly skill: MutableWebSkillDefinition) {}

  addFunction<TInput, TOutput>(
    func: WebSkillFunctionHandler<TInput, TOutput>,
    name: string,
    options: AddWebSkillFunctionOptions<TInput, TOutput> = {},
  ): WebSkillBuilder {
    if (typeof func !== "function") {
      throw new TypeError(`web-skill function "${name}" must be a function.`);
    }

    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new TypeError("web-skill function name must not be empty.");
    }
    if (normalizedName === "_meta") {
      throw new TypeError('web-skill function name "_meta" is reserved.');
    }

    const existing = this.skill.functions.find((definition) => definition.name === normalizedName);
    if (existing) {
      throw new Error(
        `web-skill "${this.skill.key}" already contains a function named "${normalizedName}".`,
      );
    }

    this.skill.functions.push({
      func,
      name: normalizedName,
      description: options.description?.trim() || undefined,
      inputSchema: options.inputSchema,
      outputSchema: options.outputSchema,
    });

    return this;
  }
}

class WebSkillGeneratorImpl implements WebSkillGenerator {
  private readonly skills: MutableWebSkillDefinition[] = [];
  private readonly usedKeys = new Set<string>();
  private readonly usedNames = new Set<string>();
  private readonly usedSlugs = new Set<string>();

  newSkill(options: NewWebSkillOptions = {}): WebSkillBuilder {
    const skillIndex = this.skills.length + 1;
    const fallbackName = `web-skill-${skillIndex}`;
    const requestedName = options.name?.trim();
    const requestedTitle = options.title?.trim();
    const requestedIdentifier = requestedName || requestedTitle || fallbackName;
    const requestedKeyBase = requestedName || requestedTitle || `webSkill${skillIndex}`;
    const requestedTitleBase = requestedTitle || requestedName || fallbackName;

    const slug = ensureUniqueString(slugifySkillSegment(requestedIdentifier), this.usedSlugs);
    const keyBase = toSkillKey(requestedKeyBase);
    const key = ensureUniqueString(keyBase, this.usedKeys, (index) => `${keyBase}${index + 1}`);
    const nameBase = requestedName || slug;
    const name = ensureUniqueString(nameBase, this.usedNames);
    const title = requestedTitle || titleFromName(requestedTitleBase);

    const skill: MutableWebSkillDefinition = {
      description: options.description?.trim() || null,
      functions: [],
      key,
      name,
      slug,
      title,
    };

    this.skills.push(skill);
    return new WebSkillBuilderImpl(skill);
  }

  getSkills(): ResolvedWebSkillDefinition[] {
    return this.skills.map((skill) => ({
      description: skill.description,
      key: skill.key,
      name: skill.name,
      slug: skill.slug,
      title: skill.title,
      functions: skill.functions.map<ResolvedWebSkillFunctionDefinition>((definition) => ({
        name: definition.name,
        description: definition.description ?? undefined,
        inputSchema: definition.inputSchema,
        outputSchema: definition.outputSchema,
      })),
    }));
  }

  install(target?: Window): WebSkillsWindowShape {
    const windowTarget = target ?? resolveWindowTarget();
    const registry = (windowTarget._web_skills ??= {});

    for (const skill of this.skills) {
      const entry: Partial<WebSkillWindowEntry> = {};
      const metadata: WebSkillMetadata = {
        description: skill.description,
        functions: skill.functions.map((definition) => ({
          description: definition.description ?? null,
          hasInputSchema: Boolean(definition.inputSchema),
          hasOutputSchema: Boolean(definition.outputSchema),
          name: definition.name,
        })),
        key: skill.key,
        name: skill.name,
        title: skill.title,
      };

      entry._meta = metadata;

      for (const definition of skill.functions) {
        entry[definition.name] = wrapFunction(skill.key, definition);
      }

      registry[skill.key] = entry as WebSkillWindowEntry;
    }

    return registry;
  }
}

function resolveWindowTarget(): Window {
  if (typeof window === "undefined") {
    throw new Error("web-skill install() requires a browser window target.");
  }

  return window;
}

function wrapFunction(
  skillKey: string,
  definition: WebSkillFunctionDefinition<any, any>,
): WebSkillWindowFunction {
  return async (input: unknown) => {
    const parsedInput = parseWithSchema(definition.inputSchema, input);
    const result = await definition.func(parsedInput);
    return parseWithSchema(definition.outputSchema, result);
  };
}

function parseWithSchema(schema: ZodTypeAny | undefined, value: unknown): unknown {
  if (!schema) {
    return value;
  }

  return schema.parse(normalizeValueForSchema(schema, value));
}

function normalizeValueForSchema(schema: ZodTypeAny, value: unknown): unknown {
  const definition = getDefinition(schema);
  const kind = getSchemaKind(schema);

  switch (kind) {
    case "ZodFile":
    case "file":
      return normalizeFileLikeValue(value);
    case "ZodOptional":
    case "ZodNullable":
    case "ZodDefault":
    case "ZodCatch":
    case "optional":
    case "nullable":
    case "default":
    case "catch":
      return definition?.innerType ? normalizeValueForSchema(definition.innerType as ZodTypeAny, value) : value;
    case "ZodEffects":
    case "pipe":
      return definition?.schema || definition?.in
        ? normalizeValueForSchema((definition.schema ?? definition.in) as ZodTypeAny, value)
        : value;
    case "ZodBranded":
      return definition?.type ? normalizeValueForSchema(definition.type as ZodTypeAny, value) : value;
    case "ZodArray":
    case "array":
      return Array.isArray(value) && definition?.element
        ? value.map((item) => normalizeValueForSchema(definition.element as ZodTypeAny, item))
        : value;
    case "ZodTuple":
    case "tuple":
      return normalizeTupleValue(definition, value);
    case "ZodObject":
    case "object":
      return normalizeObjectValue(definition, value);
    case "ZodRecord":
    case "record":
      return normalizeRecordValue(definition, value);
    case "ZodUnion":
    case "union":
      return normalizeUnionValue(definition, value);
    case "ZodDiscriminatedUnion":
      return normalizeDiscriminatedUnionValue(definition, value);
    case "ZodIntersection":
    case "intersection":
      return normalizeIntersectionValue(definition, value);
    case "ZodLazy":
    case "lazy":
      return typeof definition?.getter === "function"
        ? normalizeValueForSchema(definition.getter() as ZodTypeAny, value)
        : value;
    default:
      return value;
  }
}

function normalizeTupleValue(definition: LooseZodDefinition | undefined, value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  const items = Array.isArray(definition?.items) ? definition.items : [];
  return value.map((item, index) => {
    const itemSchema = (items[index] ?? definition?.rest) as ZodTypeAny | undefined;
    return itemSchema ? normalizeValueForSchema(itemSchema, item) : item;
  });
}

function normalizeObjectValue(definition: LooseZodDefinition | undefined, value: unknown): unknown {
  if (!isPlainObjectLike(value)) {
    return value;
  }

  const shapeSource = definition?.shape;
  const shape =
    typeof shapeSource === "function"
      ? (shapeSource() as Record<string, ZodTypeAny>)
      : ((shapeSource ?? {}) as Record<string, ZodTypeAny>);

  const normalized: Record<string, unknown> = { ...value };

  for (const [key, propertySchema] of Object.entries(shape)) {
    if (key in normalized) {
      normalized[key] = normalizeValueForSchema(propertySchema, normalized[key]);
    }
  }

  return normalized;
}

function normalizeRecordValue(definition: LooseZodDefinition | undefined, value: unknown): unknown {
  if (!isPlainObjectLike(value) || !definition?.valueType) {
    return value;
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    normalized[key] = normalizeValueForSchema(definition.valueType as ZodTypeAny, entryValue);
  }

  return normalized;
}

function normalizeUnionValue(definition: LooseZodDefinition | undefined, value: unknown): unknown {
  if (!Array.isArray(definition?.options)) {
    return value;
  }

  for (const option of definition.options) {
    const normalized = normalizeValueForSchema(option as ZodTypeAny, value);
    const result = (option as ZodTypeAny).safeParse(normalized);
    if (result.success) {
      return normalized;
    }
  }

  return value;
}

function normalizeDiscriminatedUnionValue(definition: LooseZodDefinition | undefined, value: unknown): unknown {
  if (!Array.isArray(definition?.options)) {
    return value;
  }

  if (definition.discriminator && isPlainObjectLike(value)) {
    const discriminatorValue = value[definition.discriminator as string];
    for (const option of definition.options) {
      const optionDefinition = getDefinition(option as ZodTypeAny);
      const shapeSource = optionDefinition?.shape;
      const shape =
        typeof shapeSource === "function"
          ? (shapeSource() as Record<string, ZodTypeAny>)
          : ((shapeSource ?? {}) as Record<string, ZodTypeAny>);
      const discriminatorSchema = shape[definition.discriminator as string];
      const literalValue = getLiteralValue(discriminatorSchema);

      if (literalValue === discriminatorValue) {
        return normalizeValueForSchema(option as ZodTypeAny, value);
      }
    }
  }

  return normalizeUnionValue(definition, value);
}

function normalizeIntersectionValue(definition: LooseZodDefinition | undefined, value: unknown): unknown {
  const leftNormalized = definition?.left
    ? normalizeValueForSchema(definition.left as ZodTypeAny, value)
    : value;

  return definition?.right
    ? normalizeValueForSchema(definition.right as ZodTypeAny, leftNormalized)
    : leftNormalized;
}

function normalizeFileLikeValue(value: unknown): unknown {
  if (isFileInstance(value)) {
    return value;
  }

  if (isBlobInstance(value)) {
    return createFile([value], "blob", value.type || "application/octet-stream");
  }

  if (typeof value === "string" && value.startsWith("data:")) {
    return fileFromDataUrl(value);
  }

  return value;
}

function fileFromDataUrl(value: string): File {
  const commaIndex = value.indexOf(",");
  if (commaIndex === -1) {
    throw new TypeError("Invalid data URL for z.file() input.");
  }

  const metadata = value.slice(5, commaIndex);
  const payload = value.slice(commaIndex + 1);
  const metadataParts = metadata.split(";");
  const mimeType = metadataParts[0] || "application/octet-stream";
  const isBase64 = metadataParts.includes("base64");

  const bytes = isBase64
    ? Uint8Array.from(atob(payload), (character) => character.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(payload));

  return createFile([bytes], "file", mimeType);
}

function createFile(bits: BlobPart[], name: string, type: string): File {
  if (typeof File === "undefined") {
    throw new Error("web-skill z.file() normalization requires global File support.");
  }

  return new File(bits, name, { type });
}

function isPlainObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !isBlobInstance(value);
}

function isBlobInstance(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function isFileInstance(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function getLiteralValue(schema: ZodTypeAny | undefined): unknown {
  if (!schema) {
    return undefined;
  }

  const definition = getDefinition(schema);
  const kind = getSchemaKind(schema);
  if (kind === "ZodLiteral" || kind === "literal") {
    return definition?.value ?? (Array.isArray(definition?.values) ? definition.values[0] : undefined);
  }

  return undefined;
}

interface LooseZodDefinition {
  discriminator?: string;
  element?: unknown;
  getter?: () => unknown;
  in?: unknown;
  innerType?: unknown;
  items?: unknown[];
  left?: unknown;
  options?: unknown[] | Map<unknown, unknown>;
  rest?: unknown;
  right?: unknown;
  schema?: unknown;
  shape?: Record<string, ZodTypeAny> | (() => Record<string, ZodTypeAny>);
  type?: unknown;
  typeName?: string;
  value?: unknown;
  values?: unknown[] | Record<string, unknown>;
  valueType?: unknown;
}

function getDefinition(schema: ZodTypeAny): LooseZodDefinition | undefined {
  const zodSchema = schema as unknown as {
    _def?: LooseZodDefinition;
    def?: LooseZodDefinition;
  };

  return zodSchema._def ?? zodSchema.def;
}

function getSchemaKind(schema: ZodTypeAny): string {
  const definition = getDefinition(schema);
  const zodSchema = schema as unknown as {
    type?: string;
  };

  return definition?.typeName ?? String(definition?.type ?? zodSchema.type ?? "");
}

export function createWebSkillGenerator(): WebSkillGenerator {
  return new WebSkillGeneratorImpl();
}

declare global {
  interface Window {
    _web_skills?: WebSkillsWindowShape;
  }
}
