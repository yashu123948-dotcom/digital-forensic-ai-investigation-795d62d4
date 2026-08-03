import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Boxes, Search, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { evidenceQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/evidence")({
  head: () => ({
    meta: [
      { title: "Evidence Explorer — ForensicAI" },
      { name: "description", content: "Search every collected artefact with hashes, sizes and originating case." },
      { property: "og:title", content: "Evidence Explorer — ForensicAI" },
      { property: "og:description", content: "Search collected forensic artefacts and their hashes." },
    ],
  }),
  component: Evidence,
});

function Evidence() {
  const { data = [], isLoading } = useQuery(evidenceQuery());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = data.filter(
    (e) =>
      e.file_name.toLowerCase().includes(q.toLowerCase()) ||
      (e.sha256 ?? "").includes(q.toLowerCase()),
  );

  async function download(path: string | null, id: string) {
    if (!path) return;
    setBusy(id);
    const { data: signed, error } = await supabase.storage
      .from("evidence")
      .createSignedUrl(path, 60);
    setBusy(null);
    if (error || !signed) {
      toast.error("Could not create a download link.");
      return;
    }
    window.open(signed.signedUrl, "_blank", "noopener");
  }

  return (
    <AppShell title="Evidence explorer" subtitle="Every artefact collected across your cases">
      <div className="glass-panel mb-4 flex items-center gap-2 p-3">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by filename or SHA-256…"
          className="h-9 border-0 bg-transparent focus-visible:ring-0"
        />
      </div>

      <div className="glass-panel overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading artefacts…</p>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Boxes className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No artefacts found.</p>
            <Button asChild className="mt-4">
              <Link to="/investigate">Upload evidence</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Artefact</th>
                  <th className="px-5 py-3">Case</th>
                  <th className="px-5 py-3">Size</th>
                  <th className="px-5 py-3">SHA-256</th>
                  <th className="px-5 py-3">Collected</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => (
                  <tr key={e.id} className="transition-colors hover:bg-secondary/30">
                    <td className="max-w-[16rem] truncate px-5 py-3 font-medium">{e.file_name}</td>
                    <td className="max-w-[12rem] truncate px-5 py-3 text-muted-foreground">
                      <Link to="/case/$caseId" params={{ caseId: e.case_id }} className="hover:text-primary">
                        {e.cases?.title ?? "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{(e.file_size / 1024).toFixed(0)} KB</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-muted-foreground">
                      {e.sha256 ? `${e.sha256.slice(0, 20)}…` : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!e.storage_path || busy === e.id}
                        onClick={() => download(e.storage_path, e.id)}
                      >
                        {busy === e.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Download className="size-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
