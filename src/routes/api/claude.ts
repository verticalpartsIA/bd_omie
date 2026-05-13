import { createFileRoute } from "@tanstack/react-router";
import Anthropic from "@anthropic-ai/sdk";

export const Route = createFileRoute("/api/claude")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { question, context } = (await request.json()) as {
          question: string;
          context: string;
        };

        const apiKey =
          // @ts-expect-error — Cloudflare Workers env
          typeof globalThis.ANTHROPIC_API_KEY !== "undefined"
            ? // @ts-expect-error
              (globalThis.ANTHROPIC_API_KEY as string)
            : process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const client = new Anthropic({ apiKey });

        const stream = client.messages.stream({
          model: "claude-haiku-4-5",
          max_tokens: 1024,
          system: context,
          messages: [{ role: "user", content: question }],
        });

        const readable = new ReadableStream({
          async start(controller) {
            try {
              for await (const event of stream) {
                if (
                  event.type === "content_block_delta" &&
                  event.delta.type === "text_delta"
                ) {
                  controller.enqueue(
                    new TextEncoder().encode(event.delta.text),
                  );
                }
              }
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
