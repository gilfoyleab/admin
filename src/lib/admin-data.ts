// Mock data + schema for Django-style admin panel

export type Column = { key: string; label: string; type?: "text" | "uuid" | "fk" | "bool" | "date" | "int" | "json" | "array" };
export type Model = {
  app: string;
  name: string;
  verbose: string;
  verbosePlural: string;
  columns: Column[];
  rows: Record<string, any>[];
};

const uuid = (s: string) => `${s.padStart(8, "0")}-1234-4abc-9def-000000000001`;
const dt = (d: string) => d;

const userIds = Array.from({ length: 10 }, (_, i) => uuid(`u${i + 1}`));
const planIds = Array.from({ length: 10 }, (_, i) => uuid(`p${i + 1}`));
const invoiceIds = Array.from({ length: 10 }, (_, i) => uuid(`i${i + 1}`));
const notebookIds = Array.from({ length: 10 }, (_, i) => uuid(`n${i + 1}`));
const documentIds = Array.from({ length: 10 }, (_, i) => uuid(`d${i + 1}`));
const sessionIds = Array.from({ length: 10 }, (_, i) => uuid(`s${i + 1}`));
const messageIds = Array.from({ length: 10 }, (_, i) => uuid(`m${i + 1}`));
const noteIds = Array.from({ length: 10 }, (_, i) => uuid(`r${i + 1}`));

const emails = ["aarav.sharma","priya.patel","rohan.gupta","ananya.singh","vikram.iyer","meera.nair","arjun.reddy","kavya.menon","dev.kapoor","isha.joshi"];
const subjects = ["Mathematics","Physics","Chemistry","Biology","English","History","Geography","Computer Science","Economics","Civics"];
const boards = ["CBSE","ICSE","State Board","IB","Cambridge","CBSE","ICSE","State Board","IB","Cambridge"];
const grades = ["8","9","10","11","12","9","10","11","12","10"];

