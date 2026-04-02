import { startTransition, useDeferredValue, useState } from "react";

import {
  useRequestWorkbenchStore,
  type CreateDraftInput,
  type RequestPriority,
  type RequestStatusFilter,
} from "./store.ts";

const STATUS_FILTERS: Array<{ label: string; value: RequestStatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Needs review", value: "needs-review" },
  { label: "Drafts", value: "draft" },
  { label: "Ready", value: "ready" },
];

const PRIORITY_OPTIONS: RequestPriority[] = ["low", "medium", "high"];

const EMPTY_DRAFT: CreateDraftInput = {
  amount: 1800,
  priority: "medium",
  requester: "",
  summary: "",
  team: "",
};

function App(): JSX.Element {
  const requests = useRequestWorkbenchStore((state) => state.requests);
  const activeRequestId = useRequestWorkbenchStore((state) => state.activeRequestId);
  const activeRoute = useRequestWorkbenchStore((state) => state.activeRoute);
  const listRequests = useRequestWorkbenchStore((state) => state.listRequests);
  const openRequestWorkspace = useRequestWorkbenchStore((state) => state.openRequestWorkspace);
  const createRequestDraft = useRequestWorkbenchStore((state) => state.createRequestDraft);
  const updateDraftNote = useRequestWorkbenchStore((state) => state.updateDraftNote);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>("all");
  const [draftForm, setDraftForm] = useState<CreateDraftInput>(EMPTY_DRAFT);
  const [lastAction, setLastAction] = useState("Installed at window._web_skills.requestWorkbench");

  const deferredSearch = useDeferredValue(search);
  const visibleRequests = listRequests({
    search: deferredSearch,
    status: statusFilter,
  });

  const activeRequest = requests.find((request) => request.id === activeRequestId) ?? requests[0]!;
  const draftCount = requests.filter((request) => request.status === "draft").length;
  const reviewCount = requests.filter((request) => request.status === "needs-review").length;
  const readyValue = requests
    .filter((request) => request.status === "ready")
    .reduce((total, request) => total + request.amount, 0);

  function handleOpenRequest(requestId: string): void {
    startTransition(() => {
      const result = openRequestWorkspace({
        requestId,
      });
      setLastAction(`Opened ${result.requestId} at ${result.route}`);
    });
  }

  function handleDraftSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    startTransition(() => {
      const result = createRequestDraft({
        amount: draftForm.amount,
        priority: draftForm.priority,
        requester: draftForm.requester.trim(),
        summary: draftForm.summary.trim(),
        team: draftForm.team.trim(),
      });

      setLastAction(`Created ${result.requestId} and moved the workbench to ${result.route}`);
      setDraftForm({
        ...EMPTY_DRAFT,
        amount: 1800,
      });
    });
  }

  return (
    <div className="page-shell">
      <div className="page-backdrop" aria-hidden="true" />
      <main className="workbench">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">React + Zustand example</p>
            <h1>Request workbench</h1>
            <p className="hero-text">
              A front-end-only mock that shows how `web-skill` can expose task-level workbench actions for existing
              records and new draft creation, without falling back to raw DOM automation.
            </p>
          </div>

          <div className="hero-stats">
            <article>
              <span className="stat-label">Open ledger</span>
              <strong>{requests.length}</strong>
              <p>Mock requests already loaded into the local workbench.</p>
            </article>
            <article>
              <span className="stat-label">Drafts in play</span>
              <strong>{draftCount}</strong>
              <p>Local drafts that can still be edited before any real submission step.</p>
            </article>
            <article>
              <span className="stat-label">Ready value</span>
              <strong>{formatCurrency(readyValue)}</strong>
              <p>Requests already shaped for a clean human handoff.</p>
            </article>
          </div>
        </section>

        <section className="annotation-strip">
          <div>
            <span className="annotation-label">Skill entrypoint</span>
            <code>window._web_skills.requestWorkbench</code>
          </div>
          <div>
            <span className="annotation-label">Last action</span>
            <p>{lastAction}</p>
          </div>
          <div>
            <span className="annotation-label">Current route</span>
            <p>{activeRoute}</p>
          </div>
        </section>

        <section className="workspace-grid">
          <aside className="ledger-pane">
            <div className="pane-header">
              <div>
                <p className="eyebrow">Get existing</p>
                <h2>Request ledger</h2>
              </div>
              <span className="pill">{reviewCount} need review</span>
            </div>

            <label className="search-shell">
              <span>Search</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ID, requester, team, summary"
              />
            </label>

            <div className="filter-row">
              {STATUS_FILTERS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => setStatusFilter(entry.value)}
                  data-active={statusFilter === entry.value}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <div className="ledger-list custom-scrollbar">
              {visibleRequests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  className="ledger-item"
                  data-active={request.id === activeRequest.id}
                  onClick={() => handleOpenRequest(request.id)}
                >
                  <div className="ledger-topline">
                    <span className={`status status-${request.status}`}>{formatStatus(request.status)}</span>
                    <span className={`priority priority-${request.priority}`}>{request.priority}</span>
                  </div>
                  <strong>{request.summary}</strong>
                  <p>
                    {request.requester} / {request.team}
                  </p>
                  <div className="ledger-meta">
                    <span>{request.id}</span>
                    <span>{formatCurrency(request.amount)}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <div className="detail-column">
            <section className="detail-pane">
              <div className="pane-header">
                <div>
                  <p className="eyebrow">Open workspace</p>
                  <h2>{activeRequest.summary}</h2>
                </div>
                <span className="pill pill-dark">{activeRequest.id}</span>
              </div>

              <div className="detail-grid">
                <div>
                  <span className="detail-label">Requester</span>
                  <p>{activeRequest.requester}</p>
                </div>
                <div>
                  <span className="detail-label">Team</span>
                  <p>{activeRequest.team}</p>
                </div>
                <div>
                  <span className="detail-label">Priority</span>
                  <p>{activeRequest.priority}</p>
                </div>
                <div>
                  <span className="detail-label">Status</span>
                  <p>{formatStatus(activeRequest.status)}</p>
                </div>
                <div>
                  <span className="detail-label">Value</span>
                  <p>{formatCurrency(activeRequest.amount)}</p>
                </div>
                <div>
                  <span className="detail-label">Route</span>
                  <p>{activeRequest.route}</p>
                </div>
              </div>

              <label className="note-shell">
                <span>Handoff note</span>
                <textarea
                  value={activeRequest.handoffNote}
                  onChange={(event) => updateDraftNote(activeRequest.id, event.target.value)}
                  rows={5}
                />
              </label>
            </section>

            <section className="composer-pane">
              <div className="pane-header">
                <div>
                  <p className="eyebrow">Add new</p>
                  <h2>Create draft request</h2>
                </div>
                <span className="pill">Mock only</span>
              </div>

              <form className="composer-form" onSubmit={handleDraftSubmit}>
                <div className="form-grid">
                  <label>
                    <span>Requester</span>
                    <input
                      type="text"
                      value={draftForm.requester}
                      onChange={(event) => setDraftForm((current) => ({ ...current, requester: event.target.value }))}
                      placeholder="Avery Collins"
                      required
                    />
                  </label>
                  <label>
                    <span>Team</span>
                    <input
                      type="text"
                      value={draftForm.team}
                      onChange={(event) => setDraftForm((current) => ({ ...current, team: event.target.value }))}
                      placeholder="Revenue Operations"
                      required
                    />
                  </label>
                  <label className="full-width">
                    <span>Summary</span>
                    <input
                      type="text"
                      value={draftForm.summary}
                      onChange={(event) => setDraftForm((current) => ({ ...current, summary: event.target.value }))}
                      placeholder="Provision new partner onboarding seats for the next cohort"
                      required
                    />
                  </label>
                  <label>
                    <span>Estimated amount</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={draftForm.amount}
                      onChange={(event) =>
                        setDraftForm((current) => ({
                          ...current,
                          amount: Number(event.target.value),
                        }))
                      }
                      required
                    />
                  </label>
                  <label>
                    <span>Priority</span>
                    <select
                      value={draftForm.priority}
                      onChange={(event) =>
                        setDraftForm((current) => ({
                          ...current,
                          priority: event.target.value as RequestPriority,
                        }))
                      }
                    >
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="composer-footer">
                  <p>
                    This example keeps everything in local Zustand state. The point is the handoff shape, not backend
                    persistence.
                  </p>
                  <button type="submit">Create draft and open workspace</button>
                </div>
              </form>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatStatus(value: string): string {
  return value.replace("-", " ");
}

export default App;
