import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof (file as Blob).arrayBuffer !== "function") {
        return new Response(JSON.stringify({ error: "Missing or invalid file" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const transcription = await openai.audio.transcriptions.create({
            file: file as File,
            model: "whisper-1",
        });

        return new Response(
            JSON.stringify({ text: transcription.text ?? "" }),
            {
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (err) {
        console.error("Transcribe error:", err);
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Transcription failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
