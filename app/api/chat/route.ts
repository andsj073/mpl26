import Anthropic from "@anthropic-ai/sdk";
import { getDb, hasDb } from "@/lib/db";
import { messages as messagesTable } from "@/lib/db/schema";
import { buildChatContext } from "@/lib/chat/context";
import { CHAT_TOOLS, runTool } from "@/lib/chat/tools";

export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5";
const MAX_TOOL_ROUNDS = 8;

export async function POST(req: Request) {
  if (!hasDb() || !process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Databas eller ANTHROPIC_API_KEY är inte konfigurerad än." },
      { status: 503 }
    );
  }

  const { content, author } = await req.json();
  if (!content?.trim() || !author?.trim()) {
    return Response.json({ error: "content och author krävs." }, { status: 400 });
  }

  const db = getDb();
  const { system, history } = await buildChatContext(author);

  // Persistera user-meddelandet direkt
  await db
    .insert(messagesTable)
    .values({ role: "user", content, author, owner: author });

  // Historik → konversationsturer; user-meddelanden märks med avsändare
  const turns: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.role === "user" ? `[${m.author}]: ${m.content}` : m.content,
  }));
  turns.push({ role: "user", content: `[${author}]: ${content}` });

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      let fullText = "";
      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const msgStream = client.messages.stream({
            model: MODEL,
            max_tokens: 2000,
            system,
            tools: CHAT_TOOLS,
            messages: turns,
          });

          msgStream.on("text", (delta) => {
            fullText += delta;
            send({ type: "text", text: delta });
          });

          const final = await msgStream.finalMessage();

          if (final.stop_reason !== "tool_use") break;

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of final.content) {
            if (block.type !== "tool_use") continue;
            const input = {
              ...(block.input as Record<string, unknown>),
              _author: author,
            };
            let result: string;
            try {
              const r = await runTool(block.name, input);
              result = r.result;
              send({ type: "tool", label: r.label });
            } catch (e) {
              result = `Fel: ${e instanceof Error ? e.message : String(e)}`;
              send({ type: "tool", label: "Något gick fel med en ändring" });
            }
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result,
            });
          }

          turns.push({ role: "assistant", content: final.content });
          turns.push({ role: "user", content: toolResults });
          fullText += "\n";
          send({ type: "text", text: "\n" });
        }

        if (fullText.trim()) {
          await db.insert(messagesTable).values({
            role: "assistant",
            content: fullText.trim(),
            author: null,
            owner: author,
          });
        }
        send({ type: "done" });
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : "Något gick fel.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
