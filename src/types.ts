import type { ZodType, ZodTypeAny } from "zod";

export type MaybePromise<T> = T | Promise<T>;

export type WebSkillFunctionHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
) => MaybePromise<TOutput>;

export interface AddWebSkillFunctionOptions<TInput = unknown, TOutput = unknown> {
  description?: string;
  inputSchema?: ZodType<TInput>;
  outputSchema?: ZodType<TOutput>;
}

export interface WebSkillFunctionDefinition<TInput = unknown, TOutput = unknown>
  extends AddWebSkillFunctionOptions<TInput, TOutput> {
  func: WebSkillFunctionHandler<TInput, TOutput>;
  name: string;
}

export interface NewWebSkillOptions {
  description?: string;
  name?: string;
  title?: string;
}

export interface ResolvedWebSkillFunctionDefinition<TInput = unknown, TOutput = unknown>
  extends AddWebSkillFunctionOptions<TInput, TOutput> {
  name: string;
}

export interface ResolvedWebSkillDefinition {
  description: string | null;
  functions: ResolvedWebSkillFunctionDefinition<any, any>[];
  key: string;
  name: string;
  slug: string;
  title: string;
}

export interface WebSkillFunctionMetadata {
  description: string | null;
  hasInputSchema: boolean;
  hasOutputSchema: boolean;
  name: string;
}

export interface WebSkillMetadata {
  description: string | null;
  functions: WebSkillFunctionMetadata[];
  key: string;
  name: string;
  title: string;
}

export type WebSkillWindowFunction = (input: unknown) => Promise<unknown>;

export type WebSkillWindowEntry = Record<string, WebSkillWindowFunction | WebSkillMetadata> & {
  _meta: WebSkillMetadata;
};

export interface WebSkillsWindowShape {
  [skillKey: string]: WebSkillWindowEntry;
}

export interface WebSkillLinkTag {
  href: string;
  title: string;
  type: "text/markdown";
}

export interface WebSkillVitePluginOptions {
  generator: WebSkillGenerator;
  publicBasePath?: string;
}

export interface WebSkillGenerator {
  getSkills(): ResolvedWebSkillDefinition[];
  install(target?: Window): WebSkillsWindowShape;
  newSkill(options?: NewWebSkillOptions): WebSkillBuilder;
}

export interface WebSkillBuilder {
  addFunction<TInput, TOutput>(
    func: WebSkillFunctionHandler<TInput, TOutput>,
    name: string,
    options?: AddWebSkillFunctionOptions<TInput, TOutput>,
  ): WebSkillBuilder;
}
