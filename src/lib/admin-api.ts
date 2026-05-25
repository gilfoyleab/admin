export type Column = {
  key: string;
  label: string;
  type?: "text" | "uuid" | "fk" | "bool" | "date" | "int" | "json" | "array";
};

export type Model = {
  app: string;
  name: string;
  verbose: string;
  verbosePlural: string;
  columns: Column[];
  rows: Array<Record<string, unknown>>;
  totalCount?: number;
};

type AdminListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type AdminUserSummary = {
  userId: string;
  email: string;
  fullName: string;
  board: string;
  grade: string;
  role: "student" | "admin";
  onboarded: boolean;
  creditBalance: number;
  createdAt: string;
};

type AdminAuthUserSummary = {
  id: string;
  email: string;
  provider: string;
  emailConfirmedAt: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

type AdminStudentProfileSummary = {
  userId: string;
  fullName: string;
  college: string;
  board: string;
  grade: string;
  boardScore: string;
  subjects: string[];
  targetGrade: string;
  languagePref: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

type AdminKnowledgeNotebookSummary = {
  id: string;
  title: string;
  board: string;
  level: string;
  faculty: string;
  subject: string;
  curriculum?: string;
  description?: string;
  resourceCount: number;
  readyChunkCount: number;
  createdAt: string;
};

type AdminKnowledgeDocumentSummary = {
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
  rawContent: string;
  chunkCount: number;
  processingStatus: string;
  processingError: string | null;
  uploadedAt: string;
  updatedAt: string;
};

type AdminKnowledgeChunkSummary = {
  id: string;
  documentId: string;
  board: string;
  grade: string;
  subject: string;
  chapter: string | null;
  topic: string | null;
  content: string;
  chunkIndex: number;
  chunkCount: number;
};

type AdminChatSessionSummary = {
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
    linkedMessages: Array<{
      id: string;
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
  }>;
};

type AdminChatMessageSummary = {
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
};

type AdminAnswerSummary = {
  messageId: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  college?: string | null;
  board?: string | null;
  grade?: string | null;
  subjectContext: string | null;
  sessionId?: string | null;
  sessionTitle?: string | null;
  answerContent?: string;
  status: string;
  feedback: string | null;
  adminReviewNote?: string | null;
  grounded: boolean;
  citationCount: number;
  citations?: unknown;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
};

type AdminRevisionNoteSummary = {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  sessionId: string;
  sessionTitle: string;
  subjectContext: string;
  messageId: string;
  messageRole: string;
  messagePreview: string;
  title: string;
  subjectTag: string;
  chapterTag: string;
  annotation: string;
  colourLabel: string;
  createdAt: string;
  updatedAt: string;
};

type AdminNoteRevisionLogSummary = {
  id: string;
  noteId: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  noteTitle: string;
  subjectTag: string;
  chapterTag: string;
  sessionId: string;
  sessionTitle: string;
  messageId: string;
  messagePreview: string;
  action: string;
  revisedAt: string;
};

type AdminPaymentSubmissionSummary = {
  id: string;
  userId: string;
  invoiceId: string;
  reference: string;
  proofMeta: unknown;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  updatedAt: string;
};

type PromptTemplate = {
  id: string;
  name: string;
  slug: string;
  purpose: string;
  language: string;
  description: string | null;
  content: string;
  isActive: boolean;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt: string;
};

type SubscriptionPlan = {
  id: string;
  name: string;
  slug: string;
  credits: number;
  price: number;
  currency: string;
  billingType: string;
  isActive: boolean;
};

type AdminSubscriptionSummary = {
  id: string;
  userId: string;
  planId: string;
  invoiceId: string | null;
  status: string;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
};

type AdminInvoiceSummary = {
  id: string;
  userId: string;
  planId: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
};

type AdminCreditsLedgerSummary = {
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
};

type CreditsLedgerEntry = AdminCreditsLedgerSummary["entries"][number];

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    const message = payload.error ?? `${response.status} ${response.statusText}`;
    throw new Error(`${path}: ${message}`);
  }

  return payload;
}

