import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Globe2, Crosshair, Bug } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { outputsQuery, reportsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/threat-intel")({
  head: () => ({
    meta: [
      { title: "Threat Intelligence — ForensicAI" },
      { name: "description", content: "Indicators of compromise and MITRE ATT&CK techniques observed across investigations." },
      { property: "og:title", content: "Threat Intelligence — ForensicAI" },
      { property: "og:description", content: "IOCs and MITRE ATT&CK techniques observed across cases." },
    ],
  }),
  component: ThreatIntel,
});

function ThreatIntel() {
  const { data: outputs = [] } = useQuery(outputsQuery());
  const { data: reports = [] } = useQuery(reportsQuery());

  const intel = outputs.filter(
    (o) => o.agent_key === "threat_intelligence" || o.agent_key === "malware_detection",
  );

  const mitre = reports.flatMap((r) => {
    const content = (r.content ?? {}) as {
      mitre?: { id?: string; technique?: string; rationale?: string }[];
    };
    return (content.mitre ?? []).map((m) => ({ ...m, caseTitle: r.cases?.title ?? "Case" }));
  });

  return (
    <AppShell title="Threat intelligence" subtitle="IOCs, malware verdicts and ATT&CK coverage">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <Crosshair className="size-4 text-primary" />
            <h2 className="font-display text-sm font-semibold">MITRE ATT&CK techniques</h2>
          </div>
          {mitre.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No techniques mapped yet. Complete an investigation to populate ATT&CK coverage.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {mitre.map((m, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary">{m.id}</span>
                    <span className="text-sm font-medium">{m.technique}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{m.rationale}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">{m.caseTitle}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <Globe2 className="size-4 text-primary" />
            <h2 className="font-display text-sm font-semibold">Intelligence &amp; malware findings</h2>
          </div>
          {intel.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No threat intelligence output yet.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {intel.map((o) => (
                <div key={o.id} className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Bug className="size-3.5 text-primary" />
                    <span className="text-sm font-medium">{o.agent_name}</span>
                    {o.risk && <StatusChip value={o.risk} className="ml-auto" />}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{o.summary}</p>
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                    confidence {Math.round((o.confidence ?? 0) * 100)}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
