import { z } from "zod";
import {
  adjustAdminUserCredits,
  bulkProcessAdminKnowledgeDocuments,
  bulkUpdateAdminAnswerReview,
  bulkUpdateAdminUserRoles,
  cancelAdminSubscription,
  createAdminKnowledgeDocument,
  createAdminKnowledgeNotebook,
  createAdminSubscriptionPlan,
  createPromptTemplate,
  deleteAdminKnowledgeDocument,
  deleteAdminKnowledgeNotebook,
  deletePromptTemplate,
  getAdminKnowledgeDocument,
  getAdminKnowledgeNotebook,
  getAdminKnowledgeSourceSignedUrl,
  grantAdminSubscription,
  listAdminAnswers,
  listAdminAuthUsers,
  listAdminChatMessages,
  listAdminChatSessions,
  listAdminCreditsLedger,
  listAdminInvoices,
  listAdminKnowledgeChunks,
  listAdminKnowledgeDocuments,
  listAdminKnowledgeNotebooks,
  listAdminNoteRevisionLogs,
  listAdminPaymentSubmissions,
  listAdminRevisionNotes,
  listAdminStudentProfiles,
  listAdminSubscriptionPlans,
  listAdminSubscriptions,
  listAdminUsers,
  listPromptTemplates,
  processAdminKnowledgeDocument,
  updateAdminAnswerReview,
  updateAdminKnowledgeDocument,
  updateAdminKnowledgeNotebook,
  updateAdminStudentProfile,
  updateAdminSubscriptionPlan,
  updateAdminUserRole,
  updatePaymentSubmissionStatus,
  updatePromptTemplate,
} from "@/lib/server/admin-data";
import { withAdmin } from "@/lib/server/admin-route";
import { extractKnowledgeFileContent } from "@/lib/server/knowledge-upload";
import {
  removeKnowledgeSourceFile,
  uploadKnowledgeSourceFile,
} from "@/lib/server/knowledge-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string[] }>;
};

const uploadSchema = z.object({
  documentId: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" ? value.trim() : undefined))
    .optional(),
  notebookId: z.string().trim().min(1),
  board: z.string().trim().min(1),
  grade: z.string().trim().min(1),
  faculty: z.string().trim().default(""),
  curriculum: z.string().trim().default(""),
  subject: z.string().trim().min(1),
  chapter: z.string().trim().nullable().optional(),
  title: z.string().trim().default(""),
  sourceName: z.string().trim().default(""),
  resourceKind: z.enum(["syllabus", "study_material", "question_bank"]),
  resourceSubtype: z.enum([
    "micro_syllabus",
    "curriculum",
    "syllabus",
    "learning_outcomes",
    "textbook",
    "notes",
    "solutions",
    "guides",
    "question_bank",
    "past_questions",
    "example_questions",
    "other",
  ]),
  autoProcess: z.enum(["true", "false"]).default("false"),
});

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return parsed;
}

