import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

type Msg = { role: "user" | "assistant"; content: string };

async function embed(text: string) {
    const r = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });
    return r.data[0].embedding;
}

export async function POST(req: Request) {
    const { messages } = (await req.json()) as { messages: Msg[] };
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    // 1) embed query
    const queryEmbedding = await embed(lastUser);

    // 2) retrieve top chunks from Supabase
    const { data: chunks, error } = await supabase.rpc("match_documents", {
        query_embedding: queryEmbedding,
        match_threshold: 0.2,
        match_count: 6,
    });

    if (error) {
        return new Response("Vector search error", { status: 500 });
    }

    const context = (chunks ?? [])
        .map((c: any, i: number) => {
            const title = c.metadata?.title ?? "Source";
            const url = c.metadata?.url ?? c.metadata?.source ?? "local";
            const page = c.metadata?.page ? ` p.${c.metadata.page}` : "";
            return `[S${i + 1}] ${title} (${url}${page})\n${c.content}`;
        })
        .join("\n\n");

    // 3) stream model response
    const system = `
You are a friendly website assistant.

For greetings, thanks, or conversational messages (e.g. "Hello", "Can you hear me?", "What can you do?") reply briefly and naturally—no need to use the knowledge base.

For questions about the website or its content: answer using ONLY the provided context. Add citations like [S1], [S2] next to claims. If the answer is not in the context, say: "I don't have that information in my knowledge base yet."

Keep replies concise.
  `.trim();

    const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        stream: true,
        messages: [
            { role: "system", content: system },
            {
                role: "user",
                content: `Context:\n${context}\n\nUser question:\n${lastUser}`,
            },
        ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            try {
                for await (const part of stream) {
                    const delta = part.choices[0]?.delta?.content ?? "";
                    if (delta) controller.enqueue(encoder.encode(delta));
                }
            } finally {
                controller.close();
            }
        },
    });

    // OpenAI recommends Responses API for streaming in general, but chat streaming is supported too. :contentReference[oaicite:2]{index=2}
    return new Response(readable, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
}