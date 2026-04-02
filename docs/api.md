# API Reference

`web-skill` exposes a small public API surface on purpose. The package is split into separate entry points so runtime code, Vite integration, and build-time helpers stay easy to reason about.

## Entry points

- `web-skill`: runtime generator and browser-facing types
- `web-skill/vite`: Vite plugin integration
- `web-skill/dev`: markdown generation and other build-time helpers

## `createWebSkillGenerator()`

Creates a generator instance that owns one or more skills.

Returned methods:

- `newSkill(options?)`
- `getSkills()`
- `install(target?)`

## `newSkill(options?)`

Creates one logical skill definition.

Options:

- `name?: string`
- `title?: string`
- `description?: string`

Behavior:

- `name` is the stable identifier when supplied
- `title` is the human-facing label shown to agents
- duplicate names, keys, and slugs are automatically disambiguated
- omitted values fall back to generated names such as `web-skill-1`

## `skill.addFunction(func, name, options?)`

Registers one task-level function under the current skill.

Arguments:

- `func`: `(input) => output | Promise<output>`
- `name`: string
- `options?.description`
- `options?.inputSchema`
- `options?.outputSchema`

Runtime guarantees:

- empty names are rejected
- `_meta` is reserved
- duplicate function names within a skill are rejected
- `inputSchema` and `outputSchema` are enforced with Zod when provided

## `generator.install(target?)`

Registers all configured skills under `window._web_skills`, or under the provided `target` object.

Generated shape:

```ts
window._web_skills.<skillKey>.<functionName>(input)
window._web_skills.<skillKey>._meta
```

If `target` is omitted outside a browser environment, `install()` throws.

## `generator.getSkills()`

Returns the normalized skill metadata used by both the runtime and markdown generation helpers.

Each skill includes:

- `key`
- `name`
- `slug`
- `title`
- `description`
- `functions`

## `generateSkillMarkdown(skill)` from `web-skill/dev`

Renders one normalized skill definition into a `SKILL.md` document suitable for serving or emitting as a build asset.

## `renderZodSchema(schema)` from `web-skill/dev`

Converts a Zod schema into a compact TypeScript-like summary string for documentation output.

## `buildWebSkillLinkTags(skills, basePath?)` from `web-skill/dev`

Creates the `<link rel="web-skill" ...>` metadata records used by the Vite plugin and any custom integrations.

Return shape:

```ts
{
  href: string;
  title: string;
  type: "text/markdown";
}
```

## `webSkillVitePlugin(options)` from `web-skill/vite`

Vite integration that:

- serves generated `SKILL.md` files during local development
- emits `skills/<slug>/SKILL.md` assets during build
- injects `<link rel="web-skill">` tags into transformed HTML

Options:

- `generator: WebSkillGenerator`
- `publicBasePath?: string`

## Error behavior

Common synchronous errors:

- `web-skill function name must not be empty.`
- `web-skill function name "_meta" is reserved.`
- `web-skill "<key>" already contains a function named "<name>".`
- `web-skill install() requires a browser window target.`

Schema validation errors are surfaced directly from Zod.
