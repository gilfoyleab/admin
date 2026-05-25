import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { chunkDocumentContent } from "@/lib/server/chunking";
import { embedTexts } from "@/lib/server/embeddings";
import { extractKnowledgeFileContent } from "@/lib/server/knowledge-upload";
import {
  createKnowledgeSourceSignedUrl,
  downloadKnowledgeSourceFile,
  removeKnowledgeSourceFile,
} from "@/lib/server/knowledge-storage";

export type AdminListPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const KNOWLEDGE_CHUNK_INSERT_BATCH_SIZE = 50;

type KnowledgeNotebookContext = {
  id: string;
  title: string;
  board: string;
  level: string;
  faculty: string;
  subject: string;
  curriculum: string;
};

function normalizePage(pageRaw: string | null) {
  const value = Number(pageRaw);
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.floor(value);
}

function normalizePageSize(pageSizeRaw: string | null) {
  const value = Number(pageSizeRaw);
  if (!Number.isFinite(value) || value < 1) return 20;
  return Math.min(100, Math.floor(value));
}

export function parsePageQuery(url: string) {
  const searchParams = new URL(url).searchParams;
  const page = normalizePage(searchParams.get("page"));
  const pageSize = normalizePageSize(searchParams.get("pageSize"));
  const q = searchParams.get("q")?.trim() ?? "";
  return { page, pageSize, q };
}

async function insertKnowledgeChunksInBatches(
  rows: Array<{
    document_id: string;
    board: string;
    grade: string;
    subject: string;
    chapter: string | null;
    topic: string;
    content: string;
    embedding: number[];
    chunk_index: number;
  }>,
) {
  const supabase = createSupabaseAdminClient();
  for (let index = 0; index < rows.length; index += KNOWLEDGE_CHUNK_INSERT_BATCH_SIZE) {
    const batch = rows.slice(index, index + KNOWLEDGE_CHUNK_INSERT_BATCH_SIZE);
    const { error } = await supabase.from("knowledge_chunks").insert(batch);
    if (error) throw error;
  }
}

function isMeaningfulNotebook(row: {
  title?: string | null;
  board?: string | null;
  level?: string | null;
  subject?: string | null;
}) {
  const title = row.title?.trim() ?? "";
  const board = row.board?.trim() ?? "";
  const level = row.level?.trim() ?? "";
  const subject = row.subject?.trim() ?? "";
  if (!title || title === "." || title === "..") return false;
  if (!board || !level || !subject) return false;
  return true;
}

async function getKnowledgeNotebookContext(
  notebookId: string,
): Promise<KnowledgeNotebookContext> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("knowledge_notebooks")
    .select("id, title, board, level, faculty, subject, curriculum")
    .eq("id", notebookId)
    .maybeSingle();

  if (error) throw error;
  if (!data || !isMeaningfulNotebook(data)) {
    throw new Error("Notebook not found or is incomplete.");
  }

  return {
    id: data.id,
    title: data.title,
    board: data.board,
    level: data.level,
    faculty: data.faculty ?? "",
    subject: data.subject,
    curriculum: data.curriculum ?? "",
  };
}

