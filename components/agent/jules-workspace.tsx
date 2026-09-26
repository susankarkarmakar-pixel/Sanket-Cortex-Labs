"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowUpRight, CheckCircle2, ChevronDown, Code2, ExternalLink, Loader2, Menu, MessageSquare, RefreshCw, Rocket, Send, Settings, ShieldCheck } from "lucide-react";

type JulesSession = {
  id: string;
  name: string;
  title: string;
  prompt: string;
  state: string;
  url?: string;
  updateTime?: string;
  outputs?: Array<{ pullRequest?: { url?: string; title?: string; description?: string } }>;
};

type JulesSource = {
  name: string;
  id?: string;
  githubRepo?: {
    owner?: string;
    repo?: string;
    defaultBranch?: { displayName?: string };
    branches?: Array<{ displayName?: string }>;
  };
};

type JulesActivity = {
  id: string;
  description: string;
  originator: string;
  createTime?: string;
  planSteps?: Array<{ title: string; description: string }>;
  progress?: { title: string; description: string };
  agentMessage?: string;
  failureReason?: string;
};

type JulesAction = "list-sources" | "create-session" | "get-session" | "send-message" | "approve-plan";
const SESSION_STORAGE_KEY = "susan_jules_last_session_v1";
const ACTIVE_STATES = new Set(["QUEUED", "PLANNING", "AWAITING_PLAN_APPROVAL", "AWAITING_USER_FEEDBACK", "IN_PROGRESS", "PAUSED"]);

interface JulesWorkspaceProps {
  apiKey: string;
  onOpenSettings: () => void;
  onOpenSidebar: () => void;
}