export async function hasActiveAdminSession() {
  const response = await fetch("/api/admin/session", {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 401) {
    return false;
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Session check failed (${response.status}).`);
  }

  return true;
}

async function requestJson<T>(
  path: string,
  options: {
    method: "POST" | "PATCH" | "DELETE";
    body?: unknown;
  },
): Promise<T> {
  const response = await fetch(path, {
    method: options.method,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      Accept: "application/json",
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(payload.error ?? `${options.method} ${path} failed.`);
  }
  return payload;
}

function toInt(value: unknown, fallback = 0) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.trunc(next);
}

function toBool(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return Boolean(value);
}

export function canAddModel(modelName: string) {
  return [
    "knowledge_notebooks",
    "knowledge_documents",
    "prompt_templates",
    "subscription_plans",
    "user_subscriptions",
  ].includes(modelName);
}

export function canDeleteModel(modelName: string) {
  return [
    "knowledge_notebooks",
    "knowledge_documents",
    "prompt_templates",
    "user_subscriptions",
  ].includes(modelName);
}

export async function saveModelRow(input: {
  modelName: string;
  row: Record<string, unknown>;
  previousRow?: Record<string, unknown> | null;
  isNew?: boolean;
}) {
  const { modelName, row, previousRow, isNew } = input;

  if (modelName === "student_profiles") {
    const userId = String(row.id ?? "");
    if (!userId) throw new Error("User id is required.");
    const role = String(row.role ?? "student") === "admin" ? "admin" : "student";
    await requestJson(`/api/admin/student-profiles/${userId}`, {
      method: "PATCH",
      body: {
        fullName: String(row.full_name ?? ""),
        college: String(row.college ?? ""),
        board: String(row.board ?? ""),
        grade: String(row.grade ?? ""),
        boardScore: String(row.board_score ?? ""),
        subjects: String(row.subjects ?? "")
          .split(",")
          .map((subject) => subject.trim())
          .filter(Boolean),
        targetGrade: String(row.target_grade ?? ""),
        languagePref:
          String(row.language_pref ?? "EN").trim().toUpperCase() === "RN" ? "RN" : "EN",
        role,
      },
    });
    return;
  }

  if (modelName === "knowledge_notebooks") {
    const payload = {
      title: String(row.title ?? "").trim(),
      board: String(row.board ?? "").trim(),
      level: String(row.level ?? "").trim(),
      faculty: String(row.faculty ?? "").trim(),
      subject: String(row.subject ?? "").trim(),
      curriculum: String(row.curriculum ?? ""),
      description: String(row.description ?? ""),
    };

    if (isNew) {
      await requestJson("/api/admin/notebooks", { method: "POST", body: payload });
    } else {
      const id = String(row.id ?? "");
      if (!id) throw new Error("Notebook id is required.");
      await requestJson(`/api/admin/notebooks/${id}`, { method: "PATCH", body: payload });
    }
    return;
  }

  if (modelName === "knowledge_documents") {
    const payload = {
      notebookId: String(row.notebook_id ?? "").trim(),
      board: String(row.board ?? "").trim(),
      grade: String(row.grade ?? "").trim(),
      faculty: String(row.faculty ?? ""),
      curriculum: String(row.curriculum ?? ""),
      subject: String(row.subject ?? "").trim(),
      chapter: row.chapter ? String(row.chapter).trim() : null,
      resourceKind: String(row.resource_kind ?? "").trim(),
      resourceSubtype: String(row.resource_subtype ?? "").trim(),
      title: String(row.title ?? "").trim(),
      sourceName: String(row.source_name ?? "").trim(),
      sourceType: String(row.source_type ?? "text").trim(),
      rawContent: String(row.raw_content ?? "").trim(),
    };
    if (!payload.notebookId) {
      throw new Error("notebook_id is required for knowledge document.");
    }
    if (!payload.resourceKind || !payload.resourceSubtype) {
      throw new Error("resource_kind and resource_subtype are required.");
    }

    if (isNew) {
      await requestJson("/api/admin/knowledge-documents", {
        method: "POST",
        body: payload,
      });
    } else {
      const id = String(row.id ?? "");
      if (!id) throw new Error("Document id is required.");
      await requestJson(`/api/admin/knowledge-documents/${id}`, {
        method: "PATCH",
        body: payload,
      });
    }
    return;
  }

  if (modelName === "assistant_answers") {
    const id = String(row.id ?? "");
    if (!id) throw new Error("Answer id is required.");
    const reviewState = String(row.review_state ?? row.status ?? "pending");
    await requestJson(`/api/admin/answers/${id}`, {
      method: "PATCH",
      body: {
        reviewed: reviewState === "reviewed",
        adminReviewNote: row.admin_review_note ? String(row.admin_review_note) : null,
      },
    });
    return;
  }

  if (modelName === "payment_submissions") {
    const id = String(row.id ?? "");
    if (!id) throw new Error("Submission id is required.");
    const status = String(row.status ?? "").toLowerCase();
    if (status !== "approved" && status !== "rejected") {
      throw new Error("Set status to approved or rejected before saving payment row.");
    }
    await requestJson(`/api/admin/payments/${id}`, {
      method: "PATCH",
      body: { action: status === "approved" ? "approve" : "reject" },
    });
    return;
  }

  if (modelName === "credits_ledger") {
    if (!isNew) {
      throw new Error("Existing ledger rows are immutable. Add a new adjustment instead.");
    }
    const userId = String(row.user_id ?? "").trim();
    const amount = toInt(row.amount, 0);
    if (!userId) throw new Error("user_id is required.");
    if (!amount) throw new Error("amount must be non-zero.");
    await requestJson("/api/admin/credits-ledger", {
      method: "POST",
      body: {
        userId,
        amount,
        description: String(row.description ?? "").trim() || "Manual admin adjustment",
      },
    });
    return;
  }

  if (modelName === "prompt_templates") {
    const payload = {
      name: String(row.name ?? "").trim(),
      slug: String(row.slug ?? row.name ?? "").trim(),
      purpose: String(row.purpose ?? "system").trim() as "system" | "followup" | "rewrite",
      language: String(row.language ?? "EN")
        .trim()
        .toUpperCase() as "EN" | "RN",
      description: String(row.description ?? ""),
      content: String(row.content ?? ""),
      isActive: toBool(row.is_active),
    };
    if (isNew) {
      await requestJson("/api/admin/prompt-templates", { method: "POST", body: payload });
    } else {
      const id = String(row.id ?? "");
      if (!id) throw new Error("Prompt id is required.");
      await requestJson(`/api/admin/prompt-templates/${id}`, { method: "PATCH", body: payload });
    }
    return;
  }

  if (modelName === "subscription_plans") {
    const payload = {
      name: String(row.name ?? "").trim(),
      slug: String(row.slug ?? row.name ?? "").trim(),
      credits: toInt(row.credits, 0),
      price: toInt(row.price, 0),
      currency: String(row.currency ?? "NPR")
        .trim()
        .toUpperCase(),
      billingType:
        String(row.billing_type ?? "monthly").trim() === "one_time" ? "one_time" : "monthly",
      isActive: toBool(row.is_active),
    };
    if (isNew) {
      await requestJson("/api/admin/subscriptions/plans", { method: "POST", body: payload });
    } else {
      const id = String(row.id ?? "");
      if (!id) throw new Error("Plan id is required.");
      await requestJson(`/api/admin/subscriptions/plans/${id}`, {
        method: "PATCH",
        body: payload,
      });
    }
    return;
  }

  if (modelName === "user_subscriptions") {
    if (isNew) {
      const payload = {
        userId: String(row.user_id ?? "").trim(),
        planId: String(row.plan_id ?? "").trim(),
        startsAt: row.starts_at ? String(row.starts_at) : null,
        endsAt: row.ends_at ? String(row.ends_at) : null,
      };
      if (!payload.userId || !payload.planId) {
        throw new Error("user_id and plan_id are required to add subscription.");
      }
      await requestJson("/api/admin/subscriptions/user-subscriptions", {
        method: "POST",
        body: payload,
      });
    } else {
      const id = String(row.id ?? "");
      if (!id) throw new Error("Subscription id is required.");
      const status = String(row.status ?? "").toLowerCase();
      if (status === "cancelled") {
        await requestJson(`/api/admin/subscriptions/user-subscriptions/${id}`, {
          method: "PATCH",
          body: { action: "cancel" },
        });
      } else {
        throw new Error("Only cancellation is supported from this table right now.");
      }
    }
    return;
  }

  throw new Error(`No save adapter configured for model "${modelName}".`);
}

export async function deleteModelRow(modelName: string, row: Record<string, unknown>) {
  if (modelName === "knowledge_notebooks") {
    const id = String(row.id ?? "");
    if (!id) throw new Error("Notebook id is required.");
    await requestJson(`/api/admin/notebooks/${id}`, { method: "DELETE" });
    return;
  }
  if (modelName === "knowledge_documents") {
    const id = String(row.id ?? "");
    if (!id) throw new Error("Document id is required.");
    await requestJson(`/api/admin/knowledge-documents/${id}`, { method: "DELETE" });
    return;
  }
  if (modelName === "prompt_templates") {
    const id = String(row.id ?? "");
    if (!id) throw new Error("Prompt id is required.");
    await requestJson(`/api/admin/prompt-templates/${id}`, { method: "DELETE" });
    return;
  }
  if (modelName === "user_subscriptions") {
    const id = String(row.id ?? "");
    if (!id) throw new Error("Subscription id is required.");
    await requestJson(`/api/admin/subscriptions/user-subscriptions/${id}`, { method: "DELETE" });
    return;
  }
  throw new Error(`Delete is not enabled for "${modelName}".`);
}

export async function applyBulkAction(input: {
  modelName: string;
  action: "mark_reviewed" | "mark_unreviewed" | "set_admin" | "set_student" | "process_documents";
  selectedIds: string[];
}) {
  if (!input.selectedIds.length) {
    throw new Error("No selected rows.");
  }

  if (input.modelName === "assistant_answers") {
    const action = input.action === "mark_unreviewed" ? "unreviewed" : "reviewed";
    await requestJson("/api/admin/answers/actions", {
      method: "POST",
      body: {
        action,
        messageIds: input.selectedIds,
      },
    });
    return;
  }

  if (input.modelName === "student_profiles") {
    const role = input.action === "set_admin" ? "admin" : "student";
    await requestJson("/api/admin/users/actions", {
      method: "POST",
      body: {
        action: "set_role",
        role,
        userIds: input.selectedIds,
      },
    });
    return;
  }

  if (input.modelName === "knowledge_documents") {
    await requestJson("/api/admin/knowledge-documents/actions", {
      method: "POST",
      body: {
        action: "process",
        documentIds: input.selectedIds,
      },
    });
    return;
  }

  throw new Error(`Bulk action is not supported for "${input.modelName}".`);
}

export async function loadAdminModels(): Promise<{ models: Model[]; warnings: string[] }> {
  const warnings: string[] = [];

  const [
    authUsersResult,
    studentProfilesResult,
    chatSessionsResult,
    chatMessagesResult,
    revisionNotesResult,
    noteRevisionLogsResult,
    notebooksResult,
    answersResult,
    knowledgeDocumentsResult,
    knowledgeChunksResult,
    paymentsResult,
    invoicesResult,
    creditsLedgerResult,
    promptsResult,
    plansResult,
    subscriptionsResult,
  ] = await Promise.allSettled([
    fetchJson<AdminListResponse<AdminAuthUserSummary>>("/api/admin/auth-users?page=1&pageSize=50"),
    fetchJson<AdminListResponse<AdminStudentProfileSummary>>(
      "/api/admin/student-profiles?page=1&pageSize=50",
    ),
    fetchJson<AdminListResponse<AdminChatSessionSummary>>(
      "/api/admin/chat-sessions?page=1&pageSize=50",
    ),
    fetchJson<AdminListResponse<AdminChatMessageSummary>>(
      "/api/admin/chat-messages?page=1&pageSize=50",
    ),
    fetchJson<AdminListResponse<AdminRevisionNoteSummary>>(
      "/api/admin/revision-notes?page=1&pageSize=50",
    ),
    fetchJson<AdminListResponse<AdminNoteRevisionLogSummary>>(
      "/api/admin/note-revision-logs?page=1&pageSize=50",
    ),
    fetchJson<AdminListResponse<AdminKnowledgeNotebookSummary>>(
      "/api/admin/notebooks?page=1&pageSize=50",
    ),
    fetchJson<AdminListResponse<AdminAnswerSummary>>("/api/admin/answers?page=1&pageSize=50"),
    fetchJson<AdminListResponse<AdminKnowledgeDocumentSummary>>(
      "/api/admin/knowledge-documents?page=1&pageSize=50",
    ),
    fetchJson<AdminListResponse<AdminKnowledgeChunkSummary>>(
      "/api/admin/knowledge-chunks?page=1&pageSize=50",
    ),
    fetchJson<{ submissions: AdminPaymentSubmissionSummary[] }>("/api/admin/payments"),
    fetchJson<{ invoices: AdminInvoiceSummary[] }>("/api/admin/invoices"),
    fetchJson<{ entries: AdminCreditsLedgerSummary[] }>("/api/admin/credits-ledger"),
    fetchJson<{ prompts: PromptTemplate[] }>("/api/admin/prompt-templates"),
    fetchJson<{ plans: SubscriptionPlan[] }>("/api/admin/subscriptions/plans"),
    fetchJson<{ subscriptions: AdminSubscriptionSummary[] }>(
      "/api/admin/subscriptions/user-subscriptions",
    ),
  ]);

  function value<T>(result: PromiseSettledResult<T>, label: string): T | null {
    if (result.status === "fulfilled") return result.value;
    warnings.push(
      `${label}: ${result.reason instanceof Error ? result.reason.message : "Request failed"}`,
    );
    return null;
  }

  const authUsers = value(authUsersResult, "Auth users");
  const studentProfiles = value(studentProfilesResult, "Student profiles");
  const chatSessions = value(chatSessionsResult, "Chat sessions");
  const chatMessages = value(chatMessagesResult, "Chat messages");
  const revisionNotes = value(revisionNotesResult, "Revision notes");
  const noteRevisionLogs = value(noteRevisionLogsResult, "Note revision logs");
  const notebooks = value(notebooksResult, "Notebooks");
  const answers = value(answersResult, "Answers");
  const knowledgeDocuments = value(knowledgeDocumentsResult, "Knowledge documents");
  const knowledgeChunks = value(knowledgeChunksResult, "Knowledge chunks");
  const payments = value(paymentsResult, "Payments");
  const invoices = value(invoicesResult, "Invoices");
  const creditsLedger = value(creditsLedgerResult, "Credits ledger");
  const prompts = value(promptsResult, "Prompt templates");
  const plans = value(plansResult, "Subscription plans");
  const subscriptions = value(subscriptionsResult, "User subscriptions");

  const models: Model[] = [];

  if (authUsers) {
    models.push({
      app: "Authentication",
      name: "auth_users",
      verbose: "Auth user",
      verbosePlural: "Auth users",
      columns: [
        { key: "id", label: "ID", type: "uuid" },
        { key: "email", label: "Email" },
        { key: "provider", label: "Provider" },
        { key: "email_confirmed_at", label: "Email confirmed", type: "date" },
        { key: "created_at", label: "Created", type: "date" },
        { key: "last_sign_in_at", label: "Last sign in", type: "date" },
      ],
      rows: authUsers.items.map((user) => ({
        id: user.id,
        email: user.email,
        provider: user.provider,
        email_confirmed_at: user.emailConfirmedAt ?? "",
        created_at: user.createdAt,
        last_sign_in_at: user.lastSignInAt ?? "",
      })),
      totalCount: authUsers.total,
    });
  }

  if (studentProfiles) {
    models.push({
      app: "Authentication",
      name: "student_profiles",
      verbose: "Student profile",
      verbosePlural: "Student profiles",
      columns: [
        { key: "id", label: "User ID", type: "uuid" },
        { key: "full_name", label: "Full name" },
        { key: "college", label: "College" },
        { key: "board", label: "Board" },
        { key: "grade", label: "Grade" },
        { key: "board_score", label: "Board score" },
        { key: "subjects", label: "Subjects" },
        { key: "target_grade", label: "Target grade" },
        { key: "language_pref", label: "Language" },
        { key: "role", label: "Role" },
        { key: "created_at", label: "Created", type: "date" },
        { key: "updated_at", label: "Updated", type: "date" },
      ],
      rows: studentProfiles.items.map((profile) => ({
        id: profile.userId,
        full_name: profile.fullName,
        college: profile.college,
        board: profile.board,
        grade: profile.grade,
        board_score: profile.boardScore,
        subjects: profile.subjects.join(", "),
        target_grade: profile.targetGrade,
        language_pref: profile.languagePref,
        role: profile.role,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
      })),
      totalCount: studentProfiles.total,
    });
  }

  if (chatSessions) {
    models.push({
      app: "Conversations",
      name: "chat_sessions",
      verbose: "Chat session",
      verbosePlural: "Chat sessions",
      columns: [
        { key: "user_id", label: "User ID", type: "uuid" },
        { key: "user_full_name", label: "Full name" },
        { key: "user_email", label: "Email" },
        { key: "session_count", label: "Sessions", type: "int" },
        { key: "message_count", label: "Messages", type: "int" },
        { key: "last_session_at", label: "Last session", type: "date" },
      ],
      rows: chatSessions.items.map((session) => ({
        id: session.userId,
        user_id: session.userId,
        user_full_name: session.userFullName,
        user_email: session.userEmail,
        session_count: session.sessionCount,
        message_count: session.messageCount,
        last_session_at: session.lastSessionAt,
        sessions: session.sessions,
      })),
      totalCount: chatSessions.total,
    });
  }

  if (chatMessages) {
    models.push({
      app: "Conversations",
      name: "chat_messages",
      verbose: "Chat message",
      verbosePlural: "Chat messages",
      columns: [
        { key: "user_id", label: "User ID", type: "uuid" },
        { key: "user_full_name", label: "Full name" },
        { key: "user_email", label: "Email" },
        { key: "session_count", label: "Sessions", type: "int" },
        { key: "message_count", label: "Messages", type: "int" },
        { key: "last_message_at", label: "Last message", type: "date" },
      ],
      rows: chatMessages.items.map((message) => ({
        id: message.userId,
        user_id: message.userId,
        user_full_name: message.userFullName,
        user_email: message.userEmail,
        session_count: message.sessionCount,
        message_count: message.messageCount,
        last_message_at: message.lastMessageAt,
        messages: message.messages,
      })),
      totalCount: chatMessages.total,
    });
  }

  if (revisionNotes) {
    models.push({
      app: "Revision",
      name: "revision_notes",
      verbose: "Revision note",
      verbosePlural: "Revision notes",
      columns: [
        { key: "id", label: "ID", type: "uuid" },
        { key: "user_id", label: "User ID", type: "uuid" },
        { key: "user_full_name", label: "Full name" },
        { key: "user_email", label: "Email" },
        { key: "session_id", label: "Session ID", type: "uuid" },
        { key: "session_title", label: "Session title" },
        { key: "subject_context", label: "Subject context" },
        { key: "message_id", label: "Message ID", type: "uuid" },
        { key: "message_role", label: "Message role" },
        { key: "message_preview", label: "Message preview" },
        { key: "title", label: "Title" },
        { key: "subject_tag", label: "Subject tag" },
        { key: "chapter_tag", label: "Chapter tag" },
        { key: "annotation", label: "Annotation" },
        { key: "colour_label", label: "Colour label" },
        { key: "created_at", label: "Created", type: "date" },
        { key: "updated_at", label: "Updated", type: "date" },
      ],
      rows: revisionNotes.items.map((note) => ({
        id: note.id,
        user_id: note.userId,
        user_full_name: note.userFullName,
        user_email: note.userEmail,
        session_id: note.sessionId,
        session_title: note.sessionTitle,
        subject_context: note.subjectContext,
        message_id: note.messageId,
        message_role: note.messageRole,
        message_preview: note.messagePreview,
        title: note.title,
        subject_tag: note.subjectTag,
        chapter_tag: note.chapterTag,
        annotation: note.annotation,
        colour_label: note.colourLabel,
        created_at: note.createdAt,
        updated_at: note.updatedAt,
      })),
      totalCount: revisionNotes.total,
    });
  }

  if (noteRevisionLogs) {
    models.push({
      app: "Revision",
      name: "note_revision_logs",
      verbose: "Note revision log",
      verbosePlural: "Note revision logs",
      columns: [
        { key: "id", label: "ID", type: "uuid" },
        { key: "note_id", label: "Note ID", type: "uuid" },
        { key: "user_id", label: "User ID", type: "uuid" },
        { key: "user_full_name", label: "Full name" },
        { key: "user_email", label: "Email" },
        { key: "note_title", label: "Note title" },
        { key: "subject_tag", label: "Subject tag" },
        { key: "chapter_tag", label: "Chapter tag" },
        { key: "session_id", label: "Session ID", type: "uuid" },
        { key: "session_title", label: "Session title" },
        { key: "message_id", label: "Message ID", type: "uuid" },
        { key: "message_preview", label: "Message preview" },
        { key: "action", label: "Action" },
        { key: "revised_at", label: "Revised", type: "date" },
      ],
      rows: noteRevisionLogs.items.map((entry) => ({
        id: entry.id,
        note_id: entry.noteId,
        user_id: entry.userId,
        user_full_name: entry.userFullName,
        user_email: entry.userEmail,
        note_title: entry.noteTitle,
        subject_tag: entry.subjectTag,
        chapter_tag: entry.chapterTag,
        session_id: entry.sessionId,
        session_title: entry.sessionTitle,
        message_id: entry.messageId,
        message_preview: entry.messagePreview,
        action: entry.action,
        revised_at: entry.revisedAt,
      })),
      totalCount: noteRevisionLogs.total,
    });
  }

  if (notebooks) {
    models.push({
      app: "Knowledge",
      name: "knowledge_notebooks",
      verbose: "Notebook",
      verbosePlural: "Notebooks",
      columns: [
        { key: "id", label: "ID", type: "uuid" },
        { key: "title", label: "Title" },
        { key: "board", label: "Board" },
        { key: "level", label: "Level" },
        { key: "faculty", label: "Faculty" },
        { key: "subject", label: "Subject" },
        { key: "curriculum", label: "Curriculum" },
        { key: "description", label: "Description" },
        { key: "resource_count", label: "Resources", type: "int" },
        { key: "ready_chunk_count", label: "Ready chunks", type: "int" },
        { key: "created_at", label: "Created", type: "date" },
      ],
      rows: notebooks.items.map((notebook) => ({
        id: notebook.id,
        title: notebook.title,
        board: notebook.board,
        level: notebook.level,
        faculty: notebook.faculty,
        subject: notebook.subject,
        curriculum: notebook.curriculum ?? "",
        description: notebook.description ?? "",
        resource_count: notebook.resourceCount,
        ready_chunk_count: notebook.readyChunkCount,
        created_at: notebook.createdAt,
      })),
      totalCount: notebooks.total,
    });
  }

  if (answers) {
    models.push({
      app: "AI Quality",
      name: "assistant_answers",
      verbose: "Answer",
      verbosePlural: "Answers",
      columns: [
        { key: "id", label: "ID", type: "uuid" },
        { key: "student_name", label: "Student" },
        { key: "student_email", label: "Email" },
        { key: "subject_context", label: "Context" },
        { key: "status", label: "Status" },
        { key: "feedback", label: "Feedback" },
        { key: "admin_review_note", label: "Admin note" },
        { key: "grounded", label: "Grounded", type: "bool" },
        { key: "citation_count", label: "Citations", type: "int" },
        { key: "created_at", label: "Created", type: "date" },
      ],
      rows: answers.items.map((answer) => ({
        id: answer.messageId,
        student_name: answer.studentName,
        student_email: answer.studentEmail,
        college: answer.college ?? "",
        board: answer.board ?? "",
        grade: answer.grade ?? "",
        subject_context: answer.subjectContext ?? "",
        session_id: answer.sessionId ?? "",
        session_title: answer.sessionTitle ?? "",
        answer_content: answer.answerContent ?? "",
        status: answer.status,
        review_state: answer.reviewedAt ? "reviewed" : "pending",
        feedback: answer.feedback ?? "",
        admin_review_note: answer.adminReviewNote ?? "",
        grounded: answer.grounded,
        citation_count: answer.citationCount,
        citations: answer.citations ?? [],
        created_at: answer.createdAt,
        reviewed_at: answer.reviewedAt ?? "",
        reviewed_by: answer.reviewedBy ?? "",
        user_id: answer.userId,
      })),
    });
  }

  if (knowledgeDocuments) {
    models.push({
      app: "Knowledge",
      name: "knowledge_documents",
      verbose: "Knowledge document",
      verbosePlural: "Knowledge documents",
      columns: [
        { key: "id", label: "ID", type: "uuid" },
        { key: "notebook_id", label: "Notebook ID", type: "uuid" },
        { key: "notebook_title", label: "Notebook" },
        { key: "board", label: "Board" },
        { key: "grade", label: "Grade" },
        { key: "faculty", label: "Faculty" },
        { key: "curriculum", label: "Curriculum" },
        { key: "subject", label: "Subject" },
        { key: "chapter", label: "Chapter" },
        { key: "resource_kind", label: "Resource kind" },
        { key: "resource_subtype", label: "Resource subtype" },
        { key: "title", label: "Title" },
        { key: "source_name", label: "Source name" },
        { key: "source_type", label: "Source type" },
        { key: "raw_content", label: "Raw content" },
        { key: "processing_status", label: "Status" },
        { key: "chunk_count", label: "Chunks", type: "int" },
        { key: "processing_error", label: "Processing error" },
        { key: "uploaded_at", label: "Uploaded", type: "date" },
      ],
      rows: knowledgeDocuments.items.map((document) => ({
        id: document.id,
        notebook_id: document.notebookId ?? "",
        notebook_title: document.notebookTitle ?? "",
        board: document.board,
        grade: document.grade,
        faculty: document.faculty,
        curriculum: document.curriculum,
        subject: document.subject,
        chapter: document.chapter ?? "",
        resource_kind: document.resourceKind,
        resource_subtype: document.resourceSubtype,
        title: document.title,
        source_name: document.sourceName,
        source_type: document.sourceType,
        raw_content: document.rawContent,
        processing_status: document.processingStatus,
        chunk_count: document.chunkCount,
        processing_error: document.processingError ?? "",
        uploaded_at: document.uploadedAt,
      })),
      totalCount: knowledgeDocuments.total,
    });
  }

  if (knowledgeChunks) {
    models.push({
      app: "Knowledge",
      name: "knowledge_chunks",
      verbose: "Knowledge chunk",
      verbosePlural: "Knowledge chunks",
      columns: [
        { key: "id", label: "ID", type: "uuid" },
        { key: "document_id", label: "Document ID", type: "uuid" },
        { key: "board", label: "Board" },
        { key: "grade", label: "Grade" },
        { key: "subject", label: "Subject" },
        { key: "chapter", label: "Chapter" },
        { key: "topic", label: "Topic" },
        { key: "chunk_count", label: "Chunk count", type: "int" },
        { key: "content", label: "Content" },
      ],
      rows: knowledgeChunks.items.map((chunk) => ({
        id: chunk.id,
        document_id: chunk.documentId,
        board: chunk.board,
        grade: chunk.grade,
        subject: chunk.subject,
        chapter: chunk.chapter ?? "",
        topic: chunk.topic ?? "",
        chunk_count: chunk.chunkCount,
        content: chunk.content,
      })),
      totalCount: knowledgeChunks.total,
    });
  }

  if (payments) {
    models.push({
      app: "Billing",
      name: "payment_submissions",
      verbose: "Payment submission",
      verbosePlural: "Payment submissions",
      columns: [
        { key: "id", label: "ID", type: "uuid" },
        { key: "invoice_id", label: "Invoice ID", type: "uuid" },
        { key: "user_id", label: "User ID", type: "uuid" },
        { key: "reference", label: "Reference" },
        { key: "proof_meta", label: "Proof meta", type: "json" },
        { key: "status", label: "Status" },
        { key: "submitted_at", label: "Submitted", type: "date" },
        { key: "reviewed_at", label: "Reviewed", type: "date" },
        { key: "reviewed_by", label: "Reviewed by", type: "uuid" },
        { key: "updated_at", label: "Updated", type: "date" },
      ],
      rows: payments.submissions.map((submission) => ({
        id: submission.id,
        invoice_id: submission.invoiceId,
        user_id: submission.userId,
        reference: submission.reference,
        proof_meta: submission.proofMeta,
        status: submission.status,
        submitted_at: submission.submittedAt,
        reviewed_at: submission.reviewedAt ?? "",
        reviewed_by: submission.reviewedBy ?? "",
        updated_at: submission.updatedAt,
      })),
      totalCount: payments.submissions.length,
    });
  }

  if (invoices) {
    models.push({
      app: "Billing",
      name: "invoices",
      verbose: "Invoice",
      verbosePlural: "Invoices",
      columns: [
        { key: "id", label: "ID", type: "uuid" },
        { key: "user_id", label: "User ID", type: "uuid" },
        { key: "plan_id", label: "Plan ID", type: "uuid" },
        { key: "status", label: "Status" },
        { key: "amount", label: "Amount", type: "int" },
        { key: "currency", label: "Currency" },
        { key: "payment_method", label: "Payment method" },
        { key: "created_at", label: "Created", type: "date" },
        { key: "updated_at", label: "Updated", type: "date" },
      ],
      rows: invoices.invoices.map((invoice) => ({
        id: invoice.id,
        user_id: invoice.userId,
        plan_id: invoice.planId,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        payment_method: invoice.paymentMethod,
        created_at: invoice.createdAt,
        updated_at: invoice.updatedAt,
      })),
      totalCount: invoices.invoices.length,
    });
  }

  if (prompts) {
    models.push({
      app: "AI Runtime",
      name: "prompt_templates",
      verbose: "Prompt template",
      verbosePlural: "Prompt templates",
      columns: [
        { key: "id", label: "ID", type: "uuid" },
        { key: "name", label: "Name" },
        { key: "slug", label: "Slug" },
        { key: "purpose", label: "Purpose" },
        { key: "language", label: "Language" },
        { key: "description", label: "Description" },
        { key: "content", label: "Content" },
        { key: "is_active", label: "Active", type: "bool" },
        { key: "updated_at", label: "Updated", type: "date" },
      ],
      rows: prompts.prompts.map((prompt) => ({
        id: prompt.id,
        name: prompt.name,
        slug: prompt.slug,
        purpose: prompt.purpose,
        language: prompt.language,
        description: prompt.description ?? "",
        content: prompt.content ?? "",
        is_active: prompt.isActive,
        created_at: prompt.createdAt ?? "",
        updated_by: prompt.updatedBy ?? "",
        updated_at: prompt.updatedAt,
      })),
    });
  }

  if (plans) {
    models.push({
      app: "Billing",
      name: "subscription_plans",
      verbose: "Subscription plan",
      verbosePlural: "Subscription plans",
      columns: [
        { key: "id", label: "ID", type: "uuid" },
        { key: "name", label: "Name" },
        { key: "slug", label: "Slug" },
        { key: "credits", label: "Credits", type: "int" },
        { key: "price", label: "Price", type: "int" },
        { key: "currency", label: "Currency" },
        { key: "billing_type", label: "Billing" },
        { key: "is_active", label: "Active", type: "bool" },
      ],
      rows: plans.plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        credits: plan.credits,
        price: plan.price,
        currency: plan.currency,
        billing_type: plan.billingType,
        is_active: plan.isActive,
      })),
      totalCount: plans.plans.length,
    });
  }

  if (subscriptions) {
    models.push({
      app: "Billing",
      name: "user_subscriptions",
      verbose: "User subscription",
      verbosePlural: "User subscriptions",
      columns: [
        { key: "id", label: "ID", type: "uuid" },
        { key: "user_id", label: "User ID", type: "uuid" },
        { key: "plan_id", label: "Plan ID", type: "uuid" },
        { key: "invoice_id", label: "Invoice ID", type: "uuid" },
        { key: "status", label: "Status" },
        { key: "starts_at", label: "Starts", type: "date" },
        { key: "ends_at", label: "Ends", type: "date" },
        { key: "created_at", label: "Created", type: "date" },
      ],
      rows: subscriptions.subscriptions.map((subscription) => ({
        id: subscription.id,
        user_id: subscription.userId,
        plan_id: subscription.planId,
        invoice_id: subscription.invoiceId ?? "",
        status: subscription.status,
        starts_at: subscription.startsAt,
        ends_at: subscription.endsAt,
        created_at: subscription.createdAt,
      })),
      totalCount: subscriptions.subscriptions.length,
    });
  }

  if (creditsLedger) {
    models.push({
      app: "Billing",
      name: "credits_ledger",
      verbose: "Credits ledger entry",
      verbosePlural: "Credits ledger",
      columns: [
        { key: "user_id", label: "User ID", type: "uuid" },
        { key: "full_name", label: "Full name" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role" },
        { key: "current_balance", label: "Current balance", type: "int" },
        { key: "ledger_count", label: "Ledger entries", type: "int" },
        { key: "last_entry_at", label: "Last entry", type: "date" },
      ],
      rows: creditsLedger.entries.map((entry) => ({
        user_id: entry.userId,
        id: entry.userId,
        full_name: entry.fullName,
        email: entry.email,
        role: entry.role,
        current_balance: entry.currentBalance,
        ledger_count: entry.ledgerCount,
        last_entry_at: entry.lastEntryAt,
        ledger_entries: entry.entries,
      })),
      totalCount: creditsLedger.entries.length,
    });
  }

  return { models, warnings };
}
