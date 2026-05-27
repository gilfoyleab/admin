import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { hasActiveAdminSession } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AdminListPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type NotebookSummary = {
  id: string;
  title: string;
  board: string;
  level: string;
  faculty: string;
  subject: string;
  curriculum: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  resourceCount: number;
  readyChunkCount: number;
};

type ResourceItem = {
  id: string;
  notebookId: string | null;
  notebookTitle: string | null;
  board: string;
  grade: string;
  faculty: string;
  curriculum: string;
  subject: string;
  chapter: string | null;
  resourceKind: string;
  resourceSubtype: string;
  title: string;
  sourceName: string;
  sourceType: string;
  storageBucket: string | null;
  storagePath: string | null;
  sourceMimeType: string | null;
  sourceSizeBytes: number | null;
  documentType: string;
  rawContent: string;
  chunkCount: number;
  processingStatus: string;
  processingError: string | null;
  uploadedAt: string;
  updatedAt: string;
};

type NotebookDetail = NotebookSummary & {
  resources: ResourceItem[];
  resourceTotal: number;
  resourcePage: number;
  resourcePageSize: number;
  resourceTotalPages: number;
  selectedResourceChunkTotal: number;
  selectedResourceChunks: ChunkPreviewItem[];
};

type ChunkPreviewItem = {
  id: string;
  chunkIndex: number;
  content: string;
  board: string;
  grade: string;
  subject: string;
  chapter: string | null;
  topic: string | null;
};

type NotebookFormState = {
  title: string;
  board: string;
  level: string;
  faculty: string;
  subject: string;
  curriculum: string;
  description: string;
};

type ResourceFormState = {
  resourceKind: string;
  resourceSubtype: string;
  title: string;
  chapter: string;
  sourceName: string;
  sourceType: string;
  rawContent: string;
};

const RESOURCE_KIND_OPTIONS = [
  { value: "syllabus", label: "Syllabus" },
  { value: "study_material", label: "Study material" },
  { value: "question_bank", label: "Question bank" },
];

const RESOURCE_SUBTYPE_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  syllabus: [
    { value: "curriculum", label: "Curriculum" },
    { value: "syllabus", label: "Syllabus" },
    { value: "micro_syllabus", label: "Micro-syllabus" },
    { value: "learning_outcomes", label: "Learning outcomes" },
  ],
  study_material: [
    { value: "textbook", label: "Textbook" },
    { value: "notes", label: "Notes" },
    { value: "solutions", label: "Solutions" },
    { value: "guides", label: "Guides" },
    { value: "other", label: "Other" },
  ],
  question_bank: [
    { value: "question_bank", label: "Question bank" },
    { value: "past_questions", label: "Past questions" },
    { value: "example_questions", label: "Example questions" },
    { value: "other", label: "Other" },
  ],
};

const EMPTY_NOTEBOOK: NotebookFormState = {
  title: "",
  board: "NEB",
  level: "Class 11",
  faculty: "",
  subject: "",
  curriculum: "",
  description: "",
};

const EMPTY_RESOURCE: ResourceFormState = {
  resourceKind: "study_material",
  resourceSubtype: "textbook",
  title: "",
  chapter: "",
  sourceName: "",
  sourceType: "manual_text",
  rawContent: "",
};

type StatusMeta = {
  label: string;
  tone: string;
};

function getNotebookStatusMeta(notebook: NotebookSummary): StatusMeta {
  if (notebook.resourceCount <= 0) {
    return {
      label: "Empty",
      tone: "border-slate-200 bg-slate-100 text-slate-700",
    };
  }

  if (notebook.readyChunkCount > 0) {
    return {
      label: "Ready",
      tone: "border-emerald-200 bg-emerald-100 text-emerald-700",
    };
  }

  return {
    label: "Needs processing",
    tone: "border-amber-200 bg-amber-100 text-amber-800",
  };
}

function getResourceStatusMeta(resource: ResourceItem): StatusMeta {
  const hasRawContent = resource.rawContent.trim().length > 0;
  const hasSourceFile = Boolean(resource.storagePath);

  if (resource.processingStatus === "ready" && resource.chunkCount > 0) {
    return {
      label: "Ready",
      tone: "border-emerald-200 bg-emerald-100 text-emerald-700",
    };
  }

  if (!hasRawContent && !hasSourceFile) {
    return {
      label: "Missing file",
      tone: "border-rose-200 bg-rose-100 text-rose-700",
    };
  }

  if (resource.processingStatus === "failed") {
    return {
      label: "Failed",
      tone: "border-rose-200 bg-rose-100 text-rose-700",
    };
  }

  if (resource.processingStatus === "processing") {
    return {
      label: "Processing",
      tone: "border-sky-200 bg-sky-100 text-sky-700",
    };
  }

  return {
    label: "Draft",
    tone: "border-amber-200 bg-amber-100 text-amber-800",
  };
}