export function JulesWorkspace({ apiKey, onOpenSettings, onOpenSidebar }: JulesWorkspaceProps) {
  const [sources, setSources] = useState<JulesSource[]>([]);
  const [selectedSource, setSelectedSource] = useState("");
  const selectedSourceRef = useRef("");
  const [branch, setBranch] = useState("");
  const [prompt, setPrompt] = useState("");
  const [session, setSession] = useState<JulesSession | null>(null);
  const [activities, setActivities] = useState<JulesActivity[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadedSavedSession, setLoadedSavedSession] = useState(false);

  const selectedRepo = sources.find((source) => source.name === selectedSource);
  const branches = useMemo(() => {
    const available = (selectedRepo?.githubRepo?.branches || []).map((item) => item.displayName).filter((value): value is string => Boolean(value));
    const defaultBranch = selectedRepo?.githubRepo?.defaultBranch?.displayName;
    if (defaultBranch && !available.includes(defaultBranch)) available.unshift(defaultBranch);
    return available;
  }, [selectedRepo]);
  const callJules = useCallback(async <T,>(action: JulesAction, payload: Record<string, unknown> = {}): Promise<T> => {
    const response = await fetch("/api/jules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ action, apiKey, ...payload }),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string" ? (data as { error: string }).error : `Jules request failed (HTTP ${response.status}).`;
      throw new Error(reason);
    }
    return data as T;
  }, [apiKey]);

  const loadSources = useCallback(async () => {
    if (!apiKey.trim()) { setError(null); setSources([]); selectedSourceRef.current = ""; setSelectedSource(""); setBranch(""); return; }
    setLoadingSources(true);
    setError(null);
    try {
      const result = await callJules<{ sources?: JulesSource[] }>("list-sources");
      const nextSources = Array.isArray(result.sources) ? result.sources.filter((source) => typeof source.name === "string") : [];
      const selected = nextSources.find((source) => source.name === selectedSourceRef.current) || nextSources[0];
      setSources(nextSources);
      selectedSourceRef.current = selected?.name || "";
      setSelectedSource(selectedSourceRef.current);
      setBranch(selected?.githubRepo?.defaultBranch?.displayName || selected?.githubRepo?.branches?.[0]?.displayName || "main");
    } catch (reason) {
      setSources([]);
      selectedSourceRef.current = "";
      setSelectedSource("");
      setBranch("");
      setError(reason instanceof Error ? reason.message : "Could not load Jules repositories.");
    } finally {
      setLoadingSources(false);
    }
  }, [apiKey, callJules]);

  const refreshSession = useCallback(async (sessionId: string | undefined, quiet = false) => {
    if (!sessionId || !apiKey.trim()) return;
    if (!quiet) setRefreshing(true);
    try {
      const result = await callJules<{ session?: JulesSession; activities?: JulesActivity[] }>("get-session", { sessionId });
      if (result.session) setSession(result.session);
      if (Array.isArray(result.activities)) setActivities(result.activities.filter((activity) => Boolean(activity && activity.id)));
      if (!quiet) setError(null);
    } catch (reason) {
      if (!quiet) setError(reason instanceof Error ? reason.message : "Could not refresh the Jules session.");
    } finally {
      if (!quiet) setRefreshing(false);
    }
  }, [apiKey, callJules]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSources(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSources]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as JulesSession;
          if (parsed && typeof parsed.id === "string" && parsed.id) setSession(parsed);
        }
      } catch {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } finally {
        setLoadedSavedSession(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loadedSavedSession) return;
    if (session?.id) sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, [loadedSavedSession, session]);

  useEffect(() => {
    if (!session?.id || !apiKey.trim()) return;
    const timer = window.setTimeout(() => { void refreshSession(session.id, true); }, 0);
    if (!ACTIVE_STATES.has(session.state)) return () => window.clearTimeout(timer);
    const interval = window.setInterval(() => { void refreshSession(session.id, true); }, 15_000);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); };
  }, [apiKey, refreshSession, session?.id, session?.state]);

  const createSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSource || !branch || !prompt.trim()) return;
    setCreating(true);
    setError(null);
    setActivities([]);
    try {
      const result = await callJules<{ session: JulesSession; activities?: JulesActivity[] }>("create-session", {
        source: selectedSource,
        branch,
        prompt: prompt.trim(),
        title: prompt.trim().split("\n")[0].slice(0, 100),
      });
      setSession(result.session);
      setActivities(result.activities || []);
      setPrompt("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create a Jules session.");
    } finally {
      setCreating(false);
    }
  };

  const approvePlan = async () => {
    if (!session?.id) return;
    setApproving(true);
    setError(null);
    try {
      await callJules("approve-plan", { sessionId: session.id });
      await refreshSession(session.id, true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not approve the Jules plan.");
    } finally {
      setApproving(false);
    }
  };

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.id || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      await callJules("send-message", { sessionId: session.id, prompt: message.trim() });
      setMessage("");
      await refreshSession(session.id, true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send a message to Jules.");
    } finally {
      setSending(false);
    }
  };

  const startAnotherTask = () => {
    setSession(null);
    setActivities([]);
    setError(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-bg-main">
      <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-border-main/50 bg-bg-main/95 px-5 py-4 backdrop-blur-sm md:px-8">
        <button type="button" onClick={onOpenSidebar} aria-label="Open sidebar" className="-ml-2 rounded-lg p-2 text-text-muted hover:bg-black/5 hover:text-text-main lg:hidden"><Menu className="h-5 w-5" /></button>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-highlight text-accent"><Code2 className="h-5 w-5" /></span>
          <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Asynchronous coding agent</p><h1 className="truncate text-lg font-semibold text-text-main">Google Jules</h1></div>
        </div>
        <div className="flex items-center gap-2">
          {session?.url && <a href={session.url} target="_blank" rel="noopener noreferrer" className={secondaryButton}><ExternalLink className="h-3.5 w-3.5" />Open in Jules</a>}
          <button type="button" onClick={() => void (session ? refreshSession(session.id) : loadSources())} disabled={refreshing || loadingSources} className={secondaryButton}>{refreshing || loadingSources ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Refresh</button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6 md:px-8 md:py-8">
        <p className="mb-6 max-w-3xl text-sm leading-6 text-text-muted">Jules works asynchronously on a GitHub repository connected to your Jules account. Choose a repository and branch, describe a coding task, review Jules’s plan, then approve it when you are ready.</p>
        {!apiKey.trim() ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><h2 className="font-semibold">Add your Jules API key</h2><p className="mt-1 leading-6">The Jules key has not loaded. Save it in API Keys, then return here. The key is sent securely through this app’s server route and is never shown in the session view.</p><button type="button" onClick={onOpenSettings} className={`${primaryButton} mt-3`}><Settings className="h-4 w-4" />Open API Keys</button></div></div></div> : !session ? <section className="rounded-2xl border border-border-main/70 bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /><h2 className="font-semibold text-text-main">Start a coding task</h2></div>
          {loadingSources ? <p className="flex items-center gap-2 py-3 text-sm text-text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading repositories connected to Jules…</p> : sources.length === 0 ? <div className="rounded-xl border border-dashed border-border-main/70 bg-bg-main p-4 text-sm leading-6 text-text-muted">No Jules repositories found. Connect a GitHub repository in Jules first, then refresh this list.</div> : <form onSubmit={(event) => void createSession(event)} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs font-medium text-text-muted">GitHub repository<div className="relative mt-1.5"><select value={selectedSource} onChange={(event) => { selectedSourceRef.current = event.target.value; setSelectedSource(event.target.value); const source = sources.find((item) => item.name === event.target.value); setBranch(source?.githubRepo?.defaultBranch?.displayName || source?.githubRepo?.branches?.[0]?.displayName || "main"); }} className={selectClass}>{sources.map((source) => <option key={source.name} value={source.name}>{source.githubRepo?.owner && source.githubRepo?.repo ? `${source.githubRepo.owner}/${source.githubRepo.repo}` : source.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-text-muted" /></div></label>
              <label className="block text-xs font-medium text-text-muted">Starting branch<div className="relative mt-1.5"><select value={branch} onChange={(event) => setBranch(event.target.value)} className={selectClass}>{branches.length ? branches.map((name) => <option key={name} value={name}>{name}</option>) : <option value="main">main</option>}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-text-muted" /></div></label>
            </div>
            <label className="block text-xs font-medium text-text-muted">What should Jules change?<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={20_000} rows={5} required placeholder="Example: Review the authentication flow, fix the expired-session bug, and add tests. Preserve existing behavior outside this issue." className={`${selectClass} mt-1.5 resize-y`} /></label>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-main/50 pt-4"><span className="flex items-center gap-1.5 text-[11px] text-text-muted"><ShieldCheck className="h-3.5 w-3.5 text-accent" />Jules plans require your approval before execution.</span><button type="submit" disabled={creating || !selectedSource || !branch || !prompt.trim()} className={primaryButton}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}Start with Jules</button></div>
          </form>}
        </section> : <SessionPanel session={session} activities={activities} message={message} onMessageChange={setMessage} sending={sending} approving={approving} onApprove={() => void approvePlan()} onSend={(event) => void sendMessage(event)} onNewTask={startAnotherTask} />}
        {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
        <p className="mt-6 text-[11px] leading-5 text-text-muted">Google Jules is a separate asynchronous coding service. Its account must have access to the selected repository; this app does not upload local Documents to Jules.</p>
      </main>
    </div>
  );
}

function SessionPanel({ session, activities, message, onMessageChange, sending, approving, onApprove, onSend, onNewTask }: { session: JulesSession; activities: JulesActivity[]; message: string; onMessageChange: (value: string) => void; sending: boolean; approving: boolean; onApprove: () => void; onSend: (event: React.FormEvent<HTMLFormElement>) => void; onNewTask: () => void }) {
  const needsApproval = session.state === "AWAITING_PLAN_APPROVAL";
  const active = ACTIVE_STATES.has(session.state);
  const stateLabel = session.state.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
  const outputPullRequests = session.outputs?.flatMap((output) => output.pullRequest ? [output.pullRequest] : []) || [];
  return <div className="space-y-4">
    <section className="rounded-2xl border border-border-main/70 bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Jules session</p><h2 className="mt-1 text-lg font-semibold text-text-main">{session.title || "Coding task"}</h2><p className="mt-1 text-sm leading-6 text-text-muted">{session.prompt}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${needsApproval ? "bg-amber-100 text-amber-900" : session.state === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : session.state === "FAILED" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>{stateLabel}</span></div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border-main/50 pt-3">
        {session.url && <a href={session.url} target="_blank" rel="noopener noreferrer" className={secondaryButton}>View session <ArrowUpRight className="h-3.5 w-3.5" /></a>}
        {needsApproval && <button type="button" onClick={onApprove} disabled={approving} className={primaryButton}>{approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Approve plan</button>}
        {!active && <button type="button" onClick={onNewTask} className={secondaryButton}>Start another task</button>}
      </div>
      {needsApproval && <p className="mt-3 text-xs leading-5 text-amber-900">Jules is waiting for your approval. Review the generated plan below before allowing it to proceed.</p>}
      {outputPullRequests.map((pullRequest, index) => pullRequest.url ? <a key={`${pullRequest.url}-${index}`} href={pullRequest.url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 hover:bg-emerald-100"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span><span className="font-semibold">Pull request ready</span>{pullRequest.title ? ` — ${pullRequest.title}` : ""}</span><ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0" /></a> : null)}
    </section>
    <section className="rounded-2xl border border-border-main/70 bg-surface p-5 shadow-sm"><div className="mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-accent" /><h3 className="font-semibold text-text-main">Plan and activity</h3></div>{activities.length ? <div className="space-y-3">{activities.slice().reverse().map((activity, index) => <article key={activity.id || index} className="border-l-2 border-border-main/70 pl-3"><p className="text-xs font-semibold text-text-main">{activity.progress?.title || activity.description || (activity.planSteps ? "Plan generated" : "Jules update")}</p>{activity.planSteps && <ol className="mt-2 space-y-2">{activity.planSteps.map((step, stepIndex) => <li key={`${step.title}-${stepIndex}`} className="rounded-lg bg-bg-main p-2.5"><span className="text-xs font-semibold text-text-main">{stepIndex + 1}. {step.title}</span>{step.description && <p className="mt-1 text-xs leading-5 text-text-muted">{step.description}</p>}</li>)}</ol>}{activity.progress?.description && <p className="mt-1 text-xs leading-5 text-text-muted">{activity.progress.description}</p>}{activity.agentMessage && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-text-main">{activity.agentMessage}</p>}{activity.failureReason && <p role="alert" className="mt-1 text-sm text-red-700">{activity.failureReason}</p>}<p className="mt-1 text-[10px] text-text-muted">{activity.originator}{activity.createTime ? ` · ${new Date(activity.createTime).toLocaleString()}` : ""}</p></article>)}</div> : <p className="rounded-lg bg-bg-main px-3 py-4 text-sm text-text-muted">Jules is working. Activity and plan details will appear here when available.</p>}</section>
    {active && <form onSubmit={onSend} className="rounded-2xl border border-border-main/70 bg-surface p-4 shadow-sm"><label htmlFor="jules-followup" className="mb-2 block text-xs font-semibold text-text-main">Send instructions or feedback</label><div className="flex gap-2"><input id="jules-followup" value={message} onChange={(event) => onMessageChange(event.target.value)} maxLength={20_000} placeholder="Add a requirement or answer Jules…" className={selectClass} /><button type="submit" disabled={sending || !message.trim()} aria-label="Send Jules message" className={primaryButton}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send</button></div></form>}
  </div>;
}

const selectClass = "w-full rounded-lg border border-border-main/70 bg-bg-main px-3 py-2.5 text-sm text-text-main outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10";
const primaryButton = "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-sidebar-cocoa px-3.5 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
const secondaryButton = "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border-main/70 bg-surface px-3 py-2 text-xs font-semibold text-text-main hover:border-accent/40 hover:bg-cream-highlight hover:text-accent";
