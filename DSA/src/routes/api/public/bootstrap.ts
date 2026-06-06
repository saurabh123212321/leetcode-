import { createFileRoute } from "@tanstack/react-router";
import { bootstrapDemo } from "@/lib/seed.functions";

export const Route = createFileRoute("/api/public/bootstrap")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await bootstrapDemo();
          return Response.json(result);
        } catch (e: any) {
          console.error("bootstrap error", e);
          return Response.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
        }
      },
      GET: async () => {
        try {
          const result = await bootstrapDemo();
          return Response.json(result);
        } catch (e: any) {
          return Response.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
        }
      },
    },
  },
});
