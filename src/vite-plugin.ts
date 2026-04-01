import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin, ResolvedConfig } from "vite";

import { generateSkillMarkdown } from "./markdown.ts";
import type { ResolvedWebSkillDefinition, WebSkillVitePluginOptions } from "./types.ts";
import { buildWebSkillLinkTags } from "./utils.ts";

export function webSkillVitePlugin(options: WebSkillVitePluginOptions): Plugin {
  let resolvedConfig: ResolvedConfig | null = null;

  return {
    name: "web-skill",

    configResolved(config): void {
      resolvedConfig = config;
    },

    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!resolvedConfig) {
          next();
          return;
        }

        if (
          !tryServeGeneratedSkillMarkdown(
            request,
            response,
            options.generator.getSkills(),
            options.publicBasePath ?? resolvedConfig.base,
          )
        ) {
          next();
        }
      });
    },

    generateBundle() {
      for (const skill of options.generator.getSkills()) {
        this.emitFile({
          fileName: `skills/${skill.slug}/SKILL.md`,
          source: generateSkillMarkdown(skill),
          type: "asset",
        });
      }
    },

    transformIndexHtml() {
      const tags = buildWebSkillLinkTags(
        options.generator.getSkills(),
        options.publicBasePath ?? resolvedConfig?.base ?? "/",
      );
      return tags.map((tag) => ({
        tag: "link",
        attrs: {
          rel: "web-skill",
          href: tag.href,
          title: tag.title,
          type: tag.type,
        },
        injectTo: "head" as const,
      }));
    },
  };
}

function tryServeGeneratedSkillMarkdown(
  request: IncomingMessage,
  response: ServerResponse,
  skills: ResolvedWebSkillDefinition[],
  basePath: string,
): boolean {
  const requestUrl = request.url;
  if (!requestUrl) {
    return false;
  }

  const pathname = new URL(requestUrl, "http://localhost").pathname;
  const tags = buildWebSkillLinkTags(skills, basePath);
  const matchedIndex = tags.findIndex((tag) => tag.href === pathname);

  if (matchedIndex === -1) {
    return false;
  }

  response.statusCode = 200;
  response.setHeader("Content-Type", "text/markdown; charset=utf-8");
  response.end(generateSkillMarkdown(skills[matchedIndex]!));
  return true;
}
