import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { models, modelsByApp, getModel, type Model, type Column } from "@/lib/admin-data";

export const Route = createFileRoute("/")({
  component: Admin,
  head: () => ({
    meta: [
      { title: "Nano Syllabus administration" },
      { name: "description", content: "Django-style admin panel for Nano Syllabus" },
    ],
  }),
});

function Admin() {
  const [active, setActive] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<Record<string, any> | null>(null);

  const model = active ? getModel(active) ?? null : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Breadcrumbs
        model={model}
        selectedRow={selectedRow}
        onHome={() => { setActive(null); setSelectedRow(null); }}
        onBackToList={() => setSelectedRow(null)}
      />
      <div className="mx-auto max-w-[1400px] px-5 py-6 grid grid-cols-[1fr_280px] gap-6">
        <main>
          {!model && <Dashboard onPick={(n) => { setActive(n); setSelectedRow(null); }} />}
          {model && !selectedRow && (
            <ListView model={model} onOpen={(row) => setSelectedRow(row)} />
          )}
          {model && selectedRow && (
            <DetailView model={model} row={selectedRow} onBack={() => setSelectedRow(null)} />
          )}
        </main>
        <Sidebar
          activeModel={active}
          onPick={(n) => { setActive(n); setSelectedRow(null); }}
          onHome={() => { setActive(null); setSelectedRow(null); }}
        />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-[1400px] px-5 py-2 flex items-center justify-between">
        <h1 className="text-[18px] font-normal">
          <span className="opacity-90">Nano Syllabus</span> administration
        </h1>
        <div className="text-xs flex items-center gap-3">
          <span className="opacity-90">Welcome,</span>
          <strong className="font-semibold">ADMIN</strong>
          <a className="text-primary-foreground/90 hover:underline" href="#">View site</a>
          <span className="opacity-50">/</span>
          <a className="text-primary-foreground/90 hover:underline" href="#">Change password</a>
          <span className="opacity-50">/</span>
          <a className="text-primary-foreground/90 hover:underline" href="#">Log out</a>
        </div>
      </div>
    </header>
  );
}

