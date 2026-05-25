# Admin Delight Integration Runbook

## 1) Schema and migrations: do we need new SQL?

Short answer:
- If `admin-delight` and `padhai` use the **same Supabase project**, you **do not** need new base migrations.
- If you create a **new Supabase project**, you must apply the same migration history first.

Current migration source of truth already exists in:
- `/Users/sumangiri/Desktop/padhai/supabase/migrations`

Key migrations that power admin features include:
- `20260420213000_phase3_billing_and_admin.sql`
- `20260518003000_admin_knowledge_and_prompts.sql`
- `20260518121500_admin_answer_review.sql`
- `20260518132500_knowledge_document_source_storage.sql`
- `20260519003000_admin_notebooks_and_resources.sql`
- `20260522013000_admin_query_performance_indexes.sql`

## 2) Environment variables needed in admin-delight

Required in `admin-delight/.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

These are already copied from `padhai/.env.local` on this machine.

## 3) What is implemented now

Admin Delight now has its own server-side admin API routes:
- `GET /api/admin/users`
- `PATCH /api/admin/users/:userId`
- `POST /api/admin/users/:userId/credits`
- `POST /api/admin/users/actions`
- `GET /api/admin/notebooks`
- `POST /api/admin/notebooks`
- `PATCH /api/admin/notebooks/:notebookId`
- `DELETE /api/admin/notebooks/:notebookId`
- `GET /api/admin/answers`
- `PATCH /api/admin/answers/:messageId`
- `POST /api/admin/answers/actions`
- `GET /api/admin/payments`
- `PATCH /api/admin/payments/:submissionId`
- `GET /api/admin/prompt-templates`
- `POST /api/admin/prompt-templates`
- `PATCH /api/admin/prompt-templates/:promptId`
- `DELETE /api/admin/prompt-templates/:promptId`
- `GET /api/admin/subscriptions/plans`
- `POST /api/admin/subscriptions/plans`
- `PATCH /api/admin/subscriptions/plans/:planId`
- `GET /api/admin/subscriptions/user-subscriptions`
- `POST /api/admin/subscriptions/user-subscriptions`
- `PATCH /api/admin/subscriptions/user-subscriptions/:subscriptionId`
- `DELETE /api/admin/subscriptions/user-subscriptions/:subscriptionId`

Auth/session routes implemented inside Admin Delight:
- `POST /api/admin/session` (login)
- `GET /api/admin/session` (session check)
- `DELETE /api/admin/session` (logout)

Security guard:
- every admin route verifies session and `student_profiles.role = 'admin'`

## 4) Current gap (important)

The main generic Admin Delight editor is now wired for live `Save/Add/Delete` and bulk actions on current mapped models.

Remaining known limits:
- Not every advanced workflow from old padhai admin is replicated (example: document upload/process screens, payment detail page, prompt preview UX).
- Some model actions are intentionally constrained in the generic table editor:
  - payment submissions support `approve/reject` via status action
  - user subscriptions support grant + cancel from generic editor (not full lifecycle variants)
  - assistant answer editor focuses on review status/note

## 5) End-to-end production target (next step)

To make admin fully independent and operational:
1. Add dedicated UI screens for non-generic flows:
   - knowledge documents upload/process/source preview
   - payment detail moderation
   - richer prompt testing/editor
2. Add activity/audit logs and stronger toast UX.
3. Add smoke tests for critical admin actions.

## 6) Run locally

```bash
cd /Users/sumangiri/Desktop/admin-delight
npm install
npm run dev -- --port 3001
```

Then open:
- `http://localhost:3001/login`
- sign in with an admin account
