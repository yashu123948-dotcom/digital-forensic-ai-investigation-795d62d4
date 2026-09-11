import bgSoc from "@/assets/bg-soc-hero.jpg";
import bgEvidence from "@/assets/bg-evidence.jpg";
import bgTimeline from "@/assets/bg-timeline.jpg";
import bgLogs from "@/assets/bg-logs.jpg";
import bgReports from "@/assets/bg-reports.jpg";
import bgNetwork from "@/assets/bg-network.jpg";

/**
 * Purely decorative background imagery.
 * Swap any entry below for a different local image (or a remote URL string)
 * without touching page content.
 */
const BACKDROPS: Record<string, { src: string; position: string }> = {
  "/home": { src: bgSoc, position: "center center" },
  "/agents": { src: bgNetwork, position: "center center" },
  "/investigate": { src: bgSoc, position: "center right" },
  "/agent-reports": { src: bgLogs, position: "center right" },
  "/evidence": { src: bgEvidence, position: "center" },
  "/timeline": { src: bgTimeline, position: "center right" },
  "/threat-intel": { src: bgNetwork, position: "center right" },
  "/reports": { src: bgReports, position: "center" },
  "/analytics": { src: bgTimeline, position: "center" },
  "/admin": { src: bgSoc, position: "center left" },
};

export function pickBackdrop(pathname: string) {
  if (BACKDROPS[pathname]) return BACKDROPS[pathname];
  if (pathname.startsWith("/case")) return BACKDROPS["/timeline"];
  if (pathname.startsWith("/report")) return BACKDROPS["/reports"];
  return null;
}

export function PageBackdrop({ pathname }: { pathname: string }) {
  const backdrop = pickBackdrop(pathname);
  if (!backdrop) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.14] sm:opacity-[0.20]"
        style={{
          backgroundImage: `url(${backdrop.src})`,
          backgroundSize: "cover",
          backgroundPosition: backdrop.position,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,10,20,0.72) 0%, rgba(5,10,20,0.86) 55%, hsl(var(--background)) 100%)",
        }}
      />
    </div>
  );
}
