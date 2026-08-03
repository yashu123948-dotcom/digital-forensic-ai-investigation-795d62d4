import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  low: "bg-success/15 text-success border-success/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  high: "bg-danger/15 text-danger border-danger/30",
  critical: "bg-critical/20 text-critical border-critical/40",
  info: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-success/15 text-success border-success/30",
  running: "bg-primary/15 text-primary border-primary/30",
  draft: "bg-muted text-muted-foreground border-border",
  failed: "bg-danger/15 text-danger border-danger/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-danger/15 text-danger border-danger/30",
  deactivated: "bg-muted text-muted-foreground border-border",
  partial: "bg-warning/15 text-warning border-warning/30",
  no_findings: "bg-muted text-muted-foreground border-border",
};

export function StatusChip({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  const key = (value ?? "unknown").toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider",
        styles[key] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {(value ?? "unknown").replace(/_/g, " ")}
    </span>
  );
}
