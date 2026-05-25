import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/knowledge")({
  component: LegacyKnowledgeRedirect,
  head: () => ({
    meta: [{ title: "Redirecting to notebook workspace" }],
  }),
});

function LegacyKnowledgeRedirect() {
  useEffect(() => {
    window.location.replace("/notebooks");
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-[var(--radius)] p-5 text-sm">
        Redirecting to notebook workspace...
        <a href="/notebooks" className="ml-2 text-link hover:underline">
          Open now
        </a>
      </div>
    </div>
  );
}