export async function listAdminUsers(url: string) {
  const supabase = createSupabaseAdminClient();
  const { page, pageSize, q } = parsePageQuery(url);
  const auth = await supabase.auth.admin.listUsers({ page, perPage: pageSize });
  if (auth.error) throw auth.error;

  const users = auth.data.users ?? [];
  const userIds = users.map((user) => user.id);

  const [profilesRes, ledgerRes] = await Promise.all([
    userIds.length
      ? supabase
          .from("student_profiles")
          .select("user_id, full_name, board, grade, role, college")
          .in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase
          .from("credits_ledger")
          .select("user_id, balance_after, created_at")
          .in("user_id", userIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (ledgerRes.error) throw ledgerRes.error;

  const profileByUserId = new Map(
    (profilesRes.data ?? []).map((profile) => [
      profile.user_id as string,
      profile as {
        user_id: string;
        full_name: string | null;
        board: string | null;
        grade: string | null;
        role: string | null;
        college: string | null;
      },
    ]),
  );

  const latestLedgerByUserId = new Map<string, number>();
  for (const row of ledgerRes.data ?? []) {
    const userId = row.user_id as string;
    if (!latestLedgerByUserId.has(userId)) {
      latestLedgerByUserId.set(userId, Number(row.balance_after ?? 0));
    }
  }

  const mapped = users.map((user) => {
    const profile = profileByUserId.get(user.id);
    return {
      userId: user.id,
      email: user.email ?? "",
      fullName:
        profile?.full_name ||
        (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") ||
        "Student",
      college: profile?.college ?? "",
      board: profile?.board ?? "",
      grade: profile?.grade ?? "",
      role: profile?.role === "admin" ? "admin" : "student",
      onboarded: Boolean(profile?.full_name && profile?.board && profile?.grade),
      creditBalance: latestLedgerByUserId.get(user.id) ?? 0,
      activePlanName: null,
      chatSessionCount: 0,
      noteCount: 0,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
    };
  });

  const filtered = q
    ? mapped.filter((user) =>
        [user.email, user.fullName, user.college, user.board, user.grade]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
    : mapped;

  const total = q ? filtered.length : ((auth.data as { total?: number }).total ?? filtered.length);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: filtered,
    total,
    page,
    pageSize,
    totalPages,
  } satisfies AdminListPage<(typeof filtered)[number]>;
}

export async function listAdminAuthUsers(url: string) {
  const supabase = createSupabaseAdminClient();
  const { page, pageSize, q } = parsePageQuery(url);
  const auth = await supabase.auth.admin.listUsers({ page, perPage: pageSize });
  if (auth.error) throw auth.error;

  const items = (auth.data.users ?? []).map((user) => ({
    id: user.id,
    email: user.email ?? "",
    provider:
      Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.length
        ? String(user.app_metadata.providers[0])
        : (typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : ""),
    emailConfirmedAt:
      typeof user.email_confirmed_at === "string" ? user.email_confirmed_at : null,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
  }));

  const filtered = q
    ? items.filter((user) =>
        [user.id, user.email, user.provider].join(" ").toLowerCase().includes(q.toLowerCase()),
      )
    : items;

  const total = q ? filtered.length : ((auth.data as { total?: number }).total ?? filtered.length);
  return {
    items: filtered,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  } satisfies AdminListPage<(typeof filtered)[number]>;
}

export async function listAdminStudentProfiles(url: string) {
  const supabase = createSupabaseAdminClient();
  const { page, pageSize, q } = parsePageQuery(url);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("student_profiles")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,college.ilike.%${q}%,board.ilike.%${q}%,grade.ilike.%${q}%,role.ilike.%${q}%,target_grade.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const items = (data ?? []).map((row) => ({
    userId: String(row.user_id),
    fullName: String(row.full_name ?? ""),
    college: String(row.college ?? ""),
    board: String(row.board ?? ""),
    grade: String(row.grade ?? ""),
    boardScore: row.board_score ? String(row.board_score) : "",
    subjects: Array.isArray(row.subjects) ? row.subjects.map((v) => String(v)) : [],
    targetGrade: String(row.target_grade ?? ""),
    languagePref: String(row.language_pref ?? "EN"),
    role: String(row.role ?? "student"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  const total = count ?? items.length;
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  } satisfies AdminListPage<(typeof items)[number]>;
}

export async function listAdminChatSessions(url: string) {
  const supabase = createSupabaseAdminClient();
  const { page, pageSize, q } = parsePageQuery(url);

  let query = supabase
    .from("chat_sessions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (q) {
    query = query.or(`title.ilike.%${q}%,subject_context.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const userIds = Array.from(new Set(rows.map((row) => String(row.user_id)).filter(Boolean)));
  const sessionIds = rows.map((row) => String(row.id));

  const [{ data: profiles, error: profileError }, authResult, { data: messages, error: messageError }] =
    await Promise.all([
      userIds.length
        ? supabase.from("student_profiles").select("user_id, full_name").in("user_id", userIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? supabase.auth.admin.listUsers({ page: 1, perPage: Math.max(200, userIds.length) })
        : Promise.resolve({ data: { users: [] }, error: null }),
      sessionIds.length
        ? supabase
            .from("chat_messages")
            .select("id, session_id, role, content, language, grounded, citations, feedback, follow_up_suggestions, admin_review_note, admin_reviewed_at, admin_reviewed_by, created_at")
            .in("session_id", sessionIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (profileError) throw profileError;
  if (authResult.error) throw authResult.error;
  if (messageError) throw messageError;

  const profileByUserId = new Map(
    (profiles ?? []).map((row) => [String(row.user_id), String(row.full_name ?? "")]),
  );
  const emailByUserId = new Map(
    (authResult.data.users ?? []).map((user) => [user.id, user.email ?? ""]),
  );

  const messagesBySessionId = new Map<string, Array<Record<string, unknown>>>();
  for (const message of messages ?? []) {
    const sessionId = String(message.session_id);
    const list = messagesBySessionId.get(sessionId) ?? [];
    list.push({
      id: String(message.id),
      role: String(message.role),
      content: String(message.content ?? ""),
      language: String(message.language ?? ""),
      grounded: Boolean(message.grounded),
      citations: message.citations ?? null,
      feedback: message.feedback ? String(message.feedback) : "",
      followUpSuggestions: Array.isArray(message.follow_up_suggestions)
        ? message.follow_up_suggestions.map((value) => String(value))
        : [],
      adminReviewNote: message.admin_review_note ? String(message.admin_review_note) : "",
      adminReviewedAt: message.admin_reviewed_at ? String(message.admin_reviewed_at) : "",
      adminReviewedBy: message.admin_reviewed_by ? String(message.admin_reviewed_by) : "",
      createdAt: String(message.created_at),
    });
    messagesBySessionId.set(sessionId, list);
  }

  const grouped = new Map<
    string,
    {
      id: string;
      userId: string;
      userFullName: string;
      userEmail: string;
      sessionCount: number;
      messageCount: number;
      lastSessionAt: string;
      sessions: Array<{
        id: string;
        title: string;
        subjectContext: string;
        subjectTags: string[];
        createdAt: string;
        updatedAt: string;
        messageCount: number;
        linkedMessages: Array<Record<string, unknown>>;
      }>;
    }
  >();

  for (const row of rows) {
    const userId = String(row.user_id);
    const sessionId = String(row.id);
    const linkedMessages = messagesBySessionId.get(sessionId) ?? [];
    if (!grouped.has(userId)) {
      grouped.set(userId, {
        id: userId,
        userId,
        userFullName: profileByUserId.get(userId) ?? "",
        userEmail: emailByUserId.get(userId) ?? "",
        sessionCount: 0,
        messageCount: 0,
        lastSessionAt: String(row.updated_at),
        sessions: [],
      });
    }
    const account = grouped.get(userId)!;
    account.sessionCount += 1;
    account.messageCount += linkedMessages.length;
    account.sessions.push({
      id: sessionId,
      title: String(row.title ?? ""),
      subjectContext: row.subject_context ? String(row.subject_context) : "",
      subjectTags: Array.isArray(row.subject_tags)
        ? row.subject_tags.map((value) => String(value))
        : [],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      messageCount: linkedMessages.length,
      linkedMessages,
    });
  }

  const groupedItems = Array.from(grouped.values()).sort((a, b) =>
    b.lastSessionAt.localeCompare(a.lastSessionAt),
  );
  const total = groupedItems.length;
  const from = (page - 1) * pageSize;
  const items = groupedItems.slice(from, from + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  } satisfies AdminListPage<(typeof items)[number]>;
}

export async function listAdminChatMessages(url: string) {
  const supabase = createSupabaseAdminClient();
  const { page, pageSize, q } = parsePageQuery(url);
  const sessionId = new URL(url).searchParams.get("sessionId")?.trim() ?? "";

  let query = supabase
    .from("chat_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }
  if (q) {
    query = query.or(`content.ilike.%${q}%,role.ilike.%${q}%,language.ilike.%${q}%,feedback.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const sessionIds = Array.from(new Set(rows.map((row) => String(row.session_id)).filter(Boolean)));
  const { data: sessions, error: sessionError } = sessionIds.length
    ? await supabase
        .from("chat_sessions")
        .select("id, user_id, title, subject_context")
        .in("id", sessionIds)
    : { data: [], error: null };
  if (sessionError) throw sessionError;

  const userIds = Array.from(
    new Set((sessions ?? []).map((session) => String(session.user_id)).filter(Boolean)),
  );
  const [{ data: profiles, error: profileError }, authResult] = await Promise.all([
    userIds.length
      ? supabase.from("student_profiles").select("user_id, full_name").in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase.auth.admin.listUsers({ page: 1, perPage: Math.max(200, userIds.length) })
      : Promise.resolve({ data: { users: [] }, error: null }),
  ]);
  if (profileError) throw profileError;
  if (authResult.error) throw authResult.error;

  const sessionById = new Map(
    (sessions ?? []).map((session) => [
      String(session.id),
      {
        userId: String(session.user_id),
        title: String(session.title ?? ""),
        subjectContext: session.subject_context ? String(session.subject_context) : "",
      },
    ]),
  );
  const profileByUserId = new Map(
    (profiles ?? []).map((row) => [String(row.user_id), String(row.full_name ?? "")]),
  );
  const emailByUserId = new Map(
    (authResult.data.users ?? []).map((user) => [user.id, user.email ?? ""]),
  );

  const grouped = new Map<
    string,
    {
      id: string;
      userId: string;
      userFullName: string;
      userEmail: string;
      sessionCount: number;
      messageCount: number;
      lastMessageAt: string;
      messages: Array<{
        id: string;
        sessionId: string;
        sessionTitle: string;
        subjectContext: string;
        role: string;
        content: string;
        language: string;
        grounded: boolean;
        citations: unknown;
        feedback: string;
        followUpSuggestions: string[];
        adminReviewNote: string;
        adminReviewedAt: string;
        adminReviewedBy: string;
        createdAt: string;
      }>;
    }
  >();

  for (const row of rows) {
    const linkedSession = sessionById.get(String(row.session_id));
    const userId = linkedSession?.userId ?? "";
    if (!userId) continue;
    if (!grouped.has(userId)) {
      grouped.set(userId, {
        id: userId,
        userId,
        userFullName: profileByUserId.get(userId) ?? "",
        userEmail: emailByUserId.get(userId) ?? "",
        sessionCount: 0,
        messageCount: 0,
        lastMessageAt: String(row.created_at),
        messages: [],
      });
    }

    const account = grouped.get(userId)!;
    account.messageCount += 1;
    account.messages.push({
      id: String(row.id),
      sessionId: String(row.session_id),
      sessionTitle: linkedSession?.title ?? "",
      subjectContext: linkedSession?.subjectContext ?? "",
      role: String(row.role),
      content: String(row.content ?? ""),
      language: String(row.language ?? ""),
      grounded: Boolean(row.grounded),
      citations: row.citations ?? null,
      feedback: row.feedback ? String(row.feedback) : "",
      followUpSuggestions: Array.isArray(row.follow_up_suggestions)
        ? row.follow_up_suggestions.map((value) => String(value))
        : [],
      adminReviewNote: row.admin_review_note ? String(row.admin_review_note) : "",
      adminReviewedAt: row.admin_reviewed_at ? String(row.admin_reviewed_at) : "",
      adminReviewedBy: row.admin_reviewed_by ? String(row.admin_reviewed_by) : "",
      createdAt: String(row.created_at),
    });
  }

  for (const account of grouped.values()) {
    account.sessionCount = new Set(account.messages.map((message) => message.sessionId)).size;
  }

  const groupedItems = Array.from(grouped.values()).sort((a, b) =>
    b.lastMessageAt.localeCompare(a.lastMessageAt),
  );
  const total = groupedItems.length;
  const from = (page - 1) * pageSize;
  const items = groupedItems.slice(from, from + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  } satisfies AdminListPage<(typeof items)[number]>;
}

export async function listAdminKnowledgeNotebooks(url: string) {
  const supabase = createSupabaseAdminClient();
  const { page, pageSize, q } = parsePageQuery(url);

  let query = supabase
    .from("knowledge_notebooks")
    .select("*")
    .order("updated_at", { ascending: false });

  if (q) {
    query = query.or(
      `title.ilike.%${q}%,board.ilike.%${q}%,level.ilike.%${q}%,faculty.ilike.%${q}%,subject.ilike.%${q}%,curriculum.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  const meaningfulNotebooks = (data ?? []).filter(isMeaningfulNotebook);
  const total = meaningfulNotebooks.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize;
  const notebooks = meaningfulNotebooks.slice(from, to);
  const notebookIds = notebooks.map((notebook) => notebook.id);

  const counts = new Map<string, { resourceCount: number; readyChunkCount: number }>();
  if (notebookIds.length) {
    const { data: docs, error: docsError } = await supabase
      .from("knowledge_documents")
      .select("notebook_id, processing_status, chunk_count")
      .in("notebook_id", notebookIds);
    if (docsError) throw docsError;
    for (const doc of docs ?? []) {
      const notebookId = (doc.notebook_id as string | null) ?? "";
      if (!notebookId) continue;
      const current = counts.get(notebookId) ?? { resourceCount: 0, readyChunkCount: 0 };
      current.resourceCount += 1;
      if (doc.processing_status === "ready") {
        current.readyChunkCount += Number(doc.chunk_count ?? 0);
      }
      counts.set(notebookId, current);
    }
  }

  const items = notebooks.map((row) => ({
    id: row.id,
    title: row.title,
    board: row.board,
    level: row.level,
    faculty: row.faculty,
    subject: row.subject,
    curriculum: row.curriculum ?? "",
    description: row.description ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resourceCount: counts.get(row.id)?.resourceCount ?? 0,
    readyChunkCount: counts.get(row.id)?.readyChunkCount ?? 0,
  }));

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
  } satisfies AdminListPage<(typeof items)[number]>;
}

export async function getAdminKnowledgeNotebook(
  notebookId: string,
  options?: {
    resourceQ?: string;
    resourcePage?: number;
    resourcePageSize?: number;
    selectedResourceId?: string;
  },
) {
  const supabase = createSupabaseAdminClient();
  const { data: notebook, error: notebookError } = await supabase
    .from("knowledge_notebooks")
    .select("*")
    .eq("id", notebookId)
    .maybeSingle();

  if (notebookError) throw notebookError;
  if (!notebook) return null;

  const resourcePageRaw = Number(options?.resourcePage ?? 1);
  const resourcePage = Number.isFinite(resourcePageRaw) && resourcePageRaw > 0
    ? Math.floor(resourcePageRaw)
    : 1;
  const resourcePageSizeRaw = Number(options?.resourcePageSize ?? 20);
  const resourcePageSize = Number.isFinite(resourcePageSizeRaw) && resourcePageSizeRaw > 0
    ? Math.min(100, Math.floor(resourcePageSizeRaw))
    : 20;
  const resourceFrom = (resourcePage - 1) * resourcePageSize;
  const resourceTo = resourceFrom + resourcePageSize - 1;

  let resourceQuery = supabase
    .from("knowledge_documents")
    .select("*", { count: "exact" })
    .eq("notebook_id", notebookId)
    .order("updated_at", { ascending: false })
    .range(resourceFrom, resourceTo);

  const resourceQ = options?.resourceQ?.trim();
  if (resourceQ) {
    resourceQuery = resourceQuery.or(
      `title.ilike.%${resourceQ}%,subject.ilike.%${resourceQ}%,chapter.ilike.%${resourceQ}%,curriculum.ilike.%${resourceQ}%,faculty.ilike.%${resourceQ}%,resource_subtype.ilike.%${resourceQ}%`,
    );
  }

  const {
    data: resources,
    error: resourceError,
    count: resourceCount,
  } = await resourceQuery;
  if (resourceError) throw resourceError;

  const { data: countRows, error: countError } = await supabase
    .from("knowledge_documents")
    .select("processing_status, chunk_count")
    .eq("notebook_id", notebookId);
  if (countError) throw countError;

  let readyChunkCount = 0;
  for (const row of countRows ?? []) {
    if (row.processing_status === "ready") {
      readyChunkCount += Number(row.chunk_count ?? 0);
    }
  }

  const mappedResources = (resources ?? []).map((row) => ({
    id: row.id,
    notebookId: row.notebook_id,
    notebookTitle: notebook.title,
    board: row.board,
    grade: row.grade,
    faculty: row.faculty,
    curriculum: row.curriculum,
    subject: row.subject,
    chapter: row.chapter,
    resourceKind: row.resource_kind,
    resourceSubtype: row.resource_subtype ?? row.document_type,
    title: row.title,
    sourceName: row.source_name,
    sourceType: row.source_type,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    sourceMimeType: row.source_mime_type,
    sourceSizeBytes: row.source_size_bytes,
    documentType: row.document_type,
    rawContent: row.raw_content,
    chunkCount: row.chunk_count,
    processingStatus: row.processing_status,
    processingError: row.processing_error,
    uploadedAt: row.uploaded_at,
    updatedAt: row.updated_at,
  }));

  const resourceTotal = resourceCount ?? mappedResources.length;
  const selectedResourceId = options?.selectedResourceId?.trim() ?? "";
  const chunkPreviewResourceId =
    selectedResourceId && mappedResources.some((resource) => resource.id === selectedResourceId)
      ? selectedResourceId
      : (mappedResources[0]?.id ?? "");

  let selectedResourceChunks: Array<{
    id: string;
    chunkIndex: number;
    content: string;
    board: string;
    grade: string;
    subject: string;
    chapter: string | null;
    topic: string | null;
  }> = [];
  let selectedResourceChunkTotal = 0;

  if (chunkPreviewResourceId) {
    const { data: chunkRows, error: chunkError, count: chunkCount } = await supabase
      .from("knowledge_chunks")
      .select("id, chunk_index, content, board, grade, subject, chapter, topic", { count: "exact" })
      .eq("document_id", chunkPreviewResourceId)
      .order("chunk_index", { ascending: true })
      .range(0, 5);
    if (chunkError) throw chunkError;
    selectedResourceChunkTotal = chunkCount ?? 0;
    selectedResourceChunks = (chunkRows ?? []).map((row) => ({
      id: row.id,
      chunkIndex: Number(row.chunk_index ?? 0),
      content: String(row.content ?? ""),
      board: String(row.board ?? ""),
      grade: String(row.grade ?? ""),
      subject: String(row.subject ?? ""),
      chapter: row.chapter ? String(row.chapter) : null,
      topic: row.topic ? String(row.topic) : null,
    }));
  }

  return {
    id: notebook.id,
    title: notebook.title,
    board: notebook.board,
    level: notebook.level,
    faculty: notebook.faculty,
    subject: notebook.subject,
    curriculum: notebook.curriculum ?? "",
    description: notebook.description ?? "",
    createdAt: notebook.created_at,
    updatedAt: notebook.updated_at,
    resourceCount: countRows?.length ?? 0,
    readyChunkCount,
    resources: mappedResources,
    resourceTotal,
    resourcePage,
    resourcePageSize,
    resourceTotalPages: Math.max(1, Math.ceil(resourceTotal / resourcePageSize)),
    selectedResourceChunkTotal,
    selectedResourceChunks,
  };
}

export async function listAdminKnowledgeDocuments(url: string) {
  const supabase = createSupabaseAdminClient();
  const { page, pageSize, q } = parsePageQuery(url);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const searchParams = new URL(url).searchParams;
  const notebookId = searchParams.get("notebookId")?.trim() ?? "";

  let query = supabase
    .from("knowledge_documents")
    .select("*, knowledge_notebooks(title)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(
      `title.ilike.%${q}%,subject.ilike.%${q}%,chapter.ilike.%${q}%,curriculum.ilike.%${q}%,faculty.ilike.%${q}%`,
    );
  }

  if (notebookId) {
    query = query.eq("notebook_id", notebookId);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const items = (data ?? []).map((row) => ({
    id: row.id,
    notebookId: row.notebook_id,
    notebookTitle: Array.isArray(row.knowledge_notebooks)
      ? (row.knowledge_notebooks[0]?.title ?? null)
      : (row.knowledge_notebooks?.title ?? null),
    board: row.board,
    grade: row.grade,
    faculty: row.faculty,
    curriculum: row.curriculum,
    subject: row.subject,
    chapter: row.chapter,
    resourceKind: row.resource_kind,
    resourceSubtype: row.resource_subtype ?? row.document_type,
    title: row.title,
    sourceName: row.source_name,
    sourceType: row.source_type,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    sourceMimeType: row.source_mime_type,
    sourceSizeBytes: row.source_size_bytes,
    documentType: row.document_type,
    rawContent: row.raw_content,
    chunkCount: row.chunk_count,
    processingStatus: row.processing_status,
    processingError: row.processing_error,
    uploadedAt: row.uploaded_at,
    updatedAt: row.updated_at,
  }));

  const total = count ?? items.length;
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listAdminKnowledgeChunks(url: string) {
  const supabase = createSupabaseAdminClient();
  const { page, pageSize, q } = parsePageQuery(url);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("knowledge_chunks")
    .select("id, document_id, board, grade, subject, chapter, topic, content, chunk_index", {
      count: "exact",
    })
    .order("chunk_index", { ascending: true })
    .range(from, to);

  if (q) {
    query = query.or(
      `subject.ilike.%${q}%,chapter.ilike.%${q}%,topic.ilike.%${q}%,content.ilike.%${q}%,board.ilike.%${q}%,grade.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const documentIds = [...new Set((data ?? []).map((row) => String(row.document_id ?? "")).filter(Boolean))];
  const chunkCountByDocumentId = new Map<string, number>();
  if (documentIds.length) {
    const { data: documents, error: documentsError } = await supabase
      .from("knowledge_documents")
      .select("id, chunk_count")
      .in("id", documentIds);
    if (documentsError) throw documentsError;
    for (const document of documents ?? []) {
      chunkCountByDocumentId.set(String(document.id), Number(document.chunk_count ?? 0));
    }
  }

  const items = (data ?? []).map((row) => ({
    id: String(row.id),
    documentId: String(row.document_id ?? ""),
    board: String(row.board ?? ""),
    grade: String(row.grade ?? ""),
    subject: String(row.subject ?? ""),
    chapter: row.chapter ? String(row.chapter) : null,
    topic: row.topic ? String(row.topic) : null,
    content: String(row.content ?? ""),
    chunkIndex: Number(row.chunk_index ?? 0),
    chunkCount: chunkCountByDocumentId.get(String(row.document_id ?? "")) ?? 0,
  }));

  const total = count ?? items.length;
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  } satisfies AdminListPage<(typeof items)[number]>;
}

export async function listAdminAnswers(url: string) {
  const supabase = createSupabaseAdminClient();
  const { page, pageSize, q } = parsePageQuery(url);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const status = new URL(url).searchParams.get("status") ?? "all";

  let query = supabase
    .from("chat_messages")
    .select(
      "id, session_id, content, created_at, grounded, citations, feedback, admin_review_note, admin_reviewed_at, admin_reviewed_by",
      { count: "exact" },
    )
    .eq("role", "assistant");

  if (status === "reviewed") {
    query = query.not("admin_reviewed_at", "is", null);
  } else if (status === "flagged") {
    query = query.is("admin_reviewed_at", null).eq("feedback", "down");
  } else if (status === "liked") {
    query = query.is("admin_reviewed_at", null).eq("feedback", "up");
  } else if (status === "neutral") {
    query = query.is("admin_reviewed_at", null).is("feedback", null);
  }

  if (q) {
    query = query.ilike("content", `%${q}%`);
  }

  const {
    data: messages,
    error: messageError,
    count,
  } = await query.order("created_at", { ascending: false }).range(from, to);
  if (messageError) throw messageError;

  const messageRows = messages ?? [];
  const sessionIds = [...new Set(messageRows.map((row) => row.session_id as string))];

  const { data: sessions, error: sessionError } = sessionIds.length
    ? await supabase
        .from("chat_sessions")
        .select("id, user_id, title, subject_context")
        .in("id", sessionIds)
    : { data: [], error: null };
  if (sessionError) throw sessionError;

  const userIds = [...new Set((sessions ?? []).map((session) => session.user_id as string))];

  const [{ data: profiles, error: profileError }, authUsersResult] = await Promise.all([
    userIds.length
      ? supabase
          .from("student_profiles")
          .select("user_id, full_name, college, board, grade")
          .in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase.auth.admin.listUsers()
      : Promise.resolve({ data: { users: [] }, error: null }),
  ]);

  if (profileError) throw profileError;
  if (authUsersResult.error) throw authUsersResult.error;

  const sessionById = new Map((sessions ?? []).map((session) => [session.id as string, session]));
  const profileByUserId = new Map(
    (profiles ?? []).map((profile) => [profile.user_id as string, profile]),
  );
  const emailByUserId = new Map(
    (authUsersResult.data.users ?? []).map((user) => [user.id, user.email ?? ""]),
  );

  const items = messageRows.map((message) => {
    const session = sessionById.get(message.session_id as string);
    const userId = (session?.user_id as string | undefined) ?? "";
    const profile = profileByUserId.get(userId);
    const citations = Array.isArray(message.citations) ? message.citations : [];
    const feedback = (message.feedback as string | null) ?? null;
    const reviewedAt = (message.admin_reviewed_at as string | null) ?? null;

    return {
      messageId: message.id as string,
      sessionId: (message.session_id as string) ?? "",
      userId,
      studentName: (profile?.full_name as string | null) || "Student",
      studentEmail: emailByUserId.get(userId) ?? "",
      college: (profile?.college as string | null) ?? "",
      board: (profile?.board as string | null) ?? "",
      grade: (profile?.grade as string | null) ?? "",
      subjectContext: (session?.subject_context as string | null) ?? null,
      sessionTitle: (session?.title as string | null) ?? "Session",
      answerContent: String(message.content ?? ""),
      answerPreview: String(message.content ?? "").slice(0, 220),
      feedback,
      grounded: Boolean(message.grounded),
      citationCount: citations.length,
      citations,
      status: reviewedAt
        ? "reviewed"
        : feedback === "down"
          ? "flagged"
          : feedback === "up"
            ? "liked"
            : "neutral",
      createdAt: message.created_at as string,
      reviewedAt,
      reviewedBy: (message.admin_reviewed_by as string | null) ?? null,
      adminReviewNote: (message.admin_review_note as string | null) ?? null,
    };
  });

  const total = count ?? items.length;
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  } satisfies AdminListPage<(typeof items)[number]>;
}

export async function listAdminRevisionNotes(url: string) {
  const supabase = createSupabaseAdminClient();
  const { page, pageSize, q } = parsePageQuery(url);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("revision_notes")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(
      `title.ilike.%${q}%,subject_tag.ilike.%${q}%,chapter_tag.ilike.%${q}%,annotation.ilike.%${q}%,colour_label.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const userIds = Array.from(new Set(rows.map((row) => String(row.user_id ?? "")).filter(Boolean)));
  const sessionIds = Array.from(
    new Set(rows.map((row) => String(row.session_id ?? "")).filter(Boolean)),
  );
  const messageIds = Array.from(
    new Set(rows.map((row) => String(row.message_id ?? "")).filter(Boolean)),
  );

  const [
    { data: profiles, error: profileError },
    authResult,
    { data: sessions, error: sessionError },
    { data: messages, error: messageError },
  ] = await Promise.all([
    userIds.length
      ? supabase.from("student_profiles").select("user_id, full_name").in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase.auth.admin.listUsers({ page: 1, perPage: Math.max(200, userIds.length) })
      : Promise.resolve({ data: { users: [] }, error: null }),
    sessionIds.length
      ? supabase.from("chat_sessions").select("id, title, subject_context").in("id", sessionIds)
      : Promise.resolve({ data: [], error: null }),
    messageIds.length
      ? supabase.from("chat_messages").select("id, role, content").in("id", messageIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profileError) throw profileError;
  if (authResult.error) throw authResult.error;
  if (sessionError) throw sessionError;
  if (messageError) throw messageError;

  const profileByUserId = new Map(
    (profiles ?? []).map((row) => [String(row.user_id), String(row.full_name ?? "")]),
  );
  const emailByUserId = new Map(
    (authResult.data.users ?? []).map((user) => [user.id, user.email ?? ""]),
  );
  const sessionById = new Map(
    (sessions ?? []).map((row) => [
      String(row.id),
      {
        title: String(row.title ?? ""),
        subjectContext: String(row.subject_context ?? ""),
      },
    ]),
  );
  const messageById = new Map(
    (messages ?? []).map((row) => [
      String(row.id),
      {
        role: String(row.role ?? ""),
        preview: String(row.content ?? "").slice(0, 220),
      },
    ]),
  );

  const items = rows.map((row) => {
    const userId = String(row.user_id ?? "");
    const sessionId = String(row.session_id ?? "");
    const messageId = String(row.message_id ?? "");
    const session = sessionById.get(sessionId);
    const message = messageById.get(messageId);
    return {
      id: String(row.id),
      userId,
      userFullName: profileByUserId.get(userId) ?? "",
      userEmail: emailByUserId.get(userId) ?? "",
      sessionId,
      sessionTitle: session?.title ?? "",
      subjectContext: session?.subjectContext ?? "",
      messageId,
      messageRole: message?.role ?? "",
      messagePreview: message?.preview ?? "",
      title: String(row.title ?? ""),
      subjectTag: String(row.subject_tag ?? ""),
      chapterTag: row.chapter_tag ? String(row.chapter_tag) : "",
      annotation: row.annotation ? String(row.annotation) : "",
      colourLabel: String(row.colour_label ?? ""),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  });

  const total = count ?? items.length;
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  } satisfies AdminListPage<(typeof items)[number]>;
}

export async function listAdminNoteRevisionLogs(url: string) {
  const supabase = createSupabaseAdminClient();
  const { page, pageSize, q } = parsePageQuery(url);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("note_revision_logs")
    .select("*", { count: "exact" })
    .order("revised_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(`action.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const noteIds = Array.from(new Set(rows.map((row) => String(row.note_id ?? "")).filter(Boolean)));
  const userIds = Array.from(new Set(rows.map((row) => String(row.user_id ?? "")).filter(Boolean)));

  const [
    { data: notes, error: noteError },
    { data: profiles, error: profileError },
    authResult,
  ] = await Promise.all([
    noteIds.length
      ? supabase
          .from("revision_notes")
          .select("id, title, subject_tag, chapter_tag, session_id, message_id")
          .in("id", noteIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase.from("student_profiles").select("user_id, full_name").in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase.auth.admin.listUsers({ page: 1, perPage: Math.max(200, userIds.length) })
      : Promise.resolve({ data: { users: [] }, error: null }),
  ]);
  if (noteError) throw noteError;
  if (profileError) throw profileError;
  if (authResult.error) throw authResult.error;

  const sessionIds = Array.from(
    new Set((notes ?? []).map((row) => String(row.session_id ?? "")).filter(Boolean)),
  );
  const messageIds = Array.from(
    new Set((notes ?? []).map((row) => String(row.message_id ?? "")).filter(Boolean)),
  );

  const [
    { data: sessions, error: sessionError },
    { data: messages, error: messageError },
  ] = await Promise.all([
    sessionIds.length
      ? supabase.from("chat_sessions").select("id, title").in("id", sessionIds)
      : Promise.resolve({ data: [], error: null }),
    messageIds.length
      ? supabase.from("chat_messages").select("id, content").in("id", messageIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (sessionError) throw sessionError;
  if (messageError) throw messageError;

  const noteById = new Map(
    (notes ?? []).map((row) => [
      String(row.id),
      {
        title: String(row.title ?? ""),
        subjectTag: String(row.subject_tag ?? ""),
        chapterTag: row.chapter_tag ? String(row.chapter_tag) : "",
        sessionId: String(row.session_id ?? ""),
        messageId: String(row.message_id ?? ""),
      },
    ]),
  );
  const profileByUserId = new Map(
    (profiles ?? []).map((row) => [String(row.user_id), String(row.full_name ?? "")]),
  );
  const emailByUserId = new Map(
    (authResult.data.users ?? []).map((user) => [user.id, user.email ?? ""]),
  );
  const sessionById = new Map(
    (sessions ?? []).map((row) => [String(row.id), String(row.title ?? "")]),
  );
  const messageById = new Map(
    (messages ?? []).map((row) => [String(row.id), String(row.content ?? "").slice(0, 220)]),
  );

  const items = rows.map((row) => {
    const userId = String(row.user_id ?? "");
    const noteId = String(row.note_id ?? "");
    const note = noteById.get(noteId);
    return {
      id: String(row.id),
      noteId,
      userId,
      userFullName: profileByUserId.get(userId) ?? "",
      userEmail: emailByUserId.get(userId) ?? "",
      noteTitle: note?.title ?? "",
      subjectTag: note?.subjectTag ?? "",
      chapterTag: note?.chapterTag ?? "",
      sessionId: note?.sessionId ?? "",
      sessionTitle: note?.sessionId ? (sessionById.get(note.sessionId) ?? "") : "",
      messageId: note?.messageId ?? "",
      messagePreview: note?.messageId ? (messageById.get(note.messageId) ?? "") : "",
      action: String(row.action ?? ""),
      revisedAt: String(row.revised_at),
    };
  });

  const total = count ?? items.length;
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  } satisfies AdminListPage<(typeof items)[number]>;
}

export async function listAdminPaymentSubmissions() {
  const supabase = createSupabaseAdminClient();
  const { data: submissionRows, error: submissionError } = await supabase
    .from("payment_submissions")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (submissionError) throw submissionError;

  return (submissionRows ?? []).map((submission) => ({
    id: submission.id,
    invoiceId: submission.invoice_id,
    userId: submission.user_id,
    reference: submission.reference,
    proofMeta: submission.proof_meta ?? null,
    status: submission.status,
    submittedAt: submission.submitted_at,
    reviewedAt: submission.reviewed_at ?? null,
    reviewedBy: submission.reviewed_by ?? null,
    updatedAt: submission.updated_at,
  }));
}

export async function listPromptTemplates(url: string) {
  const supabase = createSupabaseAdminClient();
  const q = new URL(url).searchParams.get("q")?.trim() ?? "";
  let query = supabase
    .from("prompt_templates")
    .select("*")
    .order("purpose", { ascending: true })
    .order("language", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(200);

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%,content.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    purpose: row.purpose,
    language: row.language,
    description: row.description ?? null,
    content: row.content,
    isActive: Boolean(row.is_active),
    updatedBy: row.updated_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function listAdminSubscriptionPlans() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("price", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    credits: Number(row.credits ?? 0),
    price: Number(row.price ?? 0),
    currency: row.currency,
    billingType: row.billing_type,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function listAdminSubscriptions() {
  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;

  return (rows ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    invoiceId: row.invoice_id,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
  }));
}

export async function listAdminInvoices() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    status: row.status,
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "NPR"),
    paymentMethod: String(row.payment_method ?? ""),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function listAdminCreditsLedger() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("credits_ledger")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  if (!rows.length) return [];

  const userIds = Array.from(new Set(rows.map((row) => String(row.user_id)).filter(Boolean)));
  const [profilesRes, authRes] = await Promise.all([
    supabase.from("student_profiles").select("user_id, full_name, role").in("user_id", userIds),
    supabase.auth.admin.listUsers({ page: 1, perPage: Math.max(200, userIds.length) }),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  if (authRes.error) throw authRes.error;

  const profileByUserId = new Map(
    (profilesRes.data ?? []).map((row) => [
      String(row.user_id),
      {
        fullName: String(row.full_name ?? ""),
        role: String(row.role ?? "student"),
      },
    ]),
  );
  const authByUserId = new Map(
    (authRes.data.users ?? []).map((user) => [
      user.id,
      {
        email: user.email ?? "",
      },
    ]),
  );

  const grouped = new Map<
    string,
    {
      id: string;
      userId: string;
      fullName: string;
      email: string;
      role: string;
      currentBalance: number;
      ledgerCount: number;
      lastEntryAt: string;
      entries: Array<{
        id: string;
        type: string;
        amount: number;
        balanceAfter: number;
        referenceType: string;
        referenceId: string;
        description: string | null;
        createdAt: string;
      }>;
    }
  >();

  for (const row of rows) {
    const userId = String(row.user_id);
    if (!grouped.has(userId)) {
      const profile = profileByUserId.get(userId);
      const auth = authByUserId.get(userId);
      grouped.set(userId, {
        id: userId,
        userId,
        fullName: profile?.fullName ?? "",
        email: auth?.email ?? "",
        role: profile?.role ?? "student",
        currentBalance: Number(row.balance_after ?? 0),
        ledgerCount: 0,
        lastEntryAt: String(row.created_at),
        entries: [],
      });
    }

    const account = grouped.get(userId)!;
    account.ledgerCount += 1;
    account.entries.push({
      id: String(row.id),
      type: String(row.type),
      amount: Number(row.amount ?? 0),
      balanceAfter: Number(row.balance_after ?? 0),
      referenceType: String(row.reference_type),
      referenceId: String(row.reference_id),
      description: row.description ? String(row.description) : null,
      createdAt: String(row.created_at),
    });
  }

  return Array.from(grouped.values()).sort((a, b) =>
    b.lastEntryAt.localeCompare(a.lastEntryAt),
  );
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

export async function updateAdminUserRole(userId: string, role: "student" | "admin") {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("student_profiles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function updateAdminStudentProfile(input: {
  userId: string;
  fullName: string;
  college: string;
  board: string;
  grade: string;
  boardScore?: string;
  subjects?: string[];
  targetGrade?: string;
  languagePref: "EN" | "RN";
  role: "student" | "admin";
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("student_profiles").upsert(
    {
      user_id: input.userId,
      full_name: input.fullName.trim() || null,
      college: input.college.trim(),
      board: input.board.trim(),
      grade: input.grade.trim(),
      board_score: input.boardScore?.trim() || null,
      subjects: (input.subjects ?? []).map((subject) => subject.trim()).filter(Boolean),
      target_grade: input.targetGrade?.trim() ?? "",
      language_pref: input.languagePref,
      role: input.role,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function bulkUpdateAdminUserRoles(userIds: string[], role: "student" | "admin") {
  const normalized = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (!normalized.length) throw new Error("No user ids were provided.");
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("student_profiles").upsert(
    normalized.map((userId) => ({ user_id: userId, role })),
    { onConflict: "user_id" },
  );
  if (error) throw error;
  return { updatedCount: normalized.length, userIds: normalized };
}

export async function adjustAdminUserCredits(input: {
  userId: string;
  amount: number;
  description: string;
  adminUserId: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: latest, error: latestError } = await supabase
    .from("credits_ledger")
    .select("balance_after")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw latestError;

  const current = Number(latest?.balance_after ?? 0);
  const next = current + input.amount;

  const { error } = await supabase.from("credits_ledger").insert({
    user_id: input.userId,
    type: "adjustment",
    amount: input.amount,
    balance_after: next,
    reference_type: "manual_adjustment",
    reference_id: `admin:${input.adminUserId}:${Date.now()}`,
    description: input.description.trim() || "Manual admin credit adjustment",
  });
  if (error) throw error;
}

export async function createPromptTemplate(
  input: {
    name: string;
    slug?: string;
    purpose: "system" | "followup" | "rewrite";
    language: "EN" | "RN";
    description?: string;
    content: string;
    isActive?: boolean;
  },
  adminUserId: string,
) {
  const supabase = createSupabaseAdminClient();
  const payload = {
    name: input.name.trim(),
    slug: slugify(input.slug || input.name),
    purpose: input.purpose,
    language: input.language,
    description: input.description?.trim() || null,
    content: input.content.trim(),
    is_active: Boolean(input.isActive),
    updated_by: adminUserId,
  };

  if (payload.is_active) {
    const { error: deactivateError } = await supabase
      .from("prompt_templates")
      .update({ is_active: false })
      .eq("purpose", payload.purpose)
      .eq("language", payload.language);
    if (deactivateError) throw deactivateError;
  }

  const { data, error } = await supabase
    .from("prompt_templates")
    .insert(payload)
    .select("*")
    .single();
  if (error || !data) throw error || new Error("Failed to create prompt template.");
  return data;
}

export async function updatePromptTemplate(
  promptId: string,
  input: {
    name: string;
    slug?: string;
    purpose: "system" | "followup" | "rewrite";
    language: "EN" | "RN";
    description?: string;
    content: string;
    isActive?: boolean;
  },
  adminUserId: string,
) {
  const supabase = createSupabaseAdminClient();
  const payload = {
    name: input.name.trim(),
    slug: slugify(input.slug || input.name),
    purpose: input.purpose,
    language: input.language,
    description: input.description?.trim() || null,
    content: input.content.trim(),
    is_active: Boolean(input.isActive),
    updated_by: adminUserId,
  };

  if (payload.is_active) {
    const { error: deactivateError } = await supabase
      .from("prompt_templates")
      .update({ is_active: false })
      .eq("purpose", payload.purpose)
      .eq("language", payload.language)
      .neq("id", promptId);
    if (deactivateError) throw deactivateError;
  }

  const { data, error } = await supabase
    .from("prompt_templates")
    .update(payload)
    .eq("id", promptId)
    .select("*")
    .single();
  if (error || !data) throw error || new Error("Failed to update prompt template.");
  return data;
}

export async function deletePromptTemplate(promptId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("prompt_templates").delete().eq("id", promptId);
  if (error) throw error;
}

export async function createAdminSubscriptionPlan(input: {
  name: string;
  slug?: string;
  credits: number;
  price: number;
  currency?: string;
  billingType: "monthly" | "one_time";
  isActive?: boolean;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .insert({
      name: input.name.trim(),
      slug: slugify(input.slug || input.name),
      credits: input.credits,
      price: input.price,
      currency: (input.currency || "NPR").trim().toUpperCase(),
      billing_type: input.billingType,
      is_active: input.isActive ?? true,
    })
    .select("*")
    .single();

  if (error || !data) throw error || new Error("Failed to create subscription plan.");
  return data;
}

export async function updateAdminSubscriptionPlan(
  planId: string,
  input: {
    name: string;
    slug?: string;
    credits: number;
    price: number;
    currency?: string;
    billingType: "monthly" | "one_time";
    isActive?: boolean;
  },
) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .update({
      name: input.name.trim(),
      slug: slugify(input.slug || input.name),
      credits: input.credits,
      price: input.price,
      currency: (input.currency || "NPR").trim().toUpperCase(),
      billing_type: input.billingType,
      is_active: input.isActive ?? true,
    })
    .eq("id", planId)
    .select("*")
    .single();

  if (error || !data) throw error || new Error("Failed to update subscription plan.");
  return data;
}

export async function grantAdminSubscription(input: {
  userId: string;
  planId: string;
  startsAt?: string | null;
  endsAt?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .insert({
      user_id: input.userId,
      plan_id: input.planId,
      invoice_id: null,
      status: "active",
      starts_at: input.startsAt ?? new Date().toISOString(),
      ends_at: input.endsAt ?? null,
    })
    .select("id")
    .single();

  if (error || !data) throw error || new Error("Failed to grant subscription.");
  return data.id as string;
}

export async function cancelAdminSubscription(subscriptionId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      status: "cancelled",
      ends_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId);
  if (error) throw error;
}

export async function createAdminKnowledgeNotebook(input: {
  title: string;
  board: string;
  level: string;
  faculty: string;
  subject: string;
  curriculum?: string;
  description?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("knowledge_notebooks")
    .insert({
      title: input.title.trim(),
      board: input.board.trim(),
      level: input.level.trim(),
      faculty: input.faculty.trim(),
      subject: input.subject.trim(),
      curriculum: input.curriculum?.trim() ?? "",
      description: input.description?.trim() ?? "",
    })
    .select("*")
    .single();
  if (error || !data) throw error || new Error("Failed to create notebook.");
  return data;
}

export async function updateAdminKnowledgeNotebook(
  notebookId: string,
  input: {
    title: string;
    board: string;
    level: string;
    faculty: string;
    subject: string;
    curriculum?: string;
    description?: string;
  },
) {
  const supabase = createSupabaseAdminClient();
  const payload = {
    title: input.title.trim(),
    board: input.board.trim(),
    level: input.level.trim(),
    faculty: input.faculty.trim(),
    subject: input.subject.trim(),
    curriculum: input.curriculum?.trim() ?? "",
    description: input.description?.trim() ?? "",
  };
  const { data, error } = await supabase
    .from("knowledge_notebooks")
    .update(payload)
    .eq("id", notebookId)
    .select("*")
    .single();
  if (error || !data) throw error || new Error("Failed to update notebook.");

  const { error: cascadeError } = await supabase
    .from("knowledge_documents")
    .update({
      board: payload.board,
      grade: payload.level,
      faculty: payload.faculty,
      subject: payload.subject,
      curriculum: payload.curriculum,
    })
    .eq("notebook_id", notebookId);
  if (cascadeError) throw cascadeError;
  return data;
}

export async function deleteAdminKnowledgeNotebook(notebookId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("knowledge_notebooks").delete().eq("id", notebookId);
  if (error) throw error;
}

export async function createAdminKnowledgeDocument(input: {
  notebookId: string;
  board: string;
  grade: string;
  faculty?: string;
  curriculum?: string;
  subject: string;
  chapter?: string | null;
  resourceKind: string;
  resourceSubtype: string;
  title: string;
  sourceName: string;
  sourceType: string;
  rawContent: string;
  storageBucket?: string | null;
  storagePath?: string | null;
  sourceMimeType?: string | null;
  sourceSizeBytes?: number | null;
}) {
  const supabase = createSupabaseAdminClient();
  const notebook = await getKnowledgeNotebookContext(input.notebookId);
  const { data, error } = await supabase
    .from("knowledge_documents")
    .insert({
      notebook_id: notebook.id,
      board: notebook.board,
      grade: notebook.level,
      faculty: notebook.faculty,
      curriculum: notebook.curriculum,
      subject: notebook.subject,
      chapter: input.chapter?.trim() || null,
      resource_kind: input.resourceKind,
      resource_subtype: input.resourceSubtype,
      title: input.title.trim(),
      source_name: input.sourceName.trim(),
      source_type: input.sourceType.trim(),
      storage_bucket: input.storageBucket ?? null,
      storage_path: input.storagePath ?? null,
      source_mime_type: input.sourceMimeType ?? null,
      source_size_bytes: input.sourceSizeBytes ?? null,
      document_type: input.resourceSubtype,
      raw_content: input.rawContent.trim(),
      processing_status: "draft",
      processing_error: null,
    })
    .select("*")
    .single();

  if (error || !data) throw error || new Error("Failed to create knowledge document.");
  return data;
}

export async function updateAdminKnowledgeDocument(
  documentId: string,
  input: {
    notebookId: string;
    board: string;
    grade: string;
    faculty?: string;
    curriculum?: string;
    subject: string;
    chapter?: string | null;
    resourceKind: string;
    resourceSubtype: string;
    title: string;
    sourceName: string;
    sourceType: string;
    rawContent: string;
    storageBucket?: string | null;
    storagePath?: string | null;
    sourceMimeType?: string | null;
    sourceSizeBytes?: number | null;
  },
) {
  const supabase = createSupabaseAdminClient();
  const notebook = await getKnowledgeNotebookContext(input.notebookId);
  const { data, error } = await supabase
    .from("knowledge_documents")
    .update({
      notebook_id: notebook.id,
      board: notebook.board,
      grade: notebook.level,
      faculty: notebook.faculty,
      curriculum: notebook.curriculum,
      subject: notebook.subject,
      chapter: input.chapter?.trim() || null,
      resource_kind: input.resourceKind,
      resource_subtype: input.resourceSubtype,
      title: input.title.trim(),
      source_name: input.sourceName.trim(),
      source_type: input.sourceType.trim(),
      storage_bucket: input.storageBucket ?? null,
      storage_path: input.storagePath ?? null,
      source_mime_type: input.sourceMimeType ?? null,
      source_size_bytes: input.sourceSizeBytes ?? null,
      document_type: input.resourceSubtype,
      raw_content: input.rawContent.trim(),
      processing_status: "draft",
      processing_error: null,
    })
    .eq("id", documentId)
    .select("*")
    .single();

  if (error || !data) throw error || new Error("Failed to update knowledge document.");
  return data;
}

export async function getAdminKnowledgeDocument(documentId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("knowledge_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteAdminKnowledgeDocument(documentId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: document, error: documentError } = await supabase
    .from("knowledge_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (documentError) throw documentError;
  await removeKnowledgeSourceFile((document?.storage_path as string | null) ?? null);

  const { error } = await supabase.from("knowledge_documents").delete().eq("id", documentId);
  if (error) throw error;
}

export async function getAdminKnowledgeSourceSignedUrl(
  documentId: string,
  options?: { download?: boolean },
) {
  const supabase = createSupabaseAdminClient();
  const { data: document, error } = await supabase
    .from("knowledge_documents")
    .select("source_name, storage_bucket, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (error) throw error;
  if (!document?.storage_bucket || !document?.storage_path) return null;

  return createKnowledgeSourceSignedUrl({
    storageBucket: document.storage_bucket,
    storagePath: document.storage_path,
    sourceName: document.source_name ?? "source-file",
    download: options?.download ?? false,
  });
}

export async function processAdminKnowledgeDocument(documentId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: document, error: documentError } = await supabase
    .from("knowledge_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (documentError) throw documentError;
  if (!document) throw new Error("Knowledge document not found.");

  let rawContent = String(document.raw_content ?? "").trim();
  if (!rawContent) {
    if (!document.storage_bucket || !document.storage_path) {
      throw new Error("Upload a source file or add content before processing.");
    }

    const sourceFile = await downloadKnowledgeSourceFile({
      storageBucket: document.storage_bucket,
      storagePath: document.storage_path,
      sourceName: document.source_name ?? "source-file",
      sourceMimeType: document.source_mime_type ?? null,
    });
    const extracted = await extractKnowledgeFileContent(sourceFile);
    rawContent = extracted.rawContent.trim();

    if (!rawContent) {
      throw new Error("No readable text could be extracted from the source file.");
    }

    const { error: persistContentError } = await supabase
      .from("knowledge_documents")
      .update({ raw_content: rawContent, processing_error: null })
      .eq("id", documentId);
    if (persistContentError) throw persistContentError;
  }

  await supabase
    .from("knowledge_documents")
    .update({ processing_status: "processing", processing_error: null })
    .eq("id", documentId);

  try {
    const chunks = chunkDocumentContent(rawContent);
    if (!chunks.length) {
      throw new Error("Content too short to chunk.");
    }
    const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
    await supabase.from("knowledge_chunks").delete().eq("document_id", documentId);
    const rows = chunks.map((chunk, index) => ({
      document_id: documentId,
      board: document.board,
      grade: document.grade,
      subject: document.subject,
      chapter: document.chapter,
      topic: document.title,
      content: chunk.content,
      embedding: embeddings[index] ?? [],
      chunk_index: chunk.chunkIndex,
    }));
    await insertKnowledgeChunksInBatches(rows);

    await supabase
      .from("knowledge_documents")
      .update({
        chunk_count: rows.length,
        processing_status: "ready",
        processing_error: null,
      })
      .eq("id", documentId);
  } catch (error) {
    await supabase
      .from("knowledge_documents")
      .update({
        processing_status: "failed",
        processing_error: error instanceof Error ? error.message : "Unknown processing failure",
      })
      .eq("id", documentId);
    throw error;
  }
}

export async function bulkProcessAdminKnowledgeDocuments(documentIds: string[]) {
  const normalized = [...new Set(documentIds.map((id) => id.trim()).filter(Boolean))];
  if (!normalized.length) {
    throw new Error("No document ids were provided.");
  }

  const successes: string[] = [];
  const failures: Array<{ documentId: string; error: string }> = [];

  for (const documentId of normalized) {
    try {
      await processAdminKnowledgeDocument(documentId);
      successes.push(documentId);
    } catch (error) {
      failures.push({
        documentId,
        error: error instanceof Error ? error.message : "Unknown processing failure",
      });
    }
  }

  return {
    total: normalized.length,
    succeeded: successes.length,
    failed: failures.length,
    successes,
    failures,
  };
}

export async function updateAdminAnswerReview(
  messageId: string,
  payload: {
    adminUserId: string;
    reviewed?: boolean;
    adminReviewNote?: string | null;
  },
) {
  const updatePayload: Record<string, unknown> = {};
  if (payload.reviewed !== undefined) {
    updatePayload.admin_reviewed_at = payload.reviewed ? new Date().toISOString() : null;
    updatePayload.admin_reviewed_by = payload.reviewed ? payload.adminUserId : null;
  }
  if (payload.adminReviewNote !== undefined) {
    const note = payload.adminReviewNote?.trim() ?? "";
    updatePayload.admin_review_note = note ? note : null;
  }
  if (!Object.keys(updatePayload).length) {
    throw new Error("No review updates provided.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("chat_messages")
    .update(updatePayload)
    .eq("id", messageId)
    .eq("role", "assistant");
  if (error) throw error;
}

export async function bulkUpdateAdminAnswerReview(
  messageIds: string[],
  payload: { adminUserId: string; reviewed: boolean; adminReviewNote?: string | null },
) {
  const normalized = [...new Set(messageIds.map((id) => id.trim()).filter(Boolean))];
  if (!normalized.length) throw new Error("No answer ids were provided.");

  const updatePayload: Record<string, unknown> = {
    admin_reviewed_at: payload.reviewed ? new Date().toISOString() : null,
    admin_reviewed_by: payload.reviewed ? payload.adminUserId : null,
  };
  if (payload.adminReviewNote !== undefined) {
    const note = payload.adminReviewNote?.trim() ?? "";
    updatePayload.admin_review_note = note ? note : null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .update(updatePayload)
    .eq("role", "assistant")
    .in("id", normalized)
    .select("id");
  if (error) throw error;
  return {
    updatedCount: data?.length ?? 0,
    messageIds: (data ?? []).map((row) => row.id as string),
  };
}

export async function updatePaymentSubmissionStatus(
  submissionId: string,
  action: "approve" | "reject",
) {
  const supabase = createSupabaseAdminClient();
  const { error } =
    action === "approve"
      ? await supabase.rpc("approve_payment_submission", {
          target_submission_id: submissionId,
        })
      : await supabase.rpc("reject_payment_submission", {
          target_submission_id: submissionId,
        });
  if (error) throw error;
}