export const Route = createFileRoute("/notebooks")({
  component: NotebookWorkspacePage,
  head: () => ({
    meta: [{ title: "Admin notebooks" }],
  }),
});

export function NotebookWorkspaceAppPage() {
  return <NotebookWorkspacePage />;
}

function NotebookWorkspacePage() {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    | "idle"
    | "loading"
    | "savingNotebook"
    | "deletingNotebook"
    | "savingResource"
    | "processing"
    | "deletingResource"
    | "uploading"
    | "uploadProcessing"
    | "bulkProcessing"
  >("idle");
  const [notebookListLoading, setNotebookListLoading] = useState(false);

  const [notebooks, setNotebooks] = useState<NotebookSummary[]>([]);
  const [notebookPage, setNotebookPage] = useState(1);
  const [notebookPageSize, setNotebookPageSize] = useState(20);
  const [notebookTotal, setNotebookTotal] = useState(0);
  const [notebookTotalPages, setNotebookTotalPages] = useState(1);
  const [query, setQuery] = useState("");

  const [selectedNotebookId, setSelectedNotebookId] = useState<string>("new");
  const [selectedNotebookIds, setSelectedNotebookIds] = useState<string[]>([]);
  const [notebookDetail, setNotebookDetail] = useState<NotebookDetail | null>(null);
  const [notebookForm, setNotebookForm] = useState<NotebookFormState>(EMPTY_NOTEBOOK);

  const [resourceQuery, setResourceQuery] = useState("");
  const [resourcePage, setResourcePage] = useState(1);
  const [resourcePageSize, setResourcePageSize] = useState(20);
  const [resourceTotal, setResourceTotal] = useState(0);
  const [resourceTotalPages, setResourceTotalPages] = useState(1);
  const [selectedResourceId, setSelectedResourceId] = useState<string>("new");
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [resourceForm, setResourceForm] = useState<ResourceFormState>(EMPTY_RESOURCE);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAutoProcess, setUploadAutoProcess] = useState(true);

  function syncWorkspaceUrl(params: { notebookId?: string | null; resourceId?: string | null }) {
    const nextUrl = new URL(window.location.href);
    const notebookId = params.notebookId?.trim();
    const resourceId = params.resourceId?.trim();

    if (notebookId && notebookId !== "new") {
      nextUrl.searchParams.set("notebookId", notebookId);
    } else {
      nextUrl.searchParams.delete("notebookId");
    }

    if (resourceId && resourceId !== "new") {
      nextUrl.searchParams.set("resourceId", resourceId);
    } else {
      nextUrl.searchParams.delete("resourceId");
    }

    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}`);
  }

  const selectedResource = useMemo(
    () =>
      selectedResourceId === "new"
        ? null
        : notebookDetail?.resources.find((resource) => resource.id === selectedResourceId) ?? null,
    [notebookDetail, selectedResourceId],
  );

  const subtypeOptions =
    RESOURCE_SUBTYPE_OPTIONS[resourceForm.resourceKind] ?? RESOURCE_SUBTYPE_OPTIONS.study_material;

  const refreshNotebooks = useCallback(
    async (nextNotebookId?: string, requestedPage?: number) => {
      const targetPage = requestedPage ?? notebookPage;
      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("pageSize", String(notebookPageSize));
      if (query.trim()) params.set("q", query.trim());

      setNotebookListLoading(true);
      const response = await fetch(`/api/admin/notebooks?${params.toString()}`, {
        credentials: "include",
      });
      const payload = (await response.json()) as AdminListPage<NotebookSummary> & { error?: string };
      setNotebookListLoading(false);

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load notebooks.");
      }

      setNotebooks(payload.items);
      setNotebookPage(payload.page);
      setNotebookPageSize(payload.pageSize);
      setNotebookTotal(payload.total);
      setNotebookTotalPages(payload.totalPages);
      setSelectedNotebookId((current) => {
        if (nextNotebookId) return nextNotebookId;
        return payload.items.some((item) => item.id === current) ? current : (payload.items[0]?.id ?? "new");
      });
    },
    [notebookPage, notebookPageSize, query],
  );

  const loadNotebookDetail = useCallback(
    async (notebookId: string, options?: { resourcePage?: number; resourceQ?: string }) => {
      const params = new URLSearchParams();
      params.set("resourcePage", String(options?.resourcePage ?? resourcePage));
      params.set("resourcePageSize", String(resourcePageSize));
      const nextResourceQ = options?.resourceQ ?? resourceQuery;
      if (nextResourceQ.trim()) params.set("resourceQ", nextResourceQ.trim());
      const targetResourceId =
        selectedResourceId !== "new" ? selectedResourceId : undefined;
      if (targetResourceId) params.set("selectedResourceId", targetResourceId);

      const response = await fetch(`/api/admin/notebooks/${notebookId}?${params.toString()}`, {
        credentials: "include",
      });
      const payload = (await response.json()) as { notebook?: NotebookDetail; error?: string };
      if (!response.ok || !payload.notebook) {
        throw new Error(payload.error ?? "Failed to load notebook detail.");
      }

      const notebook = payload.notebook;
      setNotebookDetail(notebook);
      setNotebookForm({
        title: notebook.title,
        board: notebook.board,
        level: notebook.level,
        faculty: notebook.faculty,
        subject: notebook.subject,
        curriculum: notebook.curriculum,
        description: notebook.description,
      });
      setResourcePage(notebook.resourcePage);
      setResourcePageSize(notebook.resourcePageSize);
      setResourceTotal(notebook.resourceTotal);
      setResourceTotalPages(notebook.resourceTotalPages);

      setSelectedResourceId((currentResourceId) => {
        const nextId =
          notebook.resources.find((resource) => resource.id === currentResourceId)?.id ??
          notebook.resources[0]?.id ??
          "new";
        const resource = notebook.resources.find((item) => item.id === nextId) ?? null;
        setResourceForm(resource ? toResourceFormState(resource) : EMPTY_RESOURCE);
        return nextId;
      });

      return notebook;
    },
    [resourcePage, resourcePageSize, resourceQuery, selectedResourceId],
  );

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const activeSession = await hasActiveAdminSession();
        if (!activeSession) {
          window.location.assign("/login");
          return;
        }
        const url = new URL(window.location.href);
        const notebookIdFromUrl = url.searchParams.get("notebookId")?.trim() || undefined;
        const resourceIdFromUrl = url.searchParams.get("resourceId")?.trim() || undefined;
        if (resourceIdFromUrl) {
          setSelectedResourceId(resourceIdFromUrl);
        }
        await refreshNotebooks(notebookIdFromUrl, 1);
      } catch (error) {
        if (!cancelled) {
          setFeedback(error instanceof Error ? error.message : "Failed to load notebook workspace.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [refreshNotebooks]);

  useEffect(() => {
    if (loading) return;
    if (selectedNotebookId === "new") {
      setNotebookDetail(null);
      setNotebookForm(EMPTY_NOTEBOOK);
      setSelectedResourceId("new");
      setResourceForm(EMPTY_RESOURCE);
      setResourceTotal(0);
      setResourceTotalPages(1);
      return;
    }

    let cancelled = false;
    async function run() {
      setBusy("loading");
      try {
        await loadNotebookDetail(selectedNotebookId);
      } catch (error) {
        if (!cancelled) {
          setFeedback(error instanceof Error ? error.message : "Failed to load notebook.");
        }
      } finally {
        if (!cancelled) setBusy("idle");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [loading, selectedNotebookId, resourcePage, resourcePageSize, resourceQuery, loadNotebookDetail]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshNotebooks(undefined, 1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, refreshNotebooks]);

  useEffect(() => {
    setSelectedNotebookIds((current) =>
      current.filter((id) => notebooks.some((notebook) => notebook.id === id)),
    );
  }, [notebooks]);

  useEffect(() => {
    if (!notebookDetail) {
      setSelectedResourceIds([]);
      return;
    }
    setSelectedResourceIds((current) =>
      current.filter((id) => notebookDetail.resources.some((resource) => resource.id === id)),
    );
  }, [notebookDetail]);

  useEffect(() => {
    if (selectedResourceId === "new") {
      setResourceForm(EMPTY_RESOURCE);
      return;
    }
    if (!selectedResource) return;
    setResourceForm(toResourceFormState(selectedResource));
  }, [selectedResource, selectedResourceId]);

  useEffect(() => {
    if (loading) return;
    syncWorkspaceUrl({
      notebookId: selectedNotebookId,
      resourceId: selectedResourceId,
    });
  }, [loading, selectedNotebookId, selectedResourceId]);

  function resetNotebookForm() {
    setSelectedNotebookId("new");
    setNotebookDetail(null);
    setNotebookForm(EMPTY_NOTEBOOK);
    setSelectedResourceId("new");
    setResourceForm(EMPTY_RESOURCE);
    setResourceQuery("");
    setResourcePage(1);
    setResourceTotal(0);
    setResourceTotalPages(1);
    setUploadFile(null);
    setFeedback(null);
    syncWorkspaceUrl({ notebookId: null, resourceId: null });
  }

  function startNewResource() {
    setSelectedResourceId("new");
    setResourceForm(EMPTY_RESOURCE);
    setUploadFile(null);
    setFeedback(null);
  }

  function updateNotebook<K extends keyof NotebookFormState>(key: K, value: NotebookFormState[K]) {
    setNotebookForm((current) => ({ ...current, [key]: value }));
  }

  function updateResource<K extends keyof ResourceFormState>(key: K, value: ResourceFormState[K]) {
    setResourceForm((current) => ({ ...current, [key]: value }));
  }

  async function saveNotebook() {
    setBusy("savingNotebook");
    setFeedback(null);
    try {
      const response = await fetch(
        selectedNotebookId === "new" ? "/api/admin/notebooks" : `/api/admin/notebooks/${selectedNotebookId}`,
        {
          method: selectedNotebookId === "new" ? "POST" : "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(notebookForm),
        },
      );
      const payload = (await response.json()) as { notebook?: { id?: string }; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to save notebook.");

      const notebookId = String(payload.notebook?.id ?? selectedNotebookId);
      await refreshNotebooks(notebookId, 1);
      await loadNotebookDetail(notebookId, { resourcePage: 1, resourceQ: "" });
      setResourceQuery("");
      setResourcePage(1);
      setFeedback(selectedNotebookId === "new" ? "Notebook created." : "Notebook updated.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to save notebook.");
    } finally {
      setBusy("idle");
    }
  }

  async function deleteNotebook() {
    if (!notebookDetail) return;
    const confirmed = window.confirm(`Delete notebook "${notebookDetail.title}" and all resources?`);
    if (!confirmed) return;

    setBusy("deletingNotebook");
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/notebooks/${notebookDetail.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to delete notebook.");
      await refreshNotebooks(undefined, 1);
      resetNotebookForm();
      setFeedback("Notebook deleted.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to delete notebook.");
    } finally {
      setBusy("idle");
    }
  }

  async function saveResource() {
    const notebookId = notebookDetail?.id ?? selectedNotebookId;
    if (!notebookId || notebookId === "new") {
      setFeedback("Create notebook first, then add resource.");
      return;
    }

    setBusy("savingResource");
    setFeedback(null);
    try {
      const response = await fetch(
        selectedResourceId === "new"
          ? "/api/admin/knowledge-documents"
          : `/api/admin/knowledge-documents/${selectedResourceId}`,
        {
          method: selectedResourceId === "new" ? "POST" : "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            notebookId,
            board: notebookForm.board,
            grade: notebookForm.level,
            faculty: notebookForm.faculty,
            curriculum: notebookForm.curriculum,
            subject: notebookForm.subject,
            chapter: resourceForm.chapter.trim() || null,
            resourceKind: resourceForm.resourceKind,
            resourceSubtype: resourceForm.resourceSubtype,
            title: resourceForm.title,
            sourceName: resourceForm.sourceName,
            sourceType: resourceForm.sourceType,
            rawContent: resourceForm.rawContent,
          }),
        },
      );
      const payload = (await response.json()) as { document?: { id?: string }; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to save resource.");

      await refreshNotebooks(notebookId, notebookPage);
      const notebook = await loadNotebookDetail(notebookId, { resourcePage: 1, resourceQ: "" });
      setResourceQuery("");
      setResourcePage(1);
      const resourceId = String(payload.document?.id ?? "");
      const saved = notebook.resources.find((resource) => resource.id === resourceId) ?? null;
      setSelectedResourceId(saved?.id ?? "new");
      setResourceForm(saved ? toResourceFormState(saved) : EMPTY_RESOURCE);
      setFeedback(selectedResourceId === "new" ? "Resource created." : "Resource updated.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to save resource.");
    } finally {
      setBusy("idle");
    }
  }

  async function deleteResource() {
    if (!selectedResource) return;
    const confirmed = window.confirm(`Delete resource "${selectedResource.title}"?`);
    if (!confirmed) return;

    setBusy("deletingResource");
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/knowledge-documents/${selectedResource.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to delete resource.");

      await refreshNotebooks(selectedNotebookId, notebookPage);
      const notebook = await loadNotebookDetail(selectedNotebookId, { resourcePage });
      const first = notebook.resources[0] ?? null;
      setSelectedResourceId(first?.id ?? "new");
      setResourceForm(first ? toResourceFormState(first) : EMPTY_RESOURCE);
      setFeedback("Resource deleted.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to delete resource.");
    } finally {
      setBusy("idle");
    }
  }

  async function processResource() {
    if (!selectedResource) return;
    setBusy("processing");
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/knowledge-documents/${selectedResource.id}/process`, {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json()) as { document?: { chunkCount?: number }; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to process resource.");

      await refreshNotebooks(selectedNotebookId, notebookPage);
      const notebook = await loadNotebookDetail(selectedNotebookId, { resourcePage });
      const refreshed = notebook.resources.find((resource) => resource.id === selectedResource.id) ?? null;
      setSelectedResourceId(refreshed?.id ?? "new");
      setResourceForm(refreshed ? toResourceFormState(refreshed) : EMPTY_RESOURCE);
      setFeedback(
        `Processed successfully. ${refreshed?.chunkCount ?? payload.document?.chunkCount ?? 0} chunks ready.`,
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to process resource.");
    } finally {
      setBusy("idle");
    }
  }

  async function bulkProcessResources() {
    if (!selectedResourceIds.length) {
      setFeedback("Select at least one resource first.");
      return;
    }
    setBusy("bulkProcessing");
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/knowledge-documents/actions", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "process",
          documentIds: selectedResourceIds,
        }),
      });
      const payload = (await response.json()) as {
        total?: number;
        succeeded?: number;
        failed?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Failed to process selected resources.");

      await refreshNotebooks(selectedNotebookId, notebookPage);
      await loadNotebookDetail(selectedNotebookId, { resourcePage });
      setSelectedResourceIds([]);
      setFeedback(
        `Bulk processing complete: ${payload.succeeded ?? 0}/${payload.total ?? selectedResourceIds.length} succeeded.`,
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to process selected resources.");
    } finally {
      setBusy("idle");
    }
  }

  async function uploadResourceFile() {
    const notebookId = notebookDetail?.id ?? selectedNotebookId;
    if (!notebookId || notebookId === "new") {
      setFeedback("Create notebook first, then upload resources.");
      return;
    }
    if (!uploadFile) {
      setFeedback("Choose a file first.");
      return;
    }

    setBusy("uploading");
    setFeedback(null);
    try {
      const payload = new FormData();
      payload.set("file", uploadFile);
      payload.set("documentId", selectedResource?.id ?? "new");
      payload.set("notebookId", notebookId);
      payload.set("board", notebookForm.board);
      payload.set("grade", notebookForm.level);
      payload.set("faculty", notebookForm.faculty);
      payload.set("curriculum", notebookForm.curriculum);
      payload.set("subject", notebookForm.subject);
      payload.set("chapter", resourceForm.chapter);
      payload.set("title", resourceForm.title);
      payload.set("sourceName", resourceForm.sourceName);
      payload.set("resourceKind", resourceForm.resourceKind);
      payload.set("resourceSubtype", resourceForm.resourceSubtype);
      payload.set("autoProcess", "false");

      const response = await fetch("/api/admin/knowledge-documents/upload", {
        method: "POST",
        credentials: "include",
        body: payload,
      });
      const uploadResult = (await response.json()) as {
        document?: { id?: string; chunkCount?: number };
        extracted?: { sourceName?: string; characterCount?: number };
        error?: string;
      };
      if (!response.ok) throw new Error(uploadResult.error ?? "Failed to upload resource file.");

      await refreshNotebooks(notebookId, notebookPage);
      const notebook = await loadNotebookDetail(notebookId, {
        resourcePage: 1,
        resourceQ: "",
      });
      setResourceQuery("");
      setResourcePage(1);
      const savedId = String(uploadResult.document?.id ?? "");
      const savedResource = notebook.resources.find((resource) => resource.id === savedId) ?? null;
      setSelectedResourceId(savedResource?.id ?? "new");
      setResourceForm(savedResource ? toResourceFormState(savedResource) : EMPTY_RESOURCE);
      setUploadFile(null);

      if (uploadAutoProcess && savedId) {
        setBusy("uploadProcessing");
        setFeedback(`Uploaded ${uploadResult.extracted?.sourceName ?? "file"}. Processing chunks...`);

        const processResponse = await fetch(`/api/admin/knowledge-documents/${savedId}/process`, {
          method: "POST",
          credentials: "include",
        });
        const processPayload = (await processResponse.json()) as {
          document?: { chunkCount?: number };
          error?: string;
        };
        if (!processResponse.ok) {
          throw new Error(processPayload.error ?? "Uploaded file but failed to process chunks.");
        }

        await refreshNotebooks(notebookId, notebookPage);
        const processedNotebook = await loadNotebookDetail(notebookId, {
          resourcePage: 1,
          resourceQ: "",
        });
        const processedResource =
          processedNotebook.resources.find((resource) => resource.id === savedId) ?? null;
        setSelectedResourceId(processedResource?.id ?? savedId);
        setResourceForm(processedResource ? toResourceFormState(processedResource) : EMPTY_RESOURCE);
        setFeedback(
          `Uploaded + processed ${uploadResult.extracted?.sourceName ?? "file"} (${
            processedResource?.chunkCount ?? processPayload.document?.chunkCount ?? 0
          } chunks).`,
        );
      } else {
        setFeedback(
          `Uploaded ${uploadResult.extracted?.sourceName ?? "file"} (${
            uploadResult.extracted?.characterCount ?? 0
          } chars extracted).`,
        );
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to upload resource file.");
    } finally {
      setBusy("idle");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="mx-auto max-w-[1400px] text-sm text-muted-foreground">
          Loading notebook workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-[1400px] px-5 py-2 flex items-center justify-between">
          <h1 className="text-[18px] font-normal">
            <span className="opacity-90">Nano Syllabus</span> notebook workspace
          </h1>
          <a className="text-xs hover:underline" href="/">
            Back to admin home
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold">All notebooks</p>
              <Button size="sm" onClick={resetNotebookForm} disabled={busy !== "idle"}>
                New
              </Button>
            </div>
            <div className="p-3 border-b border-border">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search board, level, subject..."
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {notebooks.map((notebook) => {
                const status = getNotebookStatusMeta(notebook);
                return (
                  <button
                    key={notebook.id}
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      setUploadFile(null);
                      setResourceQuery("");
                      setResourcePage(1);
                      setSelectedResourceId("new");
                      setSelectedResourceIds([]);
                      setResourceForm(EMPTY_RESOURCE);
                      setSelectedNotebookId(notebook.id);
                      syncWorkspaceUrl({ notebookId: notebook.id, resourceId: null });
                    }}
                    className={`w-full text-left px-3 py-2 border-b border-border ${
                      selectedNotebookId === notebook.id ? "bg-secondary" : "hover:bg-secondary/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{notebook.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {notebook.board} · {notebook.level} · {notebook.subject}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.tone}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {notebook.resourceCount} resources · {notebook.readyChunkCount} ready chunks
                    </p>
                  </button>
                );
              })}
              {!notebooks.length ? (
                <div className="px-3 py-8 text-sm text-muted-foreground text-center">
                  No notebooks found.
                </div>
              ) : null}
            </div>
            <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border flex items-center justify-between">
              <span>
                {notebookListLoading
                  ? "Loading..."
                  : `Page ${notebookPage}/${Math.max(1, notebookTotalPages)} · ${notebookTotal} total`}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void refreshNotebooks(undefined, Math.max(1, notebookPage - 1))}
                  disabled={busy !== "idle" || notebookPage <= 1}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void refreshNotebooks(undefined, Math.min(notebookTotalPages, notebookPage + 1))
                  }
                  disabled={busy !== "idle" || notebookPage >= notebookTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold">
                {notebookDetail ? `${notebookDetail.subject} resources` : "Resources"}
              </p>
              <Button
                size="sm"
                onClick={startNewResource}
                disabled={!notebookDetail || busy !== "idle"}
              >
                New
              </Button>
            </div>
            <div className="p-3 border-b border-border space-y-2">
              <Input
                value={resourceQuery}
                onChange={(event) => {
                  setResourceQuery(event.target.value);
                  setResourcePage(1);
                }}
                placeholder="Search title, chapter, subtype..."
                disabled={!notebookDetail}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={bulkProcessResources}
                disabled={!notebookDetail || !selectedResourceIds.length || busy !== "idle"}
              >
                {busy === "bulkProcessing" ? "Processing..." : "Bulk process selected"}
              </Button>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {(notebookDetail?.resources ?? []).map((resource) => {
                const checked = selectedResourceIds.includes(resource.id);
                const active = selectedResourceId === resource.id;
                const status = getResourceStatusMeta(resource);
                return (
                  <button
                    key={resource.id}
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      setUploadFile(null);
                      setSelectedResourceId(resource.id);
                      syncWorkspaceUrl({
                        notebookId: selectedNotebookId,
                        resourceId: resource.id,
                      });
                    }}
                    className={`w-full text-left px-3 py-2 border-b border-border ${
                      active ? "bg-secondary" : "hover:bg-secondary/70"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          event.stopPropagation();
                          setSelectedResourceIds((current) =>
                            event.target.checked
                              ? [...new Set([...current, resource.id])]
                              : current.filter((id) => id !== resource.id),
                          );
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className="mt-1"
                      />
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{resource.title}</p>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.tone}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {resource.resourceKind} · {resource.resourceSubtype}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {resource.chunkCount} chunks
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!notebookDetail?.resources.length ? (
                <div className="px-3 py-8 text-sm text-muted-foreground text-center">
                  {notebookDetail ? "No resources in this notebook." : "Select a notebook first."}
                </div>
              ) : null}
            </div>
            <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border flex items-center justify-between">
              <span>
                Page {resourcePage}/{Math.max(1, resourceTotalPages)} · {resourceTotal} total
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResourcePage((current) => Math.max(1, current - 1))}
                  disabled={!notebookDetail || busy !== "idle" || resourcePage <= 1}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setResourcePage((current) => Math.min(resourceTotalPages, current + 1))
                  }
                  disabled={!notebookDetail || busy !== "idle" || resourcePage >= resourceTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          {feedback ? (
            <div className="bg-card border border-border rounded-[var(--radius)] px-4 py-3 text-xs">
              {feedback}
            </div>
          ) : null}

          <section className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedNotebookId === "new"
                    ? "Create knowledge_notebooks row"
                    : notebookDetail?.title ?? "knowledge_notebooks row"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {notebookDetail
                    ? "This section maps directly to the selected knowledge_notebooks record."
                    : "Notebook is the root knowledge_notebooks record for syllabus, study material, and question banks."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void refreshNotebooks(undefined, notebookPage)}
                  disabled={busy !== "idle"}
                >
                  Refresh
                </Button>
                <Button onClick={saveNotebook} disabled={busy !== "idle"}>
                  {busy === "savingNotebook"
                    ? "Saving..."
                    : selectedNotebookId === "new"
                      ? "Create notebook"
                      : "Save notebook"}
                </Button>
                {notebookDetail ? (
                  <Button variant="destructive" onClick={deleteNotebook} disabled={busy !== "idle"}>
                    Delete notebook
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Notebook title">
                <Input
                  value={notebookForm.title}
                  onChange={(event) => updateNotebook("title", event.target.value)}
                />
              </Field>
              <Field label="Board">
                <Input value={notebookForm.board} onChange={(event) => updateNotebook("board", event.target.value)} />
              </Field>
              <Field label="Level">
                <Input value={notebookForm.level} onChange={(event) => updateNotebook("level", event.target.value)} />
              </Field>
              <Field label="Faculty">
                <Input value={notebookForm.faculty} onChange={(event) => updateNotebook("faculty", event.target.value)} />
              </Field>
              <Field label="Subject">
                <Input value={notebookForm.subject} onChange={(event) => updateNotebook("subject", event.target.value)} />
              </Field>
              <Field label="Curriculum">
                <Input
                  value={notebookForm.curriculum}
                  onChange={(event) => updateNotebook("curriculum", event.target.value)}
                />
              </Field>
            </div>
            <div className="p-4 pt-0">
              <Field label="Description">
                <Textarea
                  rows={3}
                  value={notebookForm.description}
                  onChange={(event) => updateNotebook("description", event.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    {selectedResourceId === "new"
                      ? "Create knowledge_documents row"
                      : selectedResource?.title ?? "knowledge_documents row"}
                  </h2>
                  {selectedResource ? (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getResourceStatusMeta(selectedResource).tone}`}
                    >
                      {getResourceStatusMeta(selectedResource).label}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {notebookDetail
                    ? `Only ${notebookDetail.subject} documents from "${notebookDetail.title}" appear here because each knowledge_documents row belongs to one notebook_id.`
                    : "Select a notebook first, then manage only that notebook's knowledge_documents rows here."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedResource ? (
                  <>
                    <Button variant="outline" onClick={processResource} disabled={busy !== "idle"}>
                      {busy === "processing" ? "Processing..." : "Chunk + vectorize"}
                    </Button>
                    {selectedResource.storagePath ? (
                      <>
                        <a
                          href={`/api/admin/knowledge-documents/${selectedResource.id}/source`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm hover:bg-accent"
                        >
                          Open source
                        </a>
                        <a
                          href={`/api/admin/knowledge-documents/${selectedResource.id}/source?download=1`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm hover:bg-accent"
                        >
                          Download
                        </a>
                      </>
                    ) : null}
                  </>
                ) : null}
                <Button onClick={saveResource} disabled={busy !== "idle" || !notebookDetail}>
                  {busy === "savingResource"
                    ? "Saving..."
                    : selectedResourceId === "new"
                      ? "Create resource"
                      : "Save resource"}
                </Button>
                {selectedResource ? (
                  <Button variant="destructive" onClick={deleteResource} disabled={busy !== "idle"}>
                    Delete resource
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Resource bucket">
                <select
                  value={resourceForm.resourceKind}
                  onChange={(event) => {
                    const nextKind = event.target.value;
                    const defaultSubtype =
                      RESOURCE_SUBTYPE_OPTIONS[nextKind]?.[0]?.value ?? "other";
                    setResourceForm((current) => ({
                      ...current,
                      resourceKind: nextKind,
                      resourceSubtype:
                        RESOURCE_SUBTYPE_OPTIONS[nextKind]?.some(
                          (option) => option.value === current.resourceSubtype,
                        )
                          ? current.resourceSubtype
                          : defaultSubtype,
                    }));
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  {RESOURCE_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Subtype">
                <select
                  value={resourceForm.resourceSubtype}
                  onChange={(event) => updateResource("resourceSubtype", event.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  {subtypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Title">
                <Input value={resourceForm.title} onChange={(event) => updateResource("title", event.target.value)} />
              </Field>
              <Field label="Chapter / topic">
                <Input value={resourceForm.chapter} onChange={(event) => updateResource("chapter", event.target.value)} />
              </Field>
              <Field label="Source name">
                <Input
                  value={resourceForm.sourceName}
                  onChange={(event) => updateResource("sourceName", event.target.value)}
                />
              </Field>
              <Field label="Source type">
                <Input
                  value={resourceForm.sourceType}
                  onChange={(event) => updateResource("sourceType", event.target.value)}
                />
              </Field>
            </div>
            {selectedResource ? (
              <div className="grid gap-3 border-t border-border px-4 py-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Document id">
                  <Input value={selectedResource.id} readOnly />
                </Field>
                <Field label="Notebook id">
                  <Input value={selectedResource.notebookId ?? ""} readOnly />
                </Field>
                <Field label="Processing status">
                  <Input value={selectedResource.processingStatus} readOnly />
                </Field>
                <Field label="Chunk count">
                  <Input value={String(selectedResource.chunkCount)} readOnly />
                </Field>
                <Field label="Storage bucket">
                  <Input value={selectedResource.storageBucket ?? ""} readOnly />
                </Field>
                <Field label="Storage path">
                  <Input value={selectedResource.storagePath ?? ""} readOnly />
                </Field>
                <Field label="Uploaded at">
                  <Input value={selectedResource.uploadedAt} readOnly />
                </Field>
                <Field label="Updated at">
                  <Input value={selectedResource.updatedAt} readOnly />
                </Field>
              </div>
            ) : null}
            <div className="px-4 pb-4">
              <details className="rounded-md border border-input bg-background">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>knowledge_documents.raw_content</span>
                    <span className="text-xs text-muted-foreground">
                      {resourceForm.rawContent.trim().length
                        ? `${resourceForm.rawContent.trim().length.toLocaleString()} characters`
                        : "No extracted text yet"}
                    </span>
                  </div>
                </summary>
                <div className="border-t border-input p-4 pt-3">
                  <p className="mb-2 text-xs text-muted-foreground">
                    This is the extracted text stored in the knowledge_documents table. You can
                    review it here or paste/manual-edit content before saving.
                  </p>
                  <Textarea
                    rows={14}
                    value={resourceForm.rawContent}
                    onChange={(event) => updateResource("rawContent", event.target.value)}
                    placeholder="Upload a file to extract text here, or paste manual text content."
                    className="font-mono text-xs"
                  />
                </div>
              </details>
            </div>
          </section>

          <section className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Upload file into resource</h2>
                <p className="text-sm text-muted-foreground">
                  PDF, DOCX, TXT, Markdown. You can auto-process after upload.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={uploadResourceFile}
                disabled={busy !== "idle" || !uploadFile || !notebookDetail}
              >
                {busy === "uploading"
                  ? "Uploading..."
                  : busy === "uploadProcessing"
                    ? "Processing..."
                  : selectedResource
                    ? "Replace from file"
                    : "Upload and create"}
              </Button>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_260px]">
              <Field label="Choose file">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  className="block w-full rounded-md border border-dashed border-input bg-background px-3 py-5 text-sm"
                />
              </Field>
              <label className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={uploadAutoProcess}
                  onChange={(event) => setUploadAutoProcess(event.target.checked)}
                />
                Auto process after upload
              </label>
            </div>
          </section>

          <section className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-lg font-semibold">Processed chunks</h2>
              <p className="text-sm text-muted-foreground">
                Chunks are generated only after this resource is uploaded and processed. Manage
                notebook and resource first, then inspect chunk rows here.
              </p>
            </div>

            {!selectedResource ? (
              <div className="px-4 py-8 text-sm text-muted-foreground">
                Select a resource first. Chunks belong to one knowledge_documents row at a time.
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-input bg-background px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Resource
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {selectedResource.title}
                    </p>
                  </div>
                  <div className="rounded-md border border-input bg-background px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Processing status
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {selectedResource.processingStatus}
                    </p>
                  </div>
                  <div className="rounded-md border border-input bg-background px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Total chunks
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {notebookDetail?.selectedResourceChunkTotal ?? 0}
                    </p>
                  </div>
                </div>

                {notebookDetail?.selectedResourceChunkTotal ? (
                  <details className="rounded-md border border-input bg-background">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>knowledge_chunks preview</span>
                        <span className="text-xs text-muted-foreground">
                          Showing first {notebookDetail.selectedResourceChunks.length} of{" "}
                          {notebookDetail.selectedResourceChunkTotal} rows
                        </span>
                      </div>
                    </summary>
                    <div className="border-t border-input divide-y divide-border">
                      {notebookDetail.selectedResourceChunks.map((chunk) => (
                        <div key={chunk.id} className="px-4 py-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-medium">
                              Chunk #{chunk.chunkIndex + 1}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {chunk.subject} · {chunk.grade}
                              {chunk.chapter ? ` · ${chunk.chapter}` : ""}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            topic: {chunk.topic ?? selectedResource.title}
                          </p>
                          <pre className="whitespace-pre-wrap rounded-md border border-input bg-card p-3 text-xs leading-5">
                            {chunk.content}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : (
                  <div className="rounded-md border border-dashed border-input bg-background px-4 py-6 text-sm text-muted-foreground">
                    No chunk rows found yet for this resource. Upload the file and run{" "}
                    <span className="font-medium text-foreground">Chunk + vectorize</span> to create
                    knowledge_chunks rows.
                  </div>
                )}
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}

function toResourceFormState(resource: ResourceItem): ResourceFormState {
  return {
    resourceKind: resource.resourceKind,
    resourceSubtype: resource.resourceSubtype,
    title: resource.title,
    chapter: resource.chapter ?? "",
    sourceName: resource.sourceName,
    sourceType: resource.sourceType,
    rawContent: resource.rawContent,
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
