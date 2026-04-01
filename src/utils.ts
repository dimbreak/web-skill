import type { ResolvedWebSkillDefinition, WebSkillLinkTag } from "./types.ts";

const NON_ALPHANUMERIC_PATTERN = /[^a-zA-Z0-9]+/gu;
const TRIM_DASHES_PATTERN = /^-+|-+$/gu;
const CAMEL_BOUNDARY_PATTERN = /[-_\s]+([a-zA-Z0-9])/gu;
const NON_IDENTIFIER_PATTERN = /[^a-zA-Z0-9_$]/gu;
const LEADING_INVALID_IDENTIFIER_PATTERN = /^[^a-zA-Z_$]+/u;

export function slugifySkillSegment(value: string): string {
  const normalized = value
    .trim()
    .replace(NON_ALPHANUMERIC_PATTERN, "-")
    .replace(TRIM_DASHES_PATTERN, "")
    .toLowerCase();

  return normalized || "web-skill";
}

export function toSkillKey(value: string): string {
  const identifier = value
    .trim()
    .replace(CAMEL_BOUNDARY_PATTERN, (_match, character: string) => character.toUpperCase())
    .replace(NON_IDENTIFIER_PATTERN, "")
    .replace(LEADING_INVALID_IDENTIFIER_PATTERN, "");

  if (!identifier) {
    return "webSkill";
  }

  return identifier[0]!.toLowerCase() + identifier.slice(1);
}

export function titleFromName(value: string): string {
  const normalized = value
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/[-_]+/gu, " ")
    .trim();

  if (!normalized) {
    return "Web Skill";
  }

  return normalized
    .split(/\s+/u)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

export function ensureUniqueString(
  value: string,
  used: Set<string>,
  formatter: (index: number) => string = (index) => `${value}-${index + 1}`,
): string {
  if (!used.has(value)) {
    used.add(value);
    return value;
  }

  let index = 1;
  while (true) {
    const nextValue = formatter(index);
    if (!used.has(nextValue)) {
      used.add(nextValue);
      return nextValue;
    }
    index += 1;
  }
}

export function joinBasePath(basePath: string | undefined, relativePath: string): string {
  const normalizedBase = (basePath ?? "/").trim();
  const base = normalizedBase === "/" ? "" : `/${normalizedBase.replace(/^\/+|\/+$/gu, "")}`;
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${base}${path}`;
}

export function toSkillMarkdownAssetPath(skill: ResolvedWebSkillDefinition): string {
  return `/skills/${skill.slug}/SKILL.md`;
}

export function buildWebSkillLinkTags(
  skills: ResolvedWebSkillDefinition[],
  basePath?: string,
): WebSkillLinkTag[] {
  return skills.map((skill) => ({
    href: joinBasePath(basePath, toSkillMarkdownAssetPath(skill)),
    title: skill.title,
    type: "text/markdown",
  }));
}
