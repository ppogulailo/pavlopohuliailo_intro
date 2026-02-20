"use client";

import { useMemo, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // voice recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);

  async function sendText(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next }),
    });

    if (!res.ok || !res.body) {
      setMessages((m) => [...m, { role: "assistant", content: "Error. Try again." }]);
      setLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";

    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      assistantText += decoder.decode(value, { stream: true });
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: assistantText };
        return copy;
      });
    }

    setLoading(false);
  }

  async function send() {
    const text = input;
    setInput("");
    await sendText(text);
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mediaRecorderRef.current = mr;
    chunksRef.current = [];

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = async () => {
      // stop mic tracks
      stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], "voice.webm", { type: "audio/webm" });

      if (file.size === 0) {
        setMessages((m) => [...m, { role: "assistant", content: "No audio recorded. Try speaking longer before stopping." }]);
        return;
      }

      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: "Transcription failed." }]);
        return;
      }

      const { text } = (await res.json()) as { text: string };
      await sendText(text);
    };

    mr.start();
    setRecording(true);
  }

  function stopRecording() {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.stop();
    setRecording(false);
  }

  async function speakLastAssistant() {
    const last = [...messages].reverse().find((m) => m.role === "assistant")?.content?.trim();
    if (!last) return;

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: last }),
    });

    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  }

  const canSpeak = useMemo(
      () => messages.some((m) => m.role === "assistant" && m.content.trim()),
      [messages]
  );

  return (
      <main style={{ maxWidth: 760, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>RAG Chat + Voice</h1>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, minHeight: 360 }}>
          {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <b>{m.role}:</b> <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span>
              </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
              style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <button onClick={send} disabled={loading} style={{ padding: "10px 14px" }}>
            {loading ? "…" : "Send"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {!recording ? (
              <button onClick={startRecording} style={{ padding: "10px 14px" }}>
                🎙️ Record
              </button>
          ) : (
              <button onClick={stopRecording} style={{ padding: "10px 14px" }}>
                ⏹ Stop
              </button>
          )}

          <button onClick={speakLastAssistant} disabled={!canSpeak} style={{ padding: "10px 14px" }}>
            🔊 Speak last answer
          </button>
        </div>

        <p style={{ color: "#666", marginTop: 12, fontSize: 13 }}>
          Voice note → transcribe → RAG answer. “Speak last answer” uses OpenAI TTS.
        </p>
      </main>
  );
}