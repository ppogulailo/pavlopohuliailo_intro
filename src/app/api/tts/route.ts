import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
    const { text } = (await req.json()) as { text: string };

    if (!text?.trim()) return new Response("Missing text", { status: 400 });

    const audio = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "coral",
        input: text,
        // optional:
        // instructions: "Speak in a calm, supportive tone."
    });

    // Audio speech endpoint + gpt-4o-mini-tts are documented here. :contentReference[oaicite:6]{index=6}
    const buffer = Buffer.from(await audio.arrayBuffer());
    return new Response(buffer, {
        headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
        },
    });
}