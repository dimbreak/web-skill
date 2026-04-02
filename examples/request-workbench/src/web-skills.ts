import { z } from "zod";

import { createWebSkillGenerator } from "web-skill";

import { useRequestWorkbenchStore } from "./store.ts";

const listStatusSchema = z.enum(["all", "draft", "needs-review", "ready"]);
const requestStatusSchema = z.enum(["draft", "needs-review", "ready"]);
const requestPrioritySchema = z.enum(["low", "medium", "high"]);

export const webSkills = createWebSkillGenerator();

const requestWorkbenchSkill = webSkills.newSkill({
  name: "requestWorkbench",
  title: "Request workbench API for opening existing requests and drafting new ones",
  description:
    "Expose mock request-workbench actions so an agent can inspect existing requests, open the right workspace, and create a new draft without relying on raw DOM clicks.",
});

requestWorkbenchSkill.addFunction(
  (input) => useRequestWorkbenchStore.getState().listRequests(input),
  "listRequests",
  {
    description: "Return existing mock requests with optional search and status filters.",
    inputSchema: z
      .object({
        search: z.string().min(1).optional(),
        status: listStatusSchema.optional(),
      })
      .default({}),
    outputSchema: z.array(
      z.object({
        amount: z.number(),
        id: z.string(),
        priority: requestPrioritySchema,
        requester: z.string(),
        route: z.string(),
        status: requestStatusSchema,
        summary: z.string(),
        team: z.string(),
        updatedAt: z.string(),
      }),
    ),
  },
);

requestWorkbenchSkill.addFunction(
  (input) => useRequestWorkbenchStore.getState().openRequestWorkspace(input),
  "openRequestWorkspace",
  {
    description: "Select an existing request and move the UI to the matching workspace route.",
    inputSchema: z.object({
      requestId: z.string().min(1),
    }),
    outputSchema: z.object({
      requestId: z.string(),
      route: z.string(),
      status: requestStatusSchema,
    }),
  },
);

requestWorkbenchSkill.addFunction(
  (input) => useRequestWorkbenchStore.getState().createRequestDraft(input),
  "createRequestDraft",
  {
    description: "Create a new front-end-only draft request and move the workbench to the new draft route.",
    inputSchema: z.object({
      amount: z.number().nonnegative(),
      priority: requestPrioritySchema,
      requester: z.string().min(1),
      summary: z.string().min(1),
      team: z.string().min(1),
    }),
    outputSchema: z.object({
      requestId: z.string(),
      route: z.string(),
      status: z.literal("draft"),
    }),
  },
);