async function handleAdminRoute(request: Request, slug: string[]) {
  const path = slug.join("/");

  return withAdmin(request, async (access) => {
    if (request.method === "GET" && path === "auth-users") {
      const result = await listAdminAuthUsers(request.url);
      return Response.json(result);
    }

    if (request.method === "GET" && path === "student-profiles") {
      const result = await listAdminStudentProfiles(request.url);
      return Response.json(result);
    }

    if (request.method === "PATCH" && slug[0] === "student-profiles" && slug[1]) {
      const payload = (await request.json()) as {
        fullName: string;
        college: string;
        board: string;
        grade: string;
        boardScore?: string;
        subjects?: string[];
        targetGrade?: string;
        languagePref: "EN" | "RN";
        role: "student" | "admin";
      };
      await updateAdminStudentProfile({
        userId: slug[1],
        fullName: payload.fullName,
        college: payload.college,
        board: payload.board,
        grade: payload.grade,
        boardScore: payload.boardScore,
        subjects: payload.subjects,
        targetGrade: payload.targetGrade,
        languagePref: payload.languagePref,
        role: payload.role,
      });
      return Response.json({ ok: true });
    }

    if (request.method === "GET" && path === "users") {
      const result = await listAdminUsers(request.url);
      return Response.json(result);
    }

    if (request.method === "POST" && path === "users/actions") {
      const payload = (await request.json()) as {
        action: "set_role";
        role: "student" | "admin";
        userIds: string[];
      };
      if (payload.action !== "set_role") {
        return Response.json({ error: "Unsupported action." }, { status: 400 });
      }
      const result = await bulkUpdateAdminUserRoles(payload.userIds, payload.role);
      return Response.json(result);
    }

    if (request.method === "PATCH" && slug[0] === "users" && slug[1] && slug.length === 2) {
      const payload = (await request.json()) as { role: "student" | "admin" };
      await updateAdminUserRole(slug[1], payload.role);
      return Response.json({ ok: true });
    }

    if (
      request.method === "POST" &&
      slug[0] === "users" &&
      slug[1] &&
      slug[2] === "credits"
    ) {
      const payload = (await request.json()) as { amount: number; description?: string };
      if (!Number.isFinite(payload.amount) || payload.amount === 0) {
        return Response.json({ error: "amount must be a non-zero number." }, { status: 400 });
      }
      await adjustAdminUserCredits({
        userId: slug[1],
        amount: Math.trunc(payload.amount),
        description: payload.description ?? "Manual admin adjustment",
        adminUserId: access.userId,
      });
      return Response.json({ ok: true });
    }

    if (request.method === "GET" && path === "chat-sessions") {
      const result = await listAdminChatSessions(request.url);
      return Response.json(result);
    }

    if (request.method === "GET" && path === "chat-messages") {
      const result = await listAdminChatMessages(request.url);
      return Response.json(result);
    }

    if (request.method === "GET" && path === "revision-notes") {
      const result = await listAdminRevisionNotes(request.url);
      return Response.json(result);
    }

    if (request.method === "GET" && path === "note-revision-logs") {
      const result = await listAdminNoteRevisionLogs(request.url);
      return Response.json(result);
    }

    if (request.method === "GET" && path === "notebooks") {
      const result = await listAdminKnowledgeNotebooks(request.url);
      return Response.json(result);
    }

    if (request.method === "POST" && path === "notebooks") {
      const payload = (await request.json()) as {
        title: string;
        board: string;
        level: string;
        faculty: string;
        subject: string;
        curriculum?: string;
        description?: string;
      };
      const notebook = await createAdminKnowledgeNotebook(payload);
      return Response.json({ notebook }, { status: 201 });
    }

    if (slug[0] === "notebooks" && slug[1]) {
      const notebookId = slug[1];

      if (request.method === "GET") {
        const { searchParams } = new URL(request.url);
        const notebook = await getAdminKnowledgeNotebook(notebookId, {
          resourceQ: searchParams.get("resourceQ") ?? undefined,
          resourcePage: parsePositiveInt(searchParams.get("resourcePage")),
          resourcePageSize: parsePositiveInt(searchParams.get("resourcePageSize")),
          selectedResourceId: searchParams.get("selectedResourceId") ?? undefined,
        });

        if (!notebook) {
          return Response.json({ error: "Notebook not found." }, { status: 404 });
        }

        return Response.json({ notebook });
      }

      if (request.method === "PATCH") {
        const payload = (await request.json()) as {
          title: string;
          board: string;
          level: string;
          faculty: string;
          subject: string;
          curriculum?: string;
          description?: string;
        };
        const notebook = await updateAdminKnowledgeNotebook(notebookId, payload);
        return Response.json({ notebook });
      }

      if (request.method === "DELETE") {
        await deleteAdminKnowledgeNotebook(notebookId);
        return Response.json({ ok: true });
      }
    }

    if (request.method === "GET" && path === "knowledge-documents") {
      const result = await listAdminKnowledgeDocuments(request.url);
      return Response.json(result);
    }

    if (request.method === "POST" && path === "knowledge-documents") {
      const payload = (await request.json()) as {
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
      };
      const document = await createAdminKnowledgeDocument(payload);
      return Response.json({ document }, { status: 201 });
    }

    if (request.method === "POST" && path === "knowledge-documents/actions") {
      const payload = (await request.json()) as {
        action: "process";
        documentIds: string[];
      };
      if (payload.action !== "process") {
        return Response.json({ error: "Unsupported action." }, { status: 400 });
      }
      const result = await bulkProcessAdminKnowledgeDocuments(payload.documentIds);
      return Response.json(result);
    }

    if (request.method === "POST" && path === "knowledge-documents/upload") {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return Response.json({ error: "Choose a file to upload." }, { status: 400 });
      }

      const parsed = uploadSchema.parse({
        documentId: formData.get("documentId"),
        notebookId: formData.get("notebookId"),
        board: formData.get("board"),
        grade: formData.get("grade"),
        faculty: formData.get("faculty"),
        curriculum: formData.get("curriculum"),
        subject: formData.get("subject"),
        chapter: formData.get("chapter"),
        title: formData.get("title"),
        sourceName: formData.get("sourceName"),
        resourceKind: formData.get("resourceKind"),
        resourceSubtype: formData.get("resourceSubtype"),
        autoProcess: formData.get("autoProcess") ?? "false",
      });

      const extracted = await extractKnowledgeFileContent(file);
      const baseInput = {
        notebookId: parsed.notebookId,
        board: parsed.board,
        grade: parsed.grade,
        faculty: parsed.faculty,
        curriculum: parsed.curriculum,
        subject: parsed.subject,
        chapter: parsed.chapter?.trim() || null,
        resourceKind: parsed.resourceKind,
        resourceSubtype: parsed.resourceSubtype,
        title: parsed.title || extracted.suggestedTitle,
        sourceName: parsed.sourceName || extracted.sourceName,
        sourceType: extracted.sourceType,
        rawContent: extracted.rawContent,
      };

      const isExistingDocument = Boolean(parsed.documentId && parsed.documentId !== "new");
      const previousDocument = isExistingDocument
        ? await getAdminKnowledgeDocument(parsed.documentId!)
        : null;

      let document = isExistingDocument
        ? await updateAdminKnowledgeDocument(parsed.documentId!, {
            ...baseInput,
            storageBucket: previousDocument?.storage_bucket ?? null,
            storagePath: previousDocument?.storage_path ?? null,
            sourceMimeType: previousDocument?.source_mime_type ?? null,
            sourceSizeBytes: previousDocument?.source_size_bytes ?? null,
          })
        : await createAdminKnowledgeDocument(baseInput);

      if (!document) {
        throw new Error("Failed to save uploaded document.");
      }

      const savedDocumentId = String(document.id);
      try {
        const storedFile = await uploadKnowledgeSourceFile(savedDocumentId, file);
        document = await updateAdminKnowledgeDocument(savedDocumentId, {
          ...baseInput,
          storageBucket: storedFile.storageBucket,
          storagePath: storedFile.storagePath,
          sourceMimeType: storedFile.sourceMimeType,
          sourceSizeBytes: storedFile.sourceSizeBytes,
        });

        if (
          previousDocument?.storage_path &&
          previousDocument.storage_path !== storedFile.storagePath
        ) {
          await removeKnowledgeSourceFile(previousDocument.storage_path);
        }
      } catch (storageError) {
        if (!isExistingDocument) {
          await deleteAdminKnowledgeDocument(savedDocumentId);
        }
        throw storageError;
      }

      if (parsed.autoProcess === "true") {
        await processAdminKnowledgeDocument(savedDocumentId);
        document = await getAdminKnowledgeDocument(savedDocumentId);
      } else {
        document = await getAdminKnowledgeDocument(savedDocumentId);
      }

      return Response.json(
        {
          document,
          extracted: {
            sourceName: extracted.sourceName,
            sourceType: extracted.sourceType,
            suggestedTitle: extracted.suggestedTitle,
            characterCount: extracted.rawContent.length,
          },
        },
        { status: isExistingDocument ? 200 : 201 },
      );
    }

    if (slug[0] === "knowledge-documents" && slug[1]) {
      const documentId = slug[1];

      if (request.method === "PATCH" && slug.length === 2) {
        const payload = (await request.json()) as {
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
        };
        const document = await updateAdminKnowledgeDocument(documentId, payload);
        return Response.json({ document });
      }

      if (request.method === "DELETE" && slug.length === 2) {
        await deleteAdminKnowledgeDocument(documentId);
        return Response.json({ ok: true });
      }

      if (request.method === "POST" && slug[2] === "process") {
        await processAdminKnowledgeDocument(documentId);
        const document = await getAdminKnowledgeDocument(documentId);
        return Response.json({
          ok: true,
          document: document
            ? {
                id: document.id,
                chunkCount: Number(document.chunk_count ?? 0),
                processingStatus: document.processing_status ?? "draft",
              }
            : null,
        });
      }

      if (request.method === "GET" && slug[2] === "source") {
        const url = new URL(request.url);
        const signedUrl = await getAdminKnowledgeSourceSignedUrl(documentId, {
          download: url.searchParams.get("download") === "1",
        });
        if (!signedUrl) {
          return Response.json({ error: "Original source file not found." }, { status: 404 });
        }
        return Response.redirect(signedUrl);
      }
    }

    if (request.method === "GET" && path === "knowledge-chunks") {
      const result = await listAdminKnowledgeChunks(request.url);
      return Response.json(result);
    }

    if (request.method === "GET" && path === "answers") {
      const result = await listAdminAnswers(request.url);
      return Response.json(result);
    }

    if (request.method === "POST" && path === "answers/actions") {
      const payload = (await request.json()) as {
        action: "reviewed" | "unreviewed";
        messageIds: string[];
        adminReviewNote?: string | null;
      };
      const reviewed = payload.action === "reviewed";
      const result = await bulkUpdateAdminAnswerReview(payload.messageIds, {
        adminUserId: access.userId,
        reviewed,
        adminReviewNote: payload.adminReviewNote,
      });
      return Response.json(result);
    }

    if (request.method === "PATCH" && slug[0] === "answers" && slug[1]) {
      const payload = (await request.json()) as {
        reviewed?: boolean;
        adminReviewNote?: string | null;
      };
      await updateAdminAnswerReview(slug[1], {
        adminUserId: access.userId,
        reviewed: payload.reviewed,
        adminReviewNote: payload.adminReviewNote,
      });
      return Response.json({ ok: true });
    }

    if (request.method === "GET" && path === "payments") {
      const submissions = await listAdminPaymentSubmissions();
      return Response.json({ submissions });
    }

    if (request.method === "PATCH" && slug[0] === "payments" && slug[1]) {
      const payload = (await request.json()) as { action: "approve" | "reject" };
      if (payload.action !== "approve" && payload.action !== "reject") {
        return Response.json({ error: "Unsupported action." }, { status: 400 });
      }
      await updatePaymentSubmissionStatus(slug[1], payload.action);
      return Response.json({ ok: true });
    }

    if (request.method === "GET" && path === "credits-ledger") {
      const entries = await listAdminCreditsLedger();
      return Response.json({ entries });
    }

    if (request.method === "POST" && path === "credits-ledger") {
      const payload = (await request.json()) as {
        userId: string;
        amount: number;
        description?: string;
      };
      if (!payload.userId?.trim()) {
        return Response.json({ error: "userId is required." }, { status: 400 });
      }
      if (!Number.isFinite(payload.amount) || payload.amount === 0) {
        return Response.json({ error: "amount must be a non-zero number." }, { status: 400 });
      }
      await adjustAdminUserCredits({
        userId: payload.userId.trim(),
        amount: Math.trunc(payload.amount),
        description: payload.description ?? "Manual admin adjustment",
        adminUserId: access.userId,
      });
      return Response.json({ ok: true }, { status: 201 });
    }

    if (request.method === "GET" && path === "invoices") {
      const invoices = await listAdminInvoices();
      return Response.json({ invoices });
    }

    if (request.method === "GET" && path === "prompt-templates") {
      const prompts = await listPromptTemplates(request.url);
      return Response.json({ prompts });
    }

    if (request.method === "POST" && path === "prompt-templates") {
      const payload = (await request.json()) as {
        name: string;
        slug?: string;
        purpose: "system" | "followup" | "rewrite";
        language: "EN" | "RN";
        description?: string;
        content: string;
        isActive?: boolean;
      };
      const prompt = await createPromptTemplate(payload, access.userId);
      return Response.json({ prompt }, { status: 201 });
    }

    if (slug[0] === "prompt-templates" && slug[1]) {
      if (request.method === "PATCH") {
        const payload = (await request.json()) as {
          name: string;
          slug?: string;
          purpose: "system" | "followup" | "rewrite";
          language: "EN" | "RN";
          description?: string;
          content: string;
          isActive?: boolean;
        };
        const prompt = await updatePromptTemplate(slug[1], payload, access.userId);
        return Response.json({ prompt });
      }
      if (request.method === "DELETE") {
        await deletePromptTemplate(slug[1]);
        return Response.json({ ok: true });
      }
    }

    if (request.method === "GET" && path === "subscriptions/plans") {
      const plans = await listAdminSubscriptionPlans();
      return Response.json({ plans });
    }

    if (request.method === "POST" && path === "subscriptions/plans") {
      const payload = (await request.json()) as {
        name: string;
        slug?: string;
        credits: number;
        price: number;
        currency?: string;
        billingType: "monthly" | "one_time";
        isActive?: boolean;
      };
      const plan = await createAdminSubscriptionPlan(payload);
      return Response.json({ plan }, { status: 201 });
    }

    if (request.method === "PATCH" && slug[0] === "subscriptions" && slug[1] === "plans" && slug[2]) {
      const payload = (await request.json()) as {
        name: string;
        slug?: string;
        credits: number;
        price: number;
        currency?: string;
        billingType: "monthly" | "one_time";
        isActive?: boolean;
      };
      const plan = await updateAdminSubscriptionPlan(slug[2], payload);
      return Response.json({ plan });
    }

    if (request.method === "GET" && path === "subscriptions/user-subscriptions") {
      const subscriptions = await listAdminSubscriptions();
      return Response.json({ subscriptions });
    }

    if (request.method === "POST" && path === "subscriptions/user-subscriptions") {
      const payload = (await request.json()) as {
        userId: string;
        planId: string;
        startsAt?: string | null;
        endsAt?: string | null;
      };
      const subscriptionId = await grantAdminSubscription(payload);
      return Response.json({ subscriptionId }, { status: 201 });
    }

    if (
      slug[0] === "subscriptions" &&
      slug[1] === "user-subscriptions" &&
      slug[2]
    ) {
      if (request.method === "PATCH") {
        const payload = (await request.json()) as { action: "cancel" };
        if (payload.action !== "cancel") {
          return Response.json({ error: "Unsupported action." }, { status: 400 });
        }
        await cancelAdminSubscription(slug[2]);
        return Response.json({ ok: true });
      }

      if (request.method === "DELETE") {
        await cancelAdminSubscription(slug[2]);
        return Response.json({ ok: true });
      }
    }

    return Response.json({ error: `Unsupported admin route: /api/admin/${path}` }, { status: 404 });
  });
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handleAdminRoute(request, slug);
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handleAdminRoute(request, slug);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handleAdminRoute(request, slug);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handleAdminRoute(request, slug);
}
