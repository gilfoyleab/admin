function requireEmbeddingEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function toGeminiModelPath(model: string) {
  return model.startsWith("models/") ? model : `models/${model}`;
}

export async function embedText(input: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY for document processing.",
    );
  }
  const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
  requireEmbeddingEnv("NEXT_PUBLIC_SUPABASE_URL");

  const modelPath = toGeminiModelPath(model);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${modelPath}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelPath,
        content: {
          parts: [{ text: input }],
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create embedding: ${text}`);
  }

  const payload = (await response.json()) as {
    embedding?: { values?: number[] };
  };

  return payload.embedding?.values ?? [];
}

export async function embedTexts(inputs: string[]) {
  const vectors: number[][] = [];
  for (const input of inputs) {
    vectors.push(await embedText(input));
  }
  return vectors;
}
