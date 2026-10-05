import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Bot,
  CircleHelp,
  ChevronDown,
  Search,
  Send,
  X,
  Loader2,
} from "lucide-react";
import { askAssistant } from "@/lib/investigation.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

const HELP_SECTIONS = [
  {
    id: "getting-started",
    title: "Getting started",
    questions: [
      ["What is ForensicAI?", "ForensicAI helps analysts organize investigations, examine uploaded digital evidence with nine AI agents, review findings, and create reports. AI findings are leads for review, not proof on their own."],
      ["How does this platform work?", "Create an investigation, upload the files you are authorized to examine, and start the investigation. The platform records file fingerprints, reads supported text or ZIP directory listings, and sends the available evidence information through its agent workflow."],
      ["How do I start a new investigation?", "Open New Investigation, enter a case title and type, add the evidence files, confirm that you are authorized to use them, then choose Run investigation. Files must be no larger than 20 MB each."],
      ["What are the main features of this platform?", "The platform includes case management, nine AI agents, agent reports, an evidence inventory, investigation timelines, threat-intelligence results, analytics, and reports. Available results depend on the evidence you provide."],
    ],
  },
  {
    id: "ai-agents",
    title: "AI agents",
    questions: [
      ["What are the 11 AI agents in this platform?", "The current platform has nine agents, not 11: Orchestrator, Evidence Collection, Log Analysis, Malware Detection, Timeline Reconstruction, Correlation, Risk Assessment, Threat Intelligence, and Report Generation."],
      ["What is the role of the Orchestrator Agent?", "It coordinates the investigation workflow and organizes the specialist agents' results into a structured set of findings."],
      ["How does the Evidence Collection Agent work?", "It processes evidence files uploaded to a case, calculates a SHA-256 fingerprint, reads supported UTF-8 text, and lists names in supported ZIP archives. Unsupported file contents are not extracted; their available file details can still be recorded."],
      ["How do the AI agents communicate with each other?", "The investigation workflow gives the agents the case details and available evidence information, then saves their structured results for review. The application does not provide separate live agent chat sessions."],
      ["How can I view AI agent reports?", "Open AI Agent Reports in the navigation, choose an investigation, and review its agent activity and findings."],
    ],
  },
  {
    id: "evidence-management",
    title: "Evidence management",
    questions: [
      ["How do I upload digital evidence?", "Open New Investigation, choose files from your device, and confirm you are authorized to use them. The current limit is 10 files, up to 20 MB each."],
      ["What file formats are supported?", "The platform reads UTF-8 text files such as TXT, LOG, CSV, JSON, XML, Markdown, INI, CONF, and YAML. It can list filenames in ZIP archives but does not extract archived contents. Other files can be fingerprinted and inventoried, but their contents are not parsed."],
      ["How does evidence collection work?", "Evidence is collected from files you upload to an investigation. It is kept in private storage, fingerprinted, and processed using the available text or ZIP-directory reader. Device access, cloud accounts, external APIs, disk-image parsing, and memory-dump parsing are not connected."],
      ["How can I verify evidence integrity?", "Open an item in Evidence Explorer and choose Recheck SHA-256. A match means the stored file currently has the same fingerprint as the one recorded during processing. Missing fingerprints cannot be verified."],
      ["Where can I view the collected evidence?", "Open Evidence Explorer to search the evidence attached to cases, view its processing details, and recheck its fingerprint."],
    ],
  },
  {
    id: "investigation",
    title: "Investigation",
    questions: [
      ["How do I start an investigation?", "In New Investigation, complete the case details, upload one or more evidence files, confirm your authorization, and start the investigation."],
      ["How can I monitor the investigation timeline?", "Open Timeline to review available events, or open the case and its AI Agent Reports to review the agents' reported activity. Timeline detail depends on what the evidence supports."],
      ["How does the system detect suspicious activity?", "The AI agents review the supplied evidence for patterns and indicators. A suspicious indicator is not confirmation of wrongdoing; check its evidence references and uncertainty before drawing conclusions."],
      ["How can I view investigation results?", "Open the case to review its status and findings, or open AI Agent Reports for agent-by-agent results."],
      ["How do I generate a forensic report?", "Run an investigation to create its report, then open Reports or the case report. Report downloads remain unavailable until an administrator approves them."],
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    questions: [
      ["Why is my evidence not being analyzed?", "Check that the file uploaded successfully and that its SHA-256 fingerprint was recorded. Text extraction is limited to supported UTF-8 text files; other formats may appear as metadata only. No outside evidence sources are currently connected."],
      ["Why is an AI agent not responding?", "The investigation needs accessible evidence and an available AI service. Check the case status and error message, then retry. If the issue continues, ask your ForensicAI administrator for help."],
      ["What should I do if evidence extraction fails?", "The original uploaded file is not changed. Review its processing details in Evidence Explorer. Unsupported formats remain metadata-only; ZIP files show filenames only, not their contents."],
      ["How can I resolve an investigation error?", "Check the investigation's error message, confirm the evidence upload completed and has a fingerprint, and retry the investigation. Ask your administrator if the problem continues."],
    ],
  },
] as const;

type HelpTab = "guide" | "assistant";

export function AssistantDock() {
  const ask = useServerFn(askAssistant);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<HelpTab>("guide");
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "getting-started": true,
  });
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Ask about your investigation results. No specific case is selected in this assistant window.",
    },
  ]);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleSections = HELP_SECTIONS.map((section) => ({
    ...section,
    questions: section.questions.filter(([question, answer]) =>
      `${question} ${answer}`.toLowerCase().includes(normalizedSearch),
    ),
  })).filter((section) => section.questions.length > 0);

  async function send() {
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const res = await ask({ data: { question, caseId: null } });
      setMessages((m) => [...m, { role: "assistant", text: res.answer }]);
    } catch (error) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: (error as Error).message || "Assistant unavailable." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && (
        <section
          aria-label="ForensicAI Help Center"
          className="glass-panel fixed bottom-24 right-5 z-50 flex max-h-[min(42rem,calc(100vh-7rem))] w-[min(25rem,calc(100vw-2rem))] flex-col overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            {tab === "guide" ? (
              <CircleHelp className="size-4 text-primary" />
            ) : (
              <Bot className="size-4 text-primary" />
            )}
            <span className="font-display text-sm font-semibold">
              {tab === "guide" ? "Help center" : "ForensicAI assistant"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto size-8"
              onClick={() => setOpen(false)}
              aria-label="Close Help Center"
            >
              <X className="size-4 text-muted-foreground" />
            </Button>
          </div>
          <div className="grid grid-cols-2 border-b border-border p-2">
            <Button
              variant={tab === "guide" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTab("guide")}
            >
              Help guide
            </Button>
            <Button
              variant={tab === "assistant" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTab("assistant")}
            >
              Ask AI
            </Button>
          </div>
          {tab === "guide" ? (
            <>
              <div className="border-b border-border px-3 py-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search help questions…"
                    aria-label="Search help questions"
                    className="h-10 pl-9"
                  />
                </div>
              </div>
              <ScrollArea className="min-h-0 flex-1 px-3 py-2">
                <div className="space-y-1">
                  {visibleSections.map((section) => {
                    const expanded = normalizedSearch.length > 0 || expandedSections[section.id];
                    return (
                      <section key={section.id} className="border-b border-border/70 last:border-0">
                        <Button
                          variant="ghost"
                          className="h-10 w-full justify-between px-2 font-semibold"
                          aria-expanded={Boolean(expanded)}
                          onClick={() =>
                            setExpandedSections((current) => ({
                              ...current,
                              [section.id]: !current[section.id],
                            }))
                          }
                        >
                          {section.title}
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            {section.questions.length}
                            <ChevronDown
                              className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                            />
                          </span>
                        </Button>
                        {expanded && (
                          <div className="space-y-1 pb-2">
                            {section.questions.map(([question, answer]) => {
                              const questionKey = `${section.id}:${question}`;
                              const isActive = activeQuestion === questionKey;
                              return (
                                <div key={questionKey} className="rounded-md bg-secondary/30">
                                  <Button
                                    variant="ghost"
                                    className="h-auto min-h-10 w-full justify-between gap-3 whitespace-normal px-3 py-2 text-left text-sm font-medium"
                                    aria-expanded={isActive}
                                    onClick={() => setActiveQuestion(isActive ? null : questionKey)}
                                  >
                                    <span>{question}</span>
                                    <ChevronDown
                                      className={`size-4 shrink-0 text-muted-foreground transition-transform ${isActive ? "rotate-180" : ""}`}
                                    />
                                  </Button>
                                  {isActive && (
                                    <p className="px-3 pb-3 text-xs leading-relaxed text-muted-foreground">
                                      {answer}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}
                  {visibleSections.length === 0 && (
                    <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                      No help questions match that search.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              <ScrollArea className="min-h-0 flex-1 px-4 py-3">
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={
                        message.role === "user"
                          ? "ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-primary/15 px-3 py-2 text-sm"
                          : "max-w-[90%] rounded-lg rounded-bl-sm bg-secondary px-3 py-2 text-sm text-secondary-foreground"
                      }
                    >
                      {message.text}
                    </div>
                  ))}
                  {busy && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" /> analysing…
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="flex gap-2 border-t border-border p-3">
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && send()}
                  placeholder="Ask about a case…"
                  className="h-9"
                />
                <Button size="icon" className="size-9 shrink-0" onClick={send} disabled={busy}>
                  <Send className="size-4" />
                </Button>
              </div>
            </>
          )}
        </section>
      )}
      <Button
        variant="default"
        size="icon"
        title="Help"
        onClick={() => setOpen((v) => !v)}
        aria-label="Help"
        aria-expanded={open}
        className="fixed bottom-6 right-5 z-50 size-14 rounded-full shadow-lg transition-transform hover:scale-105 animate-pulse-ring"
      >
        <CircleHelp className="size-6" />
      </Button>
    </>
  );
}
