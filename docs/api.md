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
- `z.file()` inputs and outputs accept `File`, `Blob`, and `data:` URL strings; runtime normalization converts them to `File` before Zod parsing

### `z.file()` normalization

When a function input or output schema includes `z.file()`, `web-skill` normalizes file-like values before calling `schema.parse(...)`.

Accepted values:

- `File`: passed through unchanged
- `Blob`: wrapped as `new File([blob], "blob", { type: blob.type || "application/octet-stream" })`
- `data:` URL string: decoded and wrapped as `new File([...], "file", { type: <data-url mime> })`

This normalization is schema-aware and applies recursively inside common container schemas such as:

- `z.object(...)`
- `z.array(...)`
- `z.record(...)`
- `z.union(...)`
- `z.discriminatedUnion(...)`
- `z.tuple(...)`
- `z.intersection(...)`
- wrappers such as `optional`, `nullable`, `default`, `catch`, `pipe`, `lazy`, and branded schemas

Important limits:

- `web-skill` does not read arbitrary local files from the user's machine
- plain strings are only treated as files when they are `data:` URLs
- if the runtime does not provide a global `File` constructor, `z.file()` normalization throws

Typical browser-side pattern:

1. Obtain a `File`, `Blob`, or `data:` URL inside the page runtime.
2. Call the published `web-skill` function with that value.
3. Let the page-side handler place the resulting `File` into a file input with `DataTransfer` if needed.

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

Behavior notes:

- primitive and file schemas with extra restrictions render inline comments next to the base type
- common checks such as string format, min/max length, numeric min/max, integer format, file size, and MIME restrictions are summarized as `/* ... */`

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
