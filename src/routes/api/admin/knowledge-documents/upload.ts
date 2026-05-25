import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  createAdminKnowledgeDocument,
  deleteAdminKnowledgeDocument,
  getAdminKnowledgeDocument,
  processAdminKnowledgeDocument,
  updateAdminKnowledgeDocument,
} from "@/lib/server/admin-data";
import { extractKnowledgeFileContent } from "@/lib/server/knowledge-upload";
import {
  removeKnowledgeSourceFile,
  uploadKnowledgeSourceFile,
} from "@/lib/server/knowledge-storage";
import { withAdmin } from "@/lib/server/admin-route";

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

export const Route = createFileRoute("/api/admin/knowledge-documents/upload")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        withAdmin(request, async () => {
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
        }),
    },
  },
});
