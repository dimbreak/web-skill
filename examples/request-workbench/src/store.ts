import { create } from "zustand";

export type RequestPriority = "low" | "medium" | "high";
export type RequestStatus = "draft" | "needs-review" | "ready";
export type RequestStatusFilter = RequestStatus | "all";

export interface WorkbenchRequest {
  amount: number;
  handoffNote: string;
  id: string;
  priority: RequestPriority;
  requester: string;
  route: string;
  status: RequestStatus;
  summary: string;
  team: string;
  updatedAt: string;
}

export interface RequestListInput {
  search?: string;
  status?: RequestStatusFilter;
}

export interface RequestListItem {
  amount: number;
  id: string;
  priority: RequestPriority;
  requester: string;
  route: string;
  status: RequestStatus;
  summary: string;
  team: string;
  updatedAt: string;
}

export interface CreateDraftInput {
  amount: number;
  priority: RequestPriority;
  requester: string;
  summary: string;
  team: string;
}

interface OpenRequestInput {
  requestId: string;
}

interface WorkspaceSelection {
  requestId: string;
  route: string;
  status: RequestStatus;
}

interface RequestWorkbenchState {
  activeRequestId: string;
  activeRoute: string;
  createRequestDraft: (input: CreateDraftInput) => WorkspaceSelection;
  listRequests: (input?: RequestListInput) => RequestListItem[];
  openRequestWorkspace: (input: OpenRequestInput) => WorkspaceSelection;
  requests: WorkbenchRequest[];
  updateDraftNote: (requestId: string, note: string) => void;
}

const INITIAL_REQUESTS: WorkbenchRequest[] = [
  {
    amount: 12400,
    handoffNote: "Awaiting finance sign-off after supplier clarification.",
    id: "REQ-1048",
    priority: "high",
    requester: "Marina Wong",
    route: "/workspace/requests/REQ-1048",
    status: "needs-review",
    summary: "Replace four barcode scanners before warehouse cycle count.",
    team: "Warehouse Ops",
    updatedAt: "2026-04-02T08:45:00.000Z",
  },
  {
    amount: 3800,
    handoffNote: "Designer already attached a preferred vendor shortlist.",
    id: "REQ-1047",
    priority: "medium",
    requester: "Asher Price",
    route: "/workspace/requests/REQ-1047",
    status: "draft",
    summary: "Source launch-event signage and overnight installation support.",
    team: "Brand Studio",
    updatedAt: "2026-04-02T07:10:00.000Z",
  },
  {
    amount: 28950,
    handoffNote: "All legal clauses approved. Ready for handoff to procurement.",
    id: "REQ-1045",
    priority: "high",
    requester: "Lena Ho",
    route: "/workspace/requests/REQ-1045",
    status: "ready",
    summary: "Expand bilingual customer support seats for the next quarter.",
    team: "Customer Care",
    updatedAt: "2026-04-01T16:20:00.000Z",
  },
  {
    amount: 2100,
    handoffNote: "Keep this one light-touch. No manager escalation needed yet.",
    id: "REQ-1042",
    priority: "low",
    requester: "Noah Dean",
    route: "/workspace/requests/REQ-1042",
    status: "draft",
    summary: "Purchase replacement studio lighting for the demo filming corner.",
    team: "Field Marketing",
    updatedAt: "2026-04-01T11:05:00.000Z",
  },
];

export const useRequestWorkbenchStore = create<RequestWorkbenchState>((set, get) => ({
  activeRequestId: INITIAL_REQUESTS[0]!.id,
  activeRoute: INITIAL_REQUESTS[0]!.route,

  createRequestDraft(input) {
    const nextId = createNextRequestId(get().requests);
    const nextRecord: WorkbenchRequest = {
      amount: input.amount,
      handoffNote: "Draft created locally. Review the details before any real submission flow.",
      id: nextId,
      priority: input.priority,
      requester: input.requester.trim(),
      route: createRoute(nextId),
      status: "draft",
      summary: input.summary.trim(),
      team: input.team.trim(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      activeRequestId: nextRecord.id,
      activeRoute: nextRecord.route,
      requests: [nextRecord, ...state.requests],
    }));

    return {
      requestId: nextRecord.id,
      route: nextRecord.route,
      status: nextRecord.status,
    };
  },

  listRequests(input = {}) {
    const search = input.search?.trim().toLowerCase() ?? "";
    const status = input.status ?? "all";

    return get()
      .requests
      .filter((request) => {
        if (status !== "all" && request.status !== status) {
          return false;
        }

        if (search.length === 0) {
          return true;
        }

        const haystack = `${request.id} ${request.requester} ${request.team} ${request.summary}`.toLowerCase();
        return haystack.includes(search);
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((request) => ({
        amount: request.amount,
        id: request.id,
        priority: request.priority,
        requester: request.requester,
        route: request.route,
        status: request.status,
        summary: request.summary,
        team: request.team,
        updatedAt: request.updatedAt,
      }));
  },

  openRequestWorkspace(input) {
    const record = get().requests.find((entry) => entry.id === input.requestId);
    if (!record) {
      throw new Error(`Unknown request "${input.requestId}".`);
    }

    set({
      activeRequestId: record.id,
      activeRoute: record.route,
    });

    return {
      requestId: record.id,
      route: record.route,
      status: record.status,
    };
  },

  requests: INITIAL_REQUESTS,

  updateDraftNote(requestId, note) {
    set((state) => ({
      requests: state.requests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              handoffNote: note,
              updatedAt: new Date().toISOString(),
            }
          : request,
      ),
    }));
  },
}));

function createRoute(requestId: string): string {
  return `/workspace/requests/${requestId}`;
}

function createNextRequestId(requests: WorkbenchRequest[]): string {
  const nextNumber =
    requests.reduce((max, request) => {
      const numericPart = Number.parseInt(request.id.replace("REQ-", ""), 10);
      return Number.isFinite(numericPart) ? Math.max(max, numericPart) : max;
    }, 1048) + 1;

  return `REQ-${nextNumber}`;
}