export const models: Model[] = [
  {
    app: "Authentication",
    name: "auth_users",
    verbose: "User",
    verbosePlural: "Users",
    columns: [
      { key: "id", label: "ID", type: "uuid" },
      { key: "email", label: "Email" },
      { key: "created_at", label: "Created", type: "date" },
    ],
    rows: userIds.map((id, i) => ({
      id,
      email: `${emails[i]}@nano.edu`,
      created_at: dt(`2025-0${(i % 9) + 1}-12 09:${10 + i}:00`),
    })),
  },
  {
    app: "Authentication",
    name: "student_profiles",
    verbose: "Student profile",
    verbosePlural: "Student profiles",
    columns: [
      { key: "id", label: "ID", type: "uuid" },
      { key: "user_id", label: "User", type: "fk" },
      { key: "role", label: "Role" },
    ],
    rows: userIds.map((uid, i) => ({
      id: uuid(`sp${i + 1}`),
      user_id: uid,
      role: i % 4 === 0 ? "admin" : i % 3 === 0 ? "teacher" : "student",
    })),
  },
  {
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
    rows: planIds.map((id, i) => ({
      id,
      name: ["Starter","Basic","Plus","Pro","Scholar","Elite","Campus","Institute","Tutor","Lifetime"][i],
      slug: ["starter","basic","plus","pro","scholar","elite","campus","institute","tutor","lifetime"][i],
      credits: [100,300,800,2000,5000,10000,25000,60000,1500,99999][i],
      price: [99,299,599,999,1999,3499,7999,14999,899,24999][i],
      currency: "INR",
      billing_type: i === 9 ? "one_time" : i % 2 ? "yearly" : "monthly",
      is_active: i !== 0,
      created_at: dt(`2025-01-${10 + i} 10:00:00`),
      updated_at: dt(`2025-05-${10 + i} 10:00:00`),
    })),
  },
  {
    app: "Billing",
    name: "invoices",
    verbose: "Invoice",
    verbosePlural: "Invoices",
    columns: [
      { key: "id", label: "ID", type: "uuid" },
      { key: "user_id", label: "User", type: "fk" },
      { key: "plan_id", label: "Plan", type: "fk" },
      { key: "status", label: "Status" },
      { key: "amount", label: "Amount", type: "int" },
      { key: "currency", label: "Currency" },
      { key: "payment_method", label: "Method" },
    ],
    rows: invoiceIds.map((id, i) => ({
      id,
      user_id: userIds[i],
      plan_id: planIds[i],
      status: ["paid","paid","pending","paid","failed","paid","refunded","pending","paid","paid"][i],
      amount: [299,599,999,1999,99,3499,7999,299,599,24999][i],
      currency: "INR",
      payment_method: ["upi","card","upi","netbanking","card","upi","card","upi","netbanking","card"][i],
      created_at: dt(`2025-05-${10 + i} 11:00:00`),
    })),
  },
  {
    app: "Billing",
    name: "payment_submissions",
    verbose: "Payment submission",
    verbosePlural: "Payment submissions",
    columns: [
      { key: "id", label: "ID", type: "uuid" },
      { key: "invoice_id", label: "Invoice", type: "fk" },
      { key: "user_id", label: "User", type: "fk" },
      { key: "reference", label: "Reference" },
      { key: "status", label: "Status" },
      { key: "submitted_at", label: "Submitted", type: "date" },
    ],
    rows: invoiceIds.map((iid, i) => ({
      id: uuid(`ps${i + 1}`),
      invoice_id: iid,
      user_id: userIds[i],
      reviewed_by: i % 3 === 0 ? userIds[0] : null,
      reference: `TXN-${100000 + i * 137}`,
      status: ["approved","approved","pending","approved","rejected","approved","approved","pending","approved","approved"][i],
      submitted_at: dt(`2025-05-${10 + i} 11:15:00`),
    })),
  },
  {
    app: "Billing",
    name: "user_subscriptions",
    verbose: "User subscription",
    verbosePlural: "User subscriptions",
    columns: [
      { key: "id", label: "ID", type: "uuid" },
      { key: "user_id", label: "User", type: "fk" },
      { key: "plan_id", label: "Plan", type: "fk" },
      { key: "status", label: "Status" },
      { key: "starts_at", label: "Starts", type: "date" },
      { key: "ends_at", label: "Ends", type: "date" },
    ],
    rows: userIds.map((uid, i) => ({
      id: uuid(`us${i + 1}`),
      user_id: uid,
      plan_id: planIds[i],
      invoice_id: invoiceIds[i],
      status: ["active","active","trialing","active","cancelled","active","active","past_due","active","active"][i],
      starts_at: dt(`2025-05-${10 + i}`),
      ends_at: dt(`2026-05-${10 + i}`),
    })),
  },
  {
    app: "Billing",
    name: "credits_ledger",
    verbose: "Credit entry",
    verbosePlural: "Credits ledger",
    columns: [
      { key: "id", label: "ID", type: "uuid" },
      { key: "user_id", label: "User", type: "fk" },
      { key: "type", label: "Type" },
      { key: "amount", label: "Amount", type: "int" },
      { key: "balance_after", label: "Balance", type: "int" },
      { key: "description", label: "Description" },
    ],
    rows: Array.from({ length: 10 }, (_, i) => ({
      id: uuid(`cl${i + 1}`),
      user_id: userIds[i],
      type: i % 3 === 0 ? "debit" : "credit",
      amount: [100,-25,300,-50,500,-10,800,-100,1500,-200][i],
      balance_after: [100,75,375,325,825,815,1615,1515,3015,2815][i],
      reference_type: "chat_message",
      reference_id: messageIds[i],
      description: i % 3 === 0 ? "Chat usage" : "Plan top-up",
    })),
  },
  {
    app: "Knowledge",
    name: "knowledge_notebooks",
    verbose: "Notebook",
    verbosePlural: "Notebooks",
    columns: [
      { key: "id", label: "ID", type: "uuid" },
      { key: "title", label: "Title" },
      { key: "board", label: "Board" },
      { key: "level", label: "Level" },
      { key: "subject", label: "Subject" },
      { key: "faculty", label: "Faculty" },
    ],
    rows: notebookIds.map((id, i) => ({
      id,
      title: `${subjects[i]} - Grade ${grades[i]} Notebook`,
      board: boards[i],
      level: `Grade ${grades[i]}`,
      faculty: i < 5 ? "Science" : "Humanities",
      subject: subjects[i],
      curriculum: "2025-26",
    })),
  },
  {
    app: "Knowledge",
    name: "knowledge_documents",
    verbose: "Document",
    verbosePlural: "Documents",
    columns: [
      { key: "id", label: "ID", type: "uuid" },
      { key: "notebook_id", label: "Notebook", type: "fk" },
      { key: "title", label: "Title" },
      { key: "subject", label: "Subject" },
      { key: "chapter", label: "Chapter" },
      { key: "processing_status", label: "Status" },
      { key: "chunk_count", label: "Chunks", type: "int" },
    ],
    rows: documentIds.map((id, i) => ({
      id,
      notebook_id: notebookIds[i],
      title: `Chapter ${i + 1}: ${["Algebra","Motion","Atoms","Cells","Grammar","Mughals","Climate","Loops","Markets","Constitution"][i]}`,
      board: boards[i],
      grade: grades[i],
      subject: subjects[i],
      chapter: `Ch ${i + 1}`,
      processing_status: ["ready","ready","processing","ready","failed","ready","ready","queued","ready","ready"][i],
      chunk_count: [42,68,0,55,0,91,33,0,77,128][i],
      source_type: "pdf",
    })),
  },
  {
    app: "Knowledge",
    name: "knowledge_chunks",
    verbose: "Chunk",
    verbosePlural: "Chunks",
    columns: [
      { key: "id", label: "ID", type: "uuid" },
      { key: "document_id", label: "Document", type: "fk" },
      { key: "chapter", label: "Chapter" },
      { key: "topic", label: "Topic" },
      { key: "chunk_index", label: "Index", type: "int" },
    ],
    rows: Array.from({ length: 10 }, (_, i) => ({
      id: uuid(`kc${i + 1}`),
      document_id: documentIds[i],
      board: boards[i],
      grade: grades[i],
      subject: subjects[i],
      chapter: `Ch ${i + 1}`,
      topic: ["Intro","Definitions","Examples","Worked problems","Summary","Activity","Recap","Practice","Diagram","Assessment"][i],
      content: "Lorem ipsum chunk content for indexing and retrieval...",
      chunk_index: i,
    })),
  },
  {
    app: "Prompts",
    name: "prompt_templates",
    verbose: "Prompt template",
    verbosePlural: "Prompt templates",
    columns: [
      { key: "id", label: "ID", type: "uuid" },
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "purpose", label: "Purpose" },
      { key: "language", label: "Lang" },
      { key: "is_active", label: "Active", type: "bool" },
    ],
    rows: Array.from({ length: 10 }, (_, i) => ({
      id: uuid(`pt${i + 1}`),
      updated_by: userIds[0],
      name: ["Tutor Default","Concept Explainer","Quiz Generator","Summariser","Doubt Solver","Translator","Hindi Tutor","Reviser","Worksheet Maker","Exam Coach"][i],
      slug: ["tutor-default","concept-explainer","quiz-gen","summariser","doubt-solver","translator","hindi-tutor","reviser","worksheet-maker","exam-coach"][i],
      purpose: i % 2 ? "chat" : "generation",
      language: i === 6 ? "hi" : "en",
      is_active: i !== 4,
    })),
  },
  {
    app: "Chat",
    name: "chat_sessions",
    verbose: "Chat session",
    verbosePlural: "Chat sessions",
    columns: [
      { key: "id", label: "ID", type: "uuid" },
      { key: "user_id", label: "User", type: "fk" },
      { key: "subject_context", label: "Subject" },
      { key: "subject_tags", label: "Tags", type: "array" },
    ],
    rows: sessionIds.map((id, i) => ({
      id,
      user_id: userIds[i],
      subject_context: subjects[i],
      subject_tags: [subjects[i], `Grade ${grades[i]}`],
    })),
  },
  {
    app: "Chat",
    name: "chat_messages",
    verbose: "Chat message",
    verbosePlural: "Chat messages",
    columns: [
      { key: "id", label: "ID", type: "uuid" },
      { key: "session_id", label: "Session", type: "fk" },
      { key: "role", label: "Role" },
      { key: "content", label: "Content" },
      { key: "grounded", label: "Grounded", type: "bool" },
      { key: "feedback", label: "Feedback" },
    ],
    rows: messageIds.map((id, i) => ({
      id,
      session_id: sessionIds[i],
      role: i % 2 ? "assistant" : "user",
      content: i % 2 ? "Here is the step-by-step explanation..." : "Can you explain Newton's second law?",
      grounded: i % 2 === 1,
      citations: i % 2 ? [{ doc: documentIds[i], page: 12 }] : [],
      feedback: i % 3 === 0 ? "thumbs_up" : null,
      created_at: dt(`2025-05-${10 + i} 14:00:00`),
    })),
  },
  {
    app: "Notes",
    name: "revision_notes",
    verbose: "Revision note",
    verbosePlural: "Revision notes",
    columns: [
      { key: "id", label: "ID", type: "uuid" },
      { key: "user_id", label: "User", type: "fk" },
      { key: "session_id", label: "Session", type: "fk" },
      { key: "title", label: "Title" },
      { key: "subject_tag", label: "Subject" },
      { key: "colour_label", label: "Colour" },
    ],
    rows: noteIds.map((id, i) => ({
      id,
      user_id: userIds[i],
      session_id: sessionIds[i],
      message_id: messageIds[i],
      title: `${subjects[i]} key concept`,
      subject_tag: subjects[i],
      chapter_tag: `Ch ${i + 1}`,
      annotation: "Revisit before mid-terms",
      colour_label: ["yellow","green","blue","pink","orange","purple","red","teal","amber","lime"][i],
    })),
  },
  {
    app: "Notes",
    name: "note_revision_logs",
    verbose: "Revision log",
    verbosePlural: "Revision logs",
    columns: [
      { key: "id", label: "ID", type: "uuid" },
      { key: "note_id", label: "Note", type: "fk" },
      { key: "user_id", label: "User", type: "fk" },
      { key: "action", label: "Action" },
      { key: "revised_at", label: "Revised", type: "date" },
    ],
    rows: Array.from({ length: 10 }, (_, i) => ({
      id: uuid(`nl${i + 1}`),
      note_id: noteIds[i],
      user_id: userIds[i],
      action: ["created","edited","reviewed","edited","reviewed","archived","restored","edited","reviewed","edited"][i],
      revised_at: dt(`2025-05-${15 + i} 09:00:00`),
    })),
  },
];

export const modelsByApp = () => {
  const map = new Map<string, Model[]>();
  for (const m of models) {
    if (!map.has(m.app)) map.set(m.app, []);
    map.get(m.app)!.push(m);
  }
  return Array.from(map.entries());
};

export const getModel = (name: string) => models.find((m) => m.name === name);
