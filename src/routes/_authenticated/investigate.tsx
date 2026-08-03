import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { UploadCloud, FileUp, X, Loader2, Play, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { runInvestigation } from "@/lib/investigation.functions";
import { AGENTS } from "@/lib/agents";

export const Route = createFileRoute("/_authenticated/investigate")({
  head: () => ({
    meta: [
      { title: "New Investigation — ForensicAI" },
      {
        name: "description",
        content: "Create a forensic case, upload evidence artefacts and run the nine-agent investigation pipeline.",
      },
      { property: "og:title", content: "New Investigation — ForensicAI" },
      { property: "og:description", content: "Create a case and run the multi-agent forensic pipeline." },
    ],
  }),
  component: NewInvestigation,
});

const CASE_TYPES = [
  "Malware incident",
  "Data breach",
  "Insider threat",
  "Phishing campaign",
  "Ransomware",
  "Network intrusion",
  "Fraud investigation",
  "Other",
];

const TEXT_EXT = /\.(log|txt|csv|json|xml|evtx|md|conf|ini|yaml|yml|pcapng?\.txt)$/i;
const MAX_BYTES = 20 * 1024 * 1024;

const schema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(160),
  description: z.string().trim().max(4000).optional(),
  caseType: z.string().min(1),
});

function NewInvestigation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const run = useServerFn(runInvestigation);
  const [files, setFiles] = useState<File[]>([]);
  const [caseType, setCaseType] = useState(CASE_TYPES[0]!);
  const [stage, setStage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).filter((f) => {
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} exceeds the 20 MB limit.`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...next].slice(0, 10));
  }

  async function sha256(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buf);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      title: form.get("title"),
      description: form.get("description") || undefined,
      caseType,
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      setStage("Creating case record");
      const { data: created, error: caseError } = await supabase
        .from("cases")
        .insert({
          user_id: user.id,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          case_type: parsed.data.caseType,
          status: "draft",
        })
        .select("id")
        .single();
      if (caseError || !created) throw caseError ?? new Error("Could not create the case.");

      for (const [index, file] of files.entries()) {
        setStage(`Uploading evidence ${index + 1} of ${files.length}`);
        const path = `${user.id}/${created.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("evidence")
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;

        let extracted: string | null = null;
        if (TEXT_EXT.test(file.name) || (file.type || "").startsWith("text/")) {
          extracted = (await file.text()).slice(0, 20000);
        }

        const { error: rowError } = await supabase.from("evidence_files").insert({
          case_id: created.id,
          user_id: user.id,
          file_name: file.name,
          file_type: file.type || null,
          file_size: file.size,
          sha256: await sha256(file),
          storage_path: path,
          extracted_text: extracted,
        });
        if (rowError) throw rowError;
      }

      setStage("Running the multi-agent pipeline");
      await run({ data: { caseId: created.id } });
      toast.success("Investigation complete");
      navigate({ to: "/case/$caseId", params: { caseId: created.id } });
    } catch (error) {
      toast.error((error as Error).message || "Investigation failed.");
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  return (
    <AppShell title="New investigation" subtitle="Create a case and dispatch the agent pipeline">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <form onSubmit={handleSubmit} className="glass-panel space-y-5 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs uppercase tracking-wider text-muted-foreground">
              Case title
            </Label>
            <Input id="title" name="title" placeholder="Suspicious lateral movement on FIN-DB-02" />
            {errors["title"] && <p className="text-xs text-danger">{errors["title"]}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Investigation type
            </Label>
            <Select value={caseType} onValueChange={setCaseType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs uppercase tracking-wider text-muted-foreground">
              Incident context
            </Label>
            <Textarea
              id="description"
              name="description"
              rows={5}
              placeholder="What was observed, when, on which hosts, and what has already been ruled out?"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Evidence artefacts
            </Label>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-secondary/50">
              <UploadCloud className="size-7 text-primary" />
              <span className="text-sm font-medium">Drop artefacts or browse</span>
              <span className="text-xs text-muted-foreground">
                Logs, exports, memory strings, JSON/CSV telemetry · max 20 MB each, 10 files
              </span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>
            {files.length > 0 && (
              <ul className="space-y-1.5">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs"
                  >
                    <FileUp className="size-3.5 text-primary" />
                    <span className="truncate">{f.name}</span>
                    <span className="ml-auto font-mono text-muted-foreground">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="size-3.5 text-muted-foreground hover:text-danger" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Play className="mr-2 size-4" />}
            {busy ? (stage ?? "Working…") : "Run investigation"}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Evidence is stored in a private bucket accessible only to you and administrators.
          </p>
        </form>

        <div className="glass-panel h-fit p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h2 className="font-display text-sm font-semibold">Pipeline sequence</h2>
          </div>
          <ol className="mt-4 space-y-3">
            {AGENTS.map((a, i) => {
              const active = busy && stage?.startsWith("Running");
              return (
                <li key={a.key} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full font-mono text-[10px] ${
                      active ? "bg-primary/20 text-primary animate-pulse-ring" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.role}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
