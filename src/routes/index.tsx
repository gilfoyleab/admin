import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyBulkAction,
  canAddModel,
  canDeleteModel,
  deleteModelRow,
  hasActiveAdminSession,
  loadAdminModels,
  saveModelRow,
  type Column,
  type Model,
} from "@/lib/admin-api";

export const Route = createFileRoute("/")({
  component: Admin,
  head: () => ({
    meta: [
      { title: "Nano Syllabus administration" },
      { name: "description", content: "Django-style admin panel for Nano Syllabus" },
    ],
  }),
});

export function AdminPage() {
  return <Admin />;
}

function Admin() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);
  const [adding, setAdding] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationSuccess, setMutationSuccess] = useState<string | null>(null);

  const model = useMemo(
    () => (active ? (models.find((candidate) => candidate.name === active) ?? null) : null),
    [active, models],
  );
  const grouped = useMemo(() => groupModelsByApp(models), [models]);

  async function reloadModels(options?: { preserveModel?: boolean }) {
    setLoading(true);
    setError(null);
    const previousModel = active;
    try {
      const activeSession = await hasActiveAdminSession();
      if (!activeSession) {
        window.location.assign("/login");
        return;
      }

      const result = await loadAdminModels();
      setModels(result.models);
      setWarnings(result.warnings);
      if (!result.models.length) {
        setError("No admin models were loaded. Check backend connectivity and admin permissions.");
        return;
      }

      if (options?.preserveModel && previousModel) {
        const exists = result.models.some((candidate) => candidate.name === previousModel);
        if (!exists) {
          setActive(null);
          setSelectedRow(null);
          setAdding(false);
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load admin data.");
      setWarnings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reloadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goList = (n: string) => {
    setMutationError(null);
    setMutationSuccess(null);
    setActive(n);
    setSelectedRow(null);
    setAdding(false);
  };
  const goHome = () => {
    setMutationError(null);
    setMutationSuccess(null);
    setActive(null);
    setSelectedRow(null);
    setAdding(false);
  };

  const openNotebookWorkspace = useCallback((params?: { notebookId?: string; resourceId?: string }) => {
    const target = new URL("/notebooks", window.location.origin);
    if (params?.notebookId) target.searchParams.set("notebookId", params.notebookId);
    if (params?.resourceId) target.searchParams.set("resourceId", params.resourceId);
    window.location.assign(`${target.pathname}${target.search}`);
  }, []);

  const emptyRow = (m: Model): Record<string, unknown> => {
    const byModelName: Record<string, Record<string, unknown>> = {
      knowledge_notebooks: {
        id: "(auto-generated)",
        title: "",
        board: "",
        level: "",
        faculty: "",
        subject: "",
        curriculum: "",
        description: "",
      },
      knowledge_documents: {
        id: "(auto-generated)",
        notebook_id: "",
        notebook_title: "",
        board: "",
        grade: "",
        faculty: "",
        curriculum: "",
        subject: "",
        chapter: "",
        resource_kind: "study_material",
        resource_subtype: "notes",
        title: "",
        source_name: "",
        source_type: "text",
        raw_content: "",
        processing_status: "draft",
        chunk_count: 0,
        processing_error: "",
        uploaded_at: "",
      },
      prompt_templates: {
        id: "(auto-generated)",
        name: "",
        slug: "",
        purpose: "system",
        language: "EN",
        description: "",
        content: "",
        is_active: false,
      },
      subscription_plans: {
        id: "(auto-generated)",
        name: "",
        slug: "",
        credits: 0,
        price: 0,
        currency: "NPR",
        billing_type: "monthly",
        is_active: true,
      },
      user_subscriptions: {
        id: "(auto-generated)",
        user_id: "",
        plan_id: "",
        student_name: "",
        student_email: "",
        plan_name: "",
        status: "active",
        starts_at: new Date().toISOString(),
        ends_at: "",
      },
      credits_ledger: {
        id: "(auto-generated)",
        user_id: "",
        type: "adjustment",
        amount: 0,
        balance_after: "(auto-generated)",
        reference_type: "manual_adjustment",
        reference_id: "(auto-generated)",
        description: "",
        created_at: "",
      },
    };

    const predefined = byModelName[m.name];
    if (predefined) return { ...predefined };

    const sample = m.rows[0] ?? {};
    const blank: Record<string, unknown> = {};
    for (const k of Object.keys(sample)) {
      const v = sample[k] as unknown;
      if (k === "id") blank[k] = "(auto-generated)";
      else if (typeof v === "boolean") blank[k] = false;
      else if (Array.isArray(v)) blank[k] = [];
      else if (typeof v === "object" && v !== null) blank[k] = {};
      else if (typeof v === "number") blank[k] = 0;
      else blank[k] = "";
    }
    return blank;
  };

  async function handleSave(row: Record<string, unknown>, isNew?: boolean) {
    if (!model) return;
    setMutationBusy(true);
    setMutationError(null);
    setMutationSuccess(null);
    try {
      await saveModelRow({
        modelName: model.name,
        row,
        previousRow: selectedRow,
        isNew,
      });
      await reloadModels({ preserveModel: true });
      setMutationSuccess(isNew ? "Created successfully." : "Saved successfully.");
      if (isNew) {
        setAdding(false);
      } else {
        setSelectedRow(row);
      }
    } catch (saveError) {
      setMutationError(saveError instanceof Error ? saveError.message : "Save failed.");
      return;
    } finally {
      setMutationBusy(false);
    }
  }

  async function handleDelete(row: Record<string, unknown>) {
    if (!model) return;
    const ok = window.confirm(`Delete this ${model.verbose.toLowerCase()}? This cannot be undone.`);
    if (!ok) return;

    setMutationBusy(true);
    setMutationError(null);
    setMutationSuccess(null);
    try {
      await deleteModelRow(model.name, row);
      await reloadModels({ preserveModel: true });
      setSelectedRow(null);
      setAdding(false);
      setMutationSuccess("Deleted successfully.");
    } catch (deleteError) {
      setMutationError(deleteError instanceof Error ? deleteError.message : "Delete failed.");
    } finally {
      setMutationBusy(false);
    }
  }

  async function handleBulkAction(
    action: "mark_reviewed" | "mark_unreviewed" | "set_admin" | "set_student" | "process_documents",
    selectedIds: string[],
  ) {
    if (!model) return;
    setMutationBusy(true);
    setMutationError(null);
    setMutationSuccess(null);
    try {
      await applyBulkAction({
        modelName: model.name,
        action,
        selectedIds,
      });
      await reloadModels({ preserveModel: true });
      setMutationSuccess("Bulk action applied.");
    } catch (actionError) {
      setMutationError(actionError instanceof Error ? actionError.message : "Bulk action failed.");
    } finally {
      setMutationBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Breadcrumbs
        model={model}
        selectedRow={selectedRow}
        adding={adding}
        onHome={goHome}
        onBackToList={() => {
          setSelectedRow(null);
          setAdding(false);
        }}
      />
      <div className="mx-auto max-w-[1400px] px-4 py-4 lg:px-5 lg:py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6">
        <main className="min-w-0">
          {mutationError ? (
            <div className="mb-3 bg-card border border-border rounded-[var(--radius)] px-4 py-3 text-xs text-danger">
              {mutationError}
            </div>
          ) : null}
          {mutationSuccess ? (
            <div className="mb-3 bg-card border border-border rounded-[var(--radius)] px-4 py-3 text-xs text-success">
              {mutationSuccess}
            </div>
          ) : null}
          {!model && loading && <LoadingCard />}
          {!model && !loading && error && <ErrorCard message={error} warnings={warnings} />}
          {!model && !loading && !error && (
            <>
              {warnings.length ? <WarningCard warnings={warnings} /> : null}
              <Dashboard grouped={grouped} onPick={goList} onAdd={goList} />
            </>
          )}
          {model && !selectedRow && !adding && (
            <ListView
              model={model}
              onOpen={(row) => setSelectedRow(row)}
              onAdd={() => {
                if (!canAddModel(model.name)) {
                  setMutationError(`Add is not enabled for ${model.verbosePlural}.`);
                  return;
                }
                setAdding(true);
              }}
              onBulkAction={handleBulkAction}
              busy={mutationBusy}
              onOpenNotebookWorkspace={openNotebookWorkspace}
            />
          )}
          {model && (selectedRow || adding) && (
            <DetailView
              model={model}
              row={selectedRow ?? emptyRow(model)}
              isNew={adding}
              onBack={() => {
                setSelectedRow(null);
                setAdding(false);
              }}
              onSave={handleSave}
              onDelete={handleDelete}
              busy={mutationBusy}
              canSave={
                ![
                  "knowledge_chunks",
                  "auth_users",
                  "invoices",
                  "chat_sessions",
                  "chat_messages",
                  "revision_notes",
                  "note_revision_logs",
                ].includes(model.name)
              }
              canDelete={canDeleteModel(model.name) && !adding}
              onOpenNotebookWorkspace={openNotebookWorkspace}
            />
          )}
        </main>
        <Sidebar models={models} activeModel={active} onPick={goList} onHome={goHome} />
      </div>
    </div>
  );
}

function shouldUseRawModelLabel(model: Model) {
  return (
    model.app === "Knowledge" ||
    model.app === "Authentication" ||
    model.app === "Billing" ||
    model.app === "Conversations" ||
    model.app === "Revision"
  );
}

function modelListLabel(model: Model) {
  return shouldUseRawModelLabel(model) ? model.name : model.verbosePlural;
}

function modelItemLabel(model: Model) {
  return shouldUseRawModelLabel(model) ? model.name : model.verbose.toLowerCase();
}

function Header() {
  async function handleLogout() {
    await fetch("/api/admin/session", {
      method: "DELETE",
      credentials: "include",
    });
    window.location.assign("/login");
  }

  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-[1400px] px-4 py-2 lg:px-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-[18px] font-normal">
          <span className="opacity-90">Nano Syllabus</span> administration
        </h1>
        <div className="text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="opacity-90">Welcome,</span>
          <strong className="font-semibold">ADMIN</strong>
          <a className="text-primary-foreground/90 hover:underline" href="#">
            View site
          </a>
          <span className="opacity-50">/</span>
          <a className="text-primary-foreground/90 hover:underline" href="#">
            Change password
          </a>
          <span className="opacity-50">/</span>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-primary-foreground/90 hover:underline"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

function Breadcrumbs({
  model,
  selectedRow,
  adding,
  onHome,
  onBackToList,
}: {
  model: Model | null;
  selectedRow: Record<string, unknown> | null;
  adding?: boolean;
  onHome: () => void;
  onBackToList: () => void;
}) {
  return (
    <div className="bg-[oklch(0.96_0.005_230)] border-b border-border">
      <div className="mx-auto max-w-[1400px] px-5 py-2 text-xs text-muted-foreground">
        <button onClick={onHome} className="text-link hover:underline">
          Home
        </button>
        {model && (
          <>
            <span className="mx-1">›</span>
            <span className="text-link">{model.app}</span>
            <span className="mx-1">›</span>
            {selectedRow || adding ? (
              <button onClick={onBackToList} className="text-link hover:underline">
                {modelListLabel(model)}
              </button>
            ) : (
              <span className="text-foreground">{modelListLabel(model)}</span>
            )}
            {adding && (
              <>
                <span className="mx-1">›</span>
                <span className="text-foreground">Add {modelItemLabel(model)}</span>
              </>
            )}
            {selectedRow && !adding && (
              <>
                <span className="mx-1">›</span>
                <span className="text-foreground truncate">
                  {String(selectedRow.id).slice(0, 8)}…
                </span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Sidebar({
  models,
  activeModel,
  onPick,
  onHome,
}: {
  models: Model[];
  activeModel: string | null;
  onPick: (n: string) => void;
  onHome: () => void;
}) {
  const appSummaries = useMemo(() => {
    const grouped = groupModelsByApp(models);
    return grouped.map(([app, list]) => ({
      app,
      tables: list.length,
      rows: list.reduce((sum, item) => sum + (item.totalCount ?? item.rows.length), 0),
    }));
  }, [models]);

  return (
    <aside className="space-y-4">
      <Module title="System summary">
        <ul className="divide-y divide-border text-xs">
          {appSummaries.map((summary) => (
            <li key={summary.app} className="px-3 py-2">
              <p className="font-semibold text-foreground">{summary.app}</p>
              <p className="mt-1 text-muted-foreground">
                {summary.tables} tables · {summary.rows} rows
              </p>
            </li>
          ))}
        </ul>
      </Module>
      <Module title="Navigation">
        <ul className="text-xs">
          <li>
            <button
              onClick={onHome}
              className={`block w-full text-left px-3 py-1.5 ${!activeModel ? "bg-secondary font-semibold" : "hover:bg-secondary"}`}
            >
              Site administration
            </button>
          </li>
          {models.map((m) => (
            <li key={m.name}>
              <button
                onClick={() => onPick(m.name)}
                className={`block w-full text-left px-3 py-1.5 ${activeModel === m.name ? "bg-secondary font-semibold text-foreground" : "text-link hover:bg-secondary"}`}
              >
                {modelListLabel(m)}
              </button>
            </li>
          ))}
        </ul>
      </Module>
    </aside>
  );
}

function Module({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
      <h2 className="bg-primary text-primary-foreground text-[12px] uppercase tracking-wide font-semibold px-3 py-1.5">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function Dashboard({
  grouped,
  onPick,
  onAdd,
}: {
  grouped: Array<[string, Model[]]>;
  onPick: (n: string) => void;
  onAdd: (n: string) => void;
}) {
  return (
    <div className="space-y-5">
      {grouped.map(([app, list]) => (
        <section
          key={app}
          className="bg-card border border-border rounded-[var(--radius)] overflow-hidden"
        >
          <h2 className="bg-primary text-primary-foreground text-[12px] uppercase tracking-wide font-semibold px-3 py-1.5 flex justify-between">
            <span>{app}</span>
          </h2>
          <div className="divide-y divide-border">
            {list.map((m, i) => (
              <div
                key={m.name}
                className={`px-3 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between ${i % 2 ? "bg-[oklch(0.98_0.003_230)]" : ""}`}
              >
                <div className="min-w-0">
                  <button
                    onClick={() => onPick(m.name)}
                    className="text-link hover:underline font-medium break-all text-left"
                  >
                    {modelListLabel(m)}
                  </button>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({m.totalCount ?? m.rows.length})
                  </span>
                </div>
                <div className="text-xs flex items-center gap-3 md:justify-end">
                  {m.name === "knowledge_notebooks" || m.name === "knowledge_documents" ? (
                    <a href="/notebooks" className="text-link hover:underline">
                      Workspace
                    </a>
                  ) : (
                    <>
                      {canAddModel(m.name) ? (
                        <button
                          onClick={() => onAdd(m.name)}
                          className="text-link hover:underline"
                        >
                          + Add
                        </button>
                      ) : null}
                      <button onClick={() => onPick(m.name)} className="text-link hover:underline">
                        Change
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ListView({
  model,
  onOpen,
  onAdd,
  onBulkAction,
  busy,
  onOpenNotebookWorkspace,
}: {
  model: Model;
  onOpen: (row: Record<string, unknown>) => void;
  onAdd: () => void;
  onBulkAction: (
    action: "mark_reviewed" | "mark_unreviewed" | "set_admin" | "set_student" | "process_documents",
    selectedIds: string[],
  ) => Promise<void>;
  busy?: boolean;
  onOpenNotebookWorkspace: (params?: { notebookId?: string; resourceId?: string }) => void;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");

  const filtered = useMemo(() => {
    if (!q) return model.rows;
    const s = q.toLowerCase();
    return model.rows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(s)),
    );
  }, [q, model.rows]);

  const allSelected =
    filtered.length > 0 && filtered.every((row) => selected.has(String(row.id ?? "")));
  const selectedIds = Array.from(selected);

  async function runBulkAction() {
    if (!bulkAction) return;
    if (!selectedIds.length) return;
    if (
      bulkAction !== "mark_reviewed" &&
      bulkAction !== "mark_unreviewed" &&
      bulkAction !== "set_admin" &&
      bulkAction !== "set_student" &&
      bulkAction !== "process_documents"
    ) {
      return;
    }
    await onBulkAction(bulkAction, selectedIds);
    setSelected(new Set());
    setBulkAction("");
  }

  const actionOptions =
    model.name === "assistant_answers"
      ? [
          { value: "mark_reviewed", label: "Mark selected as reviewed" },
          { value: "mark_unreviewed", label: "Mark selected as unreviewed" },
        ]
      : model.name === "student_profiles"
        ? [
            { value: "set_admin", label: "Set selected as admin" },
            { value: "set_student", label: "Set selected as student" },
          ]
        : model.name === "knowledge_documents"
          ? [{ value: "process_documents", label: "Process selected documents" }]
          : [];

  const isKnowledgeModel =
    model.name === "knowledge_notebooks" || model.name === "knowledge_documents";
  const canAddCurrentModel = canAddModel(model.name);

  function openRow(row: Record<string, unknown>) {
    if (model.name === "knowledge_notebooks") {
      const notebookId = String(row.id ?? "");
      if (notebookId) {
        onOpenNotebookWorkspace({ notebookId });
        return;
      }
    }
    if (model.name === "knowledge_documents") {
      const resourceId = String(row.id ?? "");
      const notebookId = String(row.notebook_id ?? "");
      onOpenNotebookWorkspace({
        notebookId: notebookId || undefined,
        resourceId: resourceId || undefined,
      });
      return;
    }
    onOpen(row);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <h1 className="text-[20px] font-normal text-foreground">
          Select {model.verbose.toLowerCase()} to change
        </h1>
        {isKnowledgeModel || canAddCurrentModel ? (
          <button
            onClick={() => {
              if (isKnowledgeModel) {
                onOpenNotebookWorkspace();
                return;
              }
              onAdd();
            }}
            disabled={busy}
            className="text-xs font-semibold px-3 py-2 rounded-[var(--radius)] hover:opacity-90"
            style={{ background: "var(--color-success)", color: "white" }}
          >
            {isKnowledgeModel ? "OPEN NOTEBOOK WORKSPACE" : `ADD ${model.verbose.toUpperCase()} +`}
          </button>
        ) : null}
      </div>

      <div className="bg-card border border-border rounded-[var(--radius)]">
        <div className="p-3 border-b border-border flex flex-col gap-2 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="flex-1 border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded">
            Search
          </button>
        </div>

        <div className="px-3 py-2 border-b border-border bg-secondary/40 text-xs flex items-center gap-2">
          <label className="text-muted-foreground">Action:</label>
          <select
            value={bulkAction}
            onChange={(event) => setBulkAction(event.target.value)}
            className="border border-border rounded px-1 py-0.5 text-xs bg-card"
            disabled={busy || !actionOptions.length}
          >
            <option value="">---------</option>
            {actionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            className="border border-border bg-card px-2 py-0.5 text-xs rounded hover:bg-secondary disabled:opacity-50"
            disabled={!bulkAction || !selectedIds.length || !!busy}
            onClick={() => void runBulkAction()}
          >
            Go
          </button>
          <span className="ml-2 text-muted-foreground">
            {selected.size} of {filtered.length} selected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="bg-[oklch(0.94_0.005_230)] border-b border-border text-left">
                <th className="px-2 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={busy}
                    onChange={(e) => {
                      const next = new Set(selected);
                      filtered.forEach((row) => {
                        const rowId = String(row.id ?? "");
                        if (!rowId) return;
                        if (e.target.checked) next.add(rowId);
                        else next.delete(rowId);
                      });
                      setSelected(next);
                    }}
                  />
                </th>
                {model.columns.map((c) => (
                  <th
                    key={c.key}
                    className="px-3 py-2 font-semibold text-[12px] uppercase tracking-wide text-foreground border-r border-border last:border-r-0"
                  >
                    {c.label} ▾
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={String(row.id ?? `${i}`)}
                  className={`border-b border-border ${i % 2 ? "bg-[oklch(0.98_0.003_230)]" : ""}`}
                >
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(String(row.id ?? ""))}
                      disabled={busy}
                      onChange={(e) => {
                        const next = new Set(selected);
                        const rowId = String(row.id ?? "");
                        if (!rowId) return;
                        if (e.target.checked) next.add(rowId);
                        else next.delete(rowId);
                        setSelected(next);
                      }}
                    />
                  </td>
                  {model.columns.map((c, ci) => (
                    <td key={c.key} className="px-3 py-2 align-top">
                      {ci === 0 || ci === 1 ? (
                        <button
                          onClick={() => openRow(row)}
                          className="text-link hover:underline font-medium"
                        >
                          {formatCell(row[c.key], c.type)}
                        </button>
                      ) : (
                        <span className="text-foreground">{formatCell(row[c.key], c.type)}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
          {filtered.length} shown · {model.totalCount ?? filtered.length} total{" "}
          {model.totalCount === 1 ? model.verbose.toLowerCase() : model.verbosePlural.toLowerCase()}
        </div>
      </div>
    </div>
  );
}

function DetailView({
  model,
  row,
  isNew,
  onBack,
  onSave,
  onDelete,
  busy,
  canSave,
  canDelete,
  onOpenNotebookWorkspace,
}: {
  model: Model;
  row: Record<string, unknown>;
  isNew?: boolean;
  onBack: () => void;
  onSave: (row: Record<string, unknown>, isNew?: boolean) => Promise<void>;
  onDelete: (row: Record<string, unknown>) => Promise<void>;
  busy?: boolean;
  canSave?: boolean;
  canDelete?: boolean;
  onOpenNotebookWorkspace: (params?: { notebookId?: string; resourceId?: string }) => void;
}) {
  const keys = Object.keys(row);
  const [draft, setDraft] = useState<Record<string, unknown>>(row);
  const [ledgerAdjustmentAmount, setLedgerAdjustmentAmount] = useState("0");
  const [ledgerAdjustmentDescription, setLedgerAdjustmentDescription] = useState("");

  useEffect(() => {
    setDraft(row);
    setLedgerAdjustmentAmount("0");
    setLedgerAdjustmentDescription("");
  }, [row]);

  function setField(key: string, value: unknown) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <h1 className="text-[20px] font-normal">
          {isNew ? `Add ${model.verbose.toLowerCase()}` : `Change ${model.verbose.toLowerCase()}`}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {(model.name === "knowledge_notebooks" || model.name === "knowledge_documents") && (
            <button
              type="button"
              onClick={() =>
                onOpenNotebookWorkspace({
                  notebookId:
                    model.name === "knowledge_notebooks"
                      ? String(row.id ?? "")
                      : String(row.notebook_id ?? ""),
                  resourceId:
                    model.name === "knowledge_documents" ? String(row.id ?? "") : undefined,
                })
              }
              className="text-xs font-semibold text-link hover:underline"
            >
              Open notebook workspace
            </button>
          )}
          {!isNew && (
            <a href="#" className="text-xs text-link hover:underline">
              History
            </a>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-[var(--radius)]">
        <h2 className="bg-primary text-primary-foreground text-[12px] uppercase tracking-wide font-semibold px-3 py-1.5">
          {model.verbose}
        </h2>
        <div className="p-5 space-y-4">
          {model.name === "credits_ledger" && !isNew ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {["user_id", "full_name", "email", "role", "current_balance", "ledger_count", "last_entry_at"].map(
                  (key) => {
                    const col = model.columns.find((candidate) => candidate.key === key);
                    return (
                      <div key={key} className="border border-border rounded-[var(--radius)] p-3 bg-secondary/20">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {col?.label ?? key.replace(/_/g, " ")}
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {formatCell(draft[key], col?.type)}
                        </p>
                      </div>
                    );
                  },
                )}
              </div>

              <div className="border border-border rounded-[var(--radius)] overflow-hidden">
                <div className="bg-secondary/40 border-b border-border px-4 py-2">
                  <h3 className="text-sm font-semibold text-foreground">Add manual adjustment</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add or subtract credits for this user. A new `credits_ledger` entry will be created.
                  </p>
                </div>
                <div className="p-4 grid grid-cols-[180px_1fr] gap-4 items-start">
                  <label className="text-sm font-semibold text-foreground pt-1.5 text-right">
                    Amount:
                  </label>
                  <input
                    value={ledgerAdjustmentAmount}
                    disabled={busy}
                    onChange={(event) => setLedgerAdjustmentAmount(event.target.value)}
                    className="w-full max-w-[220px] border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <label className="text-sm font-semibold text-foreground pt-1.5 text-right">
                    Description:
                  </label>
                  <input
                    value={ledgerAdjustmentDescription}
                    disabled={busy}
                    onChange={(event) => setLedgerAdjustmentDescription(event.target.value)}
                    className="w-full max-w-[520px] border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="px-4 pb-4 flex justify-end">
                  <button
                    type="button"
                    disabled={!!busy || !String(draft.user_id ?? "").trim()}
                    onClick={async () => {
                      await onSave(
                        {
                          user_id: String(draft.user_id ?? ""),
                          amount: ledgerAdjustmentAmount,
                          description: ledgerAdjustmentDescription,
                        },
                        true,
                      );
                      onBack();
                    }}
                    className="text-xs px-3 py-2 rounded font-semibold text-white"
                    style={{ background: "var(--color-success)" }}
                  >
                    Add adjustment entry
                  </button>
                </div>
              </div>

              <div className="border border-border rounded-[var(--radius)] overflow-hidden">
                <div className="bg-secondary/40 border-b border-border px-4 py-2">
                  <h3 className="text-sm font-semibold text-foreground">Ledger entries</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[oklch(0.94_0.005_230)] border-b border-border text-left">
                        {["id", "type", "amount", "balanceAfter", "referenceType", "referenceId", "description", "createdAt"].map((label) => (
                          <th key={label} className="px-3 py-2 font-semibold text-[12px] uppercase tracking-wide text-foreground">
                            {label.replace(/([A-Z])/g, " $1")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(draft.ledger_entries) && draft.ledger_entries.length ? (
                        (draft.ledger_entries as Array<Record<string, unknown>>).map((entry, index) => (
                          <tr key={String(entry.id ?? index)} className={index % 2 ? "bg-[oklch(0.98_0.003_230)]" : ""}>
                            <td className="px-3 py-2 align-top">{formatCell(entry.id)}</td>
                            <td className="px-3 py-2 align-top">{formatCell(entry.type)}</td>
                            <td className="px-3 py-2 align-top">{formatCell(entry.amount, "int")}</td>
                            <td className="px-3 py-2 align-top">{formatCell(entry.balanceAfter, "int")}</td>
                            <td className="px-3 py-2 align-top">{formatCell(entry.referenceType)}</td>
                            <td className="px-3 py-2 align-top">{formatCell(entry.referenceId)}</td>
                            <td className="px-3 py-2 align-top">{formatCell(entry.description)}</td>
                            <td className="px-3 py-2 align-top">{formatCell(entry.createdAt, "date")}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={8}>
                            No ledger entries found for this user.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : model.name === "assistant_answers" ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  "student_name",
                  "student_email",
                  "college",
                  "board",
                  "grade",
                  "subject_context",
                  "session_title",
                  "created_at",
                ].map((key) => {
                  const col = model.columns.find((candidate) => candidate.key === key);
                  return (
                    <div
                      key={key}
                      className="border border-border rounded-[var(--radius)] p-3 bg-secondary/20"
                    >
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {col?.label ?? key.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {formatCell(draft[key], col?.type)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-border rounded-[var(--radius)] p-3 bg-secondary/20">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Review state
                  </p>
                  <select
                    value={String(draft.review_state ?? "pending")}
                    disabled={busy}
                    onChange={(event) => setField("review_state", event.target.value)}
                    className="mt-2 w-full max-w-[220px] border border-border rounded px-2 py-1 text-sm bg-card"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-2">
                    `Reviewed` sets admin review metadata. `Pending` clears it.
                  </p>
                </div>
                <div className="border border-border rounded-[var(--radius)] p-3 bg-secondary/20">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Grounding and feedback
                  </p>
                  <div className="mt-2 text-sm text-foreground space-y-1">
                    <p>Grounded: {formatCell(draft.grounded, "bool")}</p>
                    <p>Feedback: {formatCell(draft.feedback)}</p>
                    <p>Citation count: {formatCell(draft.citation_count, "int")}</p>
                    <p>Reviewed at: {formatCell(draft.reviewed_at, "date")}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] gap-4 items-start">
                <label className="text-sm font-semibold text-foreground pt-1.5 text-right">
                  Admin note:
                </label>
                <textarea
                  value={String(draft.admin_review_note ?? "")}
                  disabled={busy}
                  onChange={(event) => setField("admin_review_note", event.target.value)}
                  className="w-full border border-border rounded px-2 py-1 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="border border-border rounded-[var(--radius)] overflow-hidden">
                <div className="bg-secondary/40 border-b border-border px-4 py-2">
                  <h3 className="text-sm font-semibold text-foreground">Answer content</h3>
                </div>
                <div className="p-4">
                  <textarea
                    value={String(draft.answer_content ?? "")}
                    disabled
                    className="w-full border border-border rounded px-2 py-2 text-sm min-h-[220px] bg-secondary/10"
                  />
                </div>
              </div>

              <div className="border border-border rounded-[var(--radius)] overflow-hidden">
                <div className="bg-secondary/40 border-b border-border px-4 py-2">
                  <h3 className="text-sm font-semibold text-foreground">Citations preview</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Raw citation payload attached to this grounded answer.
                  </p>
                </div>
                <div className="p-4">
                  <textarea
                    value={JSON.stringify(draft.citations ?? [], null, 2)}
                    disabled
                    className="w-full border border-border rounded px-2 py-2 text-sm font-mono min-h-[180px] bg-secondary/10"
                  />
                </div>
              </div>
            </>
          ) : model.name === "prompt_templates" ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  "name",
                  "slug",
                  "purpose",
                  "language",
                  "is_active",
                  "created_at",
                  "updated_by",
                  "updated_at",
                ].map((key) => {
                  const type = model.columns.find((candidate) => candidate.key === key)?.type;
                  const label =
                    model.columns.find((candidate) => candidate.key === key)?.label ??
                    key.replace(/_/g, " ");
                  return (
                    <div
                      key={key}
                      className="border border-border rounded-[var(--radius)] p-3 bg-secondary/20"
                    >
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                      {key === "purpose" ? (
                        <select
                          value={String(draft.purpose ?? "system")}
                          disabled={busy}
                          onChange={(event) => setField("purpose", event.target.value)}
                          className="mt-2 w-full max-w-[220px] border border-border rounded px-2 py-1 text-sm bg-card"
                        >
                          <option value="system">system</option>
                          <option value="followup">followup</option>
                          <option value="rewrite">rewrite</option>
                        </select>
                      ) : key === "language" ? (
                        <select
                          value={String(draft.language ?? "EN")}
                          disabled={busy}
                          onChange={(event) => setField("language", event.target.value)}
                          className="mt-2 w-full max-w-[220px] border border-border rounded px-2 py-1 text-sm bg-card"
                        >
                          <option value="EN">EN</option>
                          <option value="RN">RN</option>
                        </select>
                      ) : key === "is_active" ? (
                        <div className="mt-2">
                          <input
                            type="checkbox"
                            checked={Boolean(draft.is_active)}
                            disabled={busy}
                            onChange={(event) => setField("is_active", event.target.checked)}
                          />
                        </div>
                      ) : ["created_at", "updated_by", "updated_at"].includes(key) ? (
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {formatCell(draft[key], type)}
                        </p>
                      ) : (
                        <input
                          value={draft[key] == null ? "" : String(draft[key])}
                          disabled={busy}
                          onChange={(event) => setField(key, event.target.value)}
                          className="mt-2 w-full border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-[180px_1fr] gap-4 items-start">
                <label className="text-sm font-semibold text-foreground pt-1.5 text-right">
                  Description:
                </label>
                <textarea
                  value={String(draft.description ?? "")}
                  disabled={busy}
                  onChange={(event) => setField("description", event.target.value)}
                  className="w-full border border-border rounded px-2 py-1 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="border border-border rounded-[var(--radius)] overflow-hidden">
                <div className="bg-secondary/40 border-b border-border px-4 py-2">
                  <h3 className="text-sm font-semibold text-foreground">Prompt content</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Keep one active template per purpose/language pair. Saving an active template will deactivate the previous one automatically.
                  </p>
                </div>
                <div className="p-4">
                  <textarea
                    value={String(draft.content ?? "")}
                    disabled={busy}
                    onChange={(event) => setField("content", event.target.value)}
                    className="w-full border border-border rounded px-2 py-2 text-sm font-mono min-h-[320px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </>
          ) : model.name === "chat_sessions" && !isNew ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  "user_id",
                  "user_full_name",
                  "user_email",
                  "session_count",
                  "message_count",
                  "last_session_at",
                ].map((key) => {
                  const val = draft[key];
                  const type = model.columns.find((candidate) => candidate.key === key)?.type;
                  const label =
                    model.columns.find((candidate) => candidate.key === key)?.label ??
                    key.replace(/_/g, " ");
                  return (
                    <div
                      key={key}
                      className="border border-border rounded-[var(--radius)] p-3 bg-secondary/20"
                    >
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {formatCell(val, type)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="border border-border rounded-[var(--radius)] overflow-hidden">
                <div className="bg-secondary/40 border-b border-border px-4 py-2">
                  <h3 className="text-sm font-semibold text-foreground">User sessions</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sessions stored in `chat_sessions` for this selected user, with nested messages from `chat_messages`.
                  </p>
                </div>
                <div className="p-4 space-y-4">
                  {Array.isArray(draft.sessions) && draft.sessions.length ? (
                    (draft.sessions as Array<Record<string, unknown>>).map((session, sessionIndex) => (
                      <div
                        key={String(session.id ?? sessionIndex)}
                        className="border border-border rounded-[var(--radius)] overflow-hidden"
                      >
                        <div className="bg-[oklch(0.96_0.004_230)] border-b border-border px-4 py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="text-sm font-semibold text-foreground">
                                {formatCell(session.title)}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                Session ID: {formatCell(session.id)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Subject: {formatCell(session.subjectContext)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Tags: {formatCell(session.subjectTags, "array")}
                              </p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <p>Messages: {formatCell(session.messageCount, "int")}</p>
                              <p className="mt-1">Created: {formatCell(session.createdAt, "date")}</p>
                              <p className="mt-1">Updated: {formatCell(session.updatedAt, "date")}</p>
                            </div>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-[oklch(0.94_0.005_230)] border-b border-border text-left">
                                {["id", "role", "language", "grounded", "feedback", "created_at", "content"].map(
                                  (label) => (
                                    <th
                                      key={label}
                                      className="px-3 py-2 font-semibold text-[12px] uppercase tracking-wide text-foreground"
                                    >
                                      {label.replace(/_/g, " ")}
                                    </th>
                                  ),
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.isArray(session.linkedMessages) && session.linkedMessages.length ? (
                                (session.linkedMessages as Array<Record<string, unknown>>).map(
                                  (entry, index) => (
                                    <tr
                                      key={String(entry.id ?? index)}
                                      className={index % 2 ? "bg-[oklch(0.98_0.003_230)]" : ""}
                                    >
                                      <td className="px-3 py-2 align-top">{formatCell(entry.id)}</td>
                                      <td className="px-3 py-2 align-top">{formatCell(entry.role)}</td>
                                      <td className="px-3 py-2 align-top">
                                        {formatCell(entry.language)}
                                      </td>
                                      <td className="px-3 py-2 align-top">
                                        {formatCell(entry.grounded, "bool")}
                                      </td>
                                      <td className="px-3 py-2 align-top">
                                        {formatCell(entry.feedback)}
                                      </td>
                                      <td className="px-3 py-2 align-top">
                                        {formatCell(entry.createdAt, "date")}
                                      </td>
                                      <td className="px-3 py-2 align-top">
                                        {formatCell(entry.content)}
                                      </td>
                                    </tr>
                                  ),
                                )
                              ) : (
                                <tr>
                                  <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={7}>
                                    No messages found for this session.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No sessions found for this user.</p>
                  )}
                </div>
              </div>
            </>
          ) : model.name === "chat_messages" && !isNew ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  "user_id",
                  "user_full_name",
                  "user_email",
                  "session_count",
                  "message_count",
                  "last_message_at",
                ].map((key) => {
                  const val = draft[key];
                  const type = model.columns.find((candidate) => candidate.key === key)?.type;
                  const label =
                    model.columns.find((candidate) => candidate.key === key)?.label ??
                    key.replace(/_/g, " ");
                  return (
                    <div
                      key={key}
                      className="border border-border rounded-[var(--radius)] p-3 bg-secondary/20"
                    >
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {formatCell(val, type)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="border border-border rounded-[var(--radius)] overflow-hidden">
                <div className="bg-secondary/40 border-b border-border px-4 py-2">
                  <h3 className="text-sm font-semibold text-foreground">User messages</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Messages stored in `chat_messages` for this selected user, grouped across sessions.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[oklch(0.94_0.005_230)] border-b border-border text-left">
                        {[
                          "id",
                          "session_title",
                          "subject_context",
                          "role",
                          "language",
                          "grounded",
                          "feedback",
                          "created_at",
                          "content",
                        ].map((label) => (
                          <th
                            key={label}
                            className="px-3 py-2 font-semibold text-[12px] uppercase tracking-wide text-foreground"
                          >
                            {label.replace(/_/g, " ")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(draft.messages) && draft.messages.length ? (
                        (draft.messages as Array<Record<string, unknown>>).map((entry, index) => (
                          <tr
                            key={String(entry.id ?? index)}
                            className={index % 2 ? "bg-[oklch(0.98_0.003_230)]" : ""}
                          >
                            <td className="px-3 py-2 align-top">{formatCell(entry.id)}</td>
                            <td className="px-3 py-2 align-top">
                              {formatCell(entry.sessionTitle)}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {formatCell(entry.subjectContext)}
                            </td>
                            <td className="px-3 py-2 align-top">{formatCell(entry.role)}</td>
                            <td className="px-3 py-2 align-top">{formatCell(entry.language)}</td>
                            <td className="px-3 py-2 align-top">
                              {formatCell(entry.grounded, "bool")}
                            </td>
                            <td className="px-3 py-2 align-top">{formatCell(entry.feedback)}</td>
                            <td className="px-3 py-2 align-top">
                              {formatCell(entry.createdAt, "date")}
                            </td>
                            <td className="px-3 py-2 align-top">{formatCell(entry.content)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={9}>
                            No messages found for this user.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            keys.map((k) => {
              const col = model.columns.find((c) => c.key === k);
              const val = draft[k];
              const type = col?.type;
              return (
                <div key={k} className="grid grid-cols-[180px_1fr] gap-4 items-start">
                  <label className="text-sm font-semibold text-foreground pt-1.5 text-right">
                    {col?.label ?? k.replace(/_/g, " ")}:
                  </label>
                  <div>
                    {type === "bool" ? (
                      <input
                        type="checkbox"
                        checked={!!val}
                        disabled={busy}
                        onChange={(event) => setField(k, event.target.checked)}
                      />
                    ) : type === "json" || typeof val === "object" ? (
                      <textarea
                        value={typeof val === "string" ? val : JSON.stringify(val ?? {}, null, 2)}
                        disabled={busy}
                        onChange={(event) => setField(k, event.target.value)}
                        className="w-full border border-border rounded px-2 py-1 text-sm font-mono min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    ) : (
                      <input
                        value={val == null ? "" : String(val)}
                        disabled={busy}
                        onChange={(event) => setField(k, event.target.value)}
                        className="w-full max-w-[520px] border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {type === "fk" && "Foreign key reference."}
                      {type === "uuid" && "Universally unique identifier."}
                      {type === "date" && "Format: YYYY-MM-DD HH:MM:SS"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="bg-[oklch(0.94_0.005_230)] border-t border-border px-5 py-3 flex items-center justify-between">
          <button
            type="button"
            disabled={!canDelete || !!busy}
            onClick={() => void onDelete(draft)}
            className="text-xs text-white px-3 py-2 rounded font-semibold"
            style={{ background: "var(--color-danger)" }}
          >
            Delete
          </button>
          <div className="flex gap-2">
            {canSave ? (
              <>
                {model.name === "credits_ledger" && !isNew ? (
                  <span className="self-center text-xs text-muted-foreground">
                    User ledger view. Add manual adjustments from the panel above.
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void onSave(draft, isNew)}
                      disabled={!!busy}
                      className="text-xs px-3 py-2 rounded border border-border bg-card hover:bg-secondary"
                    >
                      Save and continue editing
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await onSave(draft, isNew);
                        onBack();
                      }}
                      disabled={!!busy}
                      className="text-xs px-3 py-2 rounded border border-border bg-card hover:bg-secondary"
                    >
                      Save and add another
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await onSave(draft, isNew);
                        onBack();
                      }}
                      disabled={!!busy}
                      className="text-xs px-3 py-2 rounded font-semibold text-white"
                      style={{ background: "var(--color-success)" }}
                    >
                      SAVE
                    </button>
                  </>
                )}
              </>
            ) : (
              <span className="self-center text-xs text-muted-foreground">
                Read-only table view
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function groupModelsByApp(models: Model[]) {
  const map = new Map<string, Model[]>();
  for (const model of models) {
    const list = map.get(model.app) ?? [];
    list.push(model);
    map.set(model.app, list);
  }
  return Array.from(map.entries());
}

function LoadingCard() {
  return (
    <div className="bg-card border border-border rounded-[var(--radius)] px-5 py-6 text-sm text-muted-foreground">
      Connecting to admin API and loading models...
    </div>
  );
}

function ErrorCard({ message, warnings }: { message: string; warnings: string[] }) {
  const needsLogin = message.toLowerCase().includes("unauthorized");
  return (
    <div className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
      <h2 className="bg-primary text-primary-foreground text-[12px] uppercase tracking-wide font-semibold px-3 py-1.5">
        Connection issue
      </h2>
      <div className="px-4 py-4 text-sm">
        <p className="text-danger font-semibold">{message}</p>
        <p className="mt-2 text-muted-foreground">
          Make sure you are logged in as admin and the backend API is reachable at the same origin.
        </p>
        {needsLogin ? (
          <div className="mt-3">
            <a
              href="/login"
              className="inline-flex text-xs font-semibold px-3 py-1.5 rounded-[var(--radius)] bg-primary text-primary-foreground"
            >
              Go to login
            </a>
          </div>
        ) : null}
        {warnings.length ? (
          <ul className="mt-3 list-disc pl-5 text-xs text-muted-foreground space-y-1">
            {warnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function WarningCard({ warnings }: { warnings: string[] }) {
  return (
    <div className="mb-4 bg-card border border-border rounded-[var(--radius)] px-4 py-3 text-xs text-muted-foreground">
      <p className="font-semibold text-foreground">Some resources could not be loaded:</p>
      <ul className="mt-2 list-disc pl-5 space-y-1">
        {warnings.map((warning, index) => (
          <li key={`${warning}-${index}`}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}

function formatCell(val: unknown, type?: Column["type"]) {
  if (val == null) return <span className="text-muted-foreground italic">-</span>;
  if (type === "bool") return val ? "✓" : "✗";
  if (type === "uuid") return <span className="font-mono text-xs">{String(val).slice(0, 8)}…</span>;
  if (type === "fk")
    return <span className="font-mono text-xs text-link">{String(val).slice(0, 8)}…</span>;
  if (type === "array" && Array.isArray(val)) return val.join(", ");
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object")
    return <span className="font-mono text-xs">{JSON.stringify(val).slice(0, 40)}…</span>;
  const s = String(val);
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
}