function Breadcrumbs({
  model, selectedRow, onHome, onBackToList,
}: {
  model: Model | null;
  selectedRow: Record<string, any> | null;
  onHome: () => void;
  onBackToList: () => void;
}) {
  return (
    <div className="bg-[oklch(0.96_0.005_230)] border-b border-border">
      <div className="mx-auto max-w-[1400px] px-5 py-2 text-xs text-muted-foreground">
        <button onClick={onHome} className="text-link hover:underline">Home</button>
        {model && (
          <>
            <span className="mx-1">›</span>
            <span className="text-link">{model.app}</span>
            <span className="mx-1">›</span>
            {selectedRow ? (
              <button onClick={onBackToList} className="text-link hover:underline">{model.verbosePlural}</button>
            ) : (
              <span className="text-foreground">{model.verbosePlural}</span>
            )}
            {selectedRow && (
              <>
                <span className="mx-1">›</span>
                <span className="text-foreground truncate">{String(selectedRow.id).slice(0, 8)}…</span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Sidebar({
  activeModel, onPick, onHome,
}: { activeModel: string | null; onPick: (n: string) => void; onHome: () => void }) {
  return (
    <aside className="space-y-4">
      <Module title="Recent actions">
        <div className="px-3 py-2 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">My actions</p>
          <ul className="space-y-1">
            <li><a href="#" className="text-link hover:underline">Aarav Sharma</a> <span className="text-muted-foreground">· User</span></li>
            <li><a href="#" className="text-link hover:underline">Pro plan</a> <span className="text-muted-foreground">· Subscription plan</span></li>
            <li><a href="#" className="text-link hover:underline">INV-1042</a> <span className="text-muted-foreground">· Invoice</span></li>
            <li><a href="#" className="text-link hover:underline">Tutor Default</a> <span className="text-muted-foreground">· Prompt template</span></li>
          </ul>
        </div>
      </Module>
      <Module title="Navigation">
        <ul className="text-xs">
          <li>
            <button onClick={onHome} className={`block w-full text-left px-3 py-1.5 ${!activeModel ? "bg-secondary font-semibold" : "hover:bg-secondary"}`}>
              Site administration
            </button>
          </li>
          {models.map((m) => (
            <li key={m.name}>
              <button
                onClick={() => onPick(m.name)}
                className={`block w-full text-left px-3 py-1.5 ${activeModel === m.name ? "bg-secondary font-semibold text-foreground" : "text-link hover:bg-secondary"}`}
              >
                {m.verbosePlural}
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

function Dashboard({ onPick }: { onPick: (n: string) => void }) {
  const grouped = modelsByApp();
  return (
    <div className="space-y-5">
      {grouped.map(([app, list]) => (
        <section key={app} className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
          <h2 className="bg-primary text-primary-foreground text-[12px] uppercase tracking-wide font-semibold px-3 py-1.5 flex justify-between">
            <span>{app}</span>
            <a href="#" className="text-primary-foreground/80 hover:text-primary-foreground normal-case font-normal text-[11px]">+ Add</a>
          </h2>
          <table className="w-full text-sm">
            <tbody>
              {list.map((m, i) => (
                <tr key={m.name} className={i % 2 ? "bg-[oklch(0.98_0.003_230)]" : ""}>
                  <td className="px-3 py-2 w-2/3">
                    <button onClick={() => onPick(m.name)} className="text-link hover:underline font-medium">
                      {m.verbosePlural}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    <a href="#" className="text-link hover:underline mr-3">+ Add</a>
                    <button onClick={() => onPick(m.name)} className="text-link hover:underline">Change</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

function ListView({ model, onOpen }: { model: Model; onOpen: (row: Record<string, any>) => void }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!q) return model.rows;
    const s = q.toLowerCase();
    return model.rows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(s))
    );
  }, [q, model.rows]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[20px] font-normal text-foreground">Select {model.verbose.toLowerCase()} to change</h1>
        <a href="#" className="bg-success text-white text-xs font-semibold px-3 py-2 rounded-[var(--radius)] hover:opacity-90"
           style={{ background: "var(--color-success)", color: "white" }}>
          ADD {model.verbose.toUpperCase()} +
        </a>
      </div>

      <div className="bg-card border border-border rounded-[var(--radius)]">
        <div className="p-3 border-b border-border flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="flex-1 border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded">Search</button>
        </div>

        <div className="px-3 py-2 border-b border-border bg-secondary/40 text-xs flex items-center gap-2">
          <label className="text-muted-foreground">Action:</label>
          <select className="border border-border rounded px-1 py-0.5 text-xs bg-card">
            <option>---------</option>
            <option>Delete selected {model.verbosePlural.toLowerCase()}</option>
          </select>
          <button className="border border-border bg-card px-2 py-0.5 text-xs rounded hover:bg-secondary">Go</button>
          <span className="ml-2 text-muted-foreground">
            {selected.size} of {filtered.length} selected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[oklch(0.94_0.005_230)] border-b border-border text-left">
                <th className="px-2 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      const next = new Set(selected);
                      filtered.forEach((r) => e.target.checked ? next.add(r.id) : next.delete(r.id));
                      setSelected(next);
                    }}
                  />
                </th>
                {model.columns.map((c) => (
                  <th key={c.key} className="px-3 py-2 font-semibold text-[12px] uppercase tracking-wide text-foreground border-r border-border last:border-r-0">
                    {c.label} ▾
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id} className={`border-b border-border ${i % 2 ? "bg-[oklch(0.98_0.003_230)]" : ""}`}>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        e.target.checked ? next.add(row.id) : next.delete(row.id);
                        setSelected(next);
                      }}
                    />
                  </td>
                  {model.columns.map((c, ci) => (
                    <td key={c.key} className="px-3 py-2 align-top">
                      {ci === 0 || ci === 1 ? (
                        <button onClick={() => onOpen(row)} className="text-link hover:underline font-medium">
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
          {filtered.length} {filtered.length === 1 ? model.verbose.toLowerCase() : model.verbosePlural.toLowerCase()}
        </div>
      </div>
    </div>
  );
}

function DetailView({ model, row, onBack }: { model: Model; row: Record<string, any>; onBack: () => void }) {
  const keys = Object.keys(row);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[20px] font-normal">Change {model.verbose.toLowerCase()}</h1>
        <a href="#" className="text-xs text-link hover:underline">History</a>
      </div>
      <div className="bg-card border border-border rounded-[var(--radius)]">
        <h2 className="bg-primary text-primary-foreground text-[12px] uppercase tracking-wide font-semibold px-3 py-1.5">
          {model.verbose}
        </h2>
        <div className="p-5 space-y-4">
          {keys.map((k) => {
            const col = model.columns.find((c) => c.key === k);
            const val = row[k];
            const type = col?.type;
            return (
              <div key={k} className="grid grid-cols-[180px_1fr] gap-4 items-start">
                <label className="text-sm font-semibold text-foreground pt-1.5 text-right">
                  {col?.label ?? k.replace(/_/g, " ")}:
                </label>
                <div>
                  {type === "bool" ? (
                    <input type="checkbox" defaultChecked={!!val} />
                  ) : type === "json" || typeof val === "object" ? (
                    <textarea
                      defaultValue={JSON.stringify(val, null, 2)}
                      className="w-full border border-border rounded px-2 py-1 text-sm font-mono min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <input
                      defaultValue={val == null ? "" : String(val)}
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
          })}
        </div>
        <div className="bg-[oklch(0.94_0.005_230)] border-t border-border px-5 py-3 flex items-center justify-between">
          <button
            className="text-xs text-white px-3 py-2 rounded font-semibold"
            style={{ background: "var(--color-danger)" }}
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button onClick={onBack} className="text-xs px-3 py-2 rounded border border-border bg-card hover:bg-secondary">
              Save and continue editing
            </button>
            <button onClick={onBack} className="text-xs px-3 py-2 rounded border border-border bg-card hover:bg-secondary">
              Save and add another
            </button>
            <button
              onClick={onBack}
              className="text-xs px-3 py-2 rounded font-semibold text-white"
              style={{ background: "var(--color-success)" }}
            >
              SAVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCell(val: any, type?: Column["type"]) {
  if (val == null) return <span className="text-muted-foreground italic">-</span>;
  if (type === "bool") return val ? "✓" : "✗";
  if (type === "uuid") return <span className="font-mono text-xs">{String(val).slice(0, 8)}…</span>;
  if (type === "fk") return <span className="font-mono text-xs text-link">{String(val).slice(0, 8)}…</span>;
  if (type === "array" && Array.isArray(val)) return val.join(", ");
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object") return <span className="font-mono text-xs">{JSON.stringify(val).slice(0, 40)}…</span>;
  const s = String(val);
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
}
