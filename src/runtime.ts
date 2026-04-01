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

  return schema.parse(value);
}

export function createWebSkillGenerator(): WebSkillGenerator {
  return new WebSkillGeneratorImpl();
}

declare global {
  interface Window {
    _web_skills?: WebSkillsWindowShape;
  }
}
