"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sidebar } from "@/components/sidebar/sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { ModelOption } from "@/components/sidebar/model-selector";
import { SettingsModal } from "@/components/settings/settings-modal";
import { AboutModal } from "@/components/about/about-modal";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useConversation } from "@/hooks/use-conversation";
import { useAppSettings } from "@/hooks/use-app-settings";
import { getAppSettings } from "@/lib/app-settings";
import { fileToUIPart } from "@/lib/file-attachments";
import { Message } from "@/components/chat/chat-messages";
import { getCustomProviders } from "@/lib/custom-providers";
import { useAgentMode } from "@/hooks/use-agent-mode";
import { AgentAttachment, AgentTask, ExecutionEvent } from "@/lib/agent/types";
import { createAgentTask } from "@/lib/agent/agent-state";
import { planAgentTask } from "@/lib/agent/planner";
import { executeFirstToolStep } from "@/lib/agent/executor";
import { useAgentTasks } from "@/hooks/use-agent-tasks";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(() => getAppSettings().defaultProvider as ModelOption);
  const [input, setInput] = useState("");
  const { keys, keyVersion } = useApiKeys();
  const { settings } = useAppSettings();
  const { mode, setMode } = useAgentMode();
  const [activeAgentTask, setActiveAgentTask] = useState<AgentTask | null>(null);
  const [agentExecution, setAgentExecution] = useState<{ message: string; output?: string; ok: boolean } | null>(null);
  const [executionEvents, setExecutionEvents] = useState<ExecutionEvent[]>([]);
  const { records, ready: tasksReady, save: saveAgentTask, remove: removeAgentTask } = useAgentTasks();
  const restoredTask = useRef(false);

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    body: () => ({
      provider: selectedModel,
      apiKey: keys[selectedModel] || "",
      customProvider: typeof window !== "undefined" ? getCustomProviders().find((provider) => provider.id === selectedModel) || null : null,
      keyVersion,
      language: settings.language,
      streaming: settings.streaming,
    }),
  }), [selectedModel, keyVersion, keys, settings.language, settings.streaming]);

  const useChatProps = useChat({ transport });
  const messages = useMemo(() => useChatProps.messages || [], [useChatProps.messages]);
  const setMessages = useChatProps.setMessages;
  const sendMessage = useChatProps.sendMessage;
  const regenerate = useChatProps.regenerate;
  const isLoading = useChatProps.status === "submitted" || useChatProps.status === "streaming";
  const stop = useChatProps.stop;
  const error = useChatProps.error;
  const displayMessages: Message[] = messages.map((message) => ({
    id: message.id,
    role: message.role === "system" ? "system" : message.role === "assistant" ? "assistant" : "user",
    content: getMessageText(message),
  }));

  const { currentConversationId, conversationTitle, startNewConversation, loadSavedConversation } = useConversation({
    messages: displayMessages,
    isLoading,
    autoSave: settings.autoSave,
    selectedModel,
    setMessages,
    setInput,
  });

  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsOpen(true);
    document.addEventListener("open-settings", handleOpenSettings);
    return () => {
      document.removeEventListener("open-settings", handleOpenSettings);
    };
  }, []);

  const handleLoadConversation = (id: string) => {
    const conversation = loadSavedConversation(id);
    if (conversation) setSelectedModel(conversation.model === "manus" ? "deepseek" : conversation.model as ModelOption);
  };

  const handleSend = async (event: React.FormEvent<HTMLFormElement>, files: File[]) => {
    event.preventDefault();
    const text = input.trim();
    if (!text && files.length === 0) return;
    const fileParts = await Promise.all(files.map(fileToUIPart));
    setInput("");
    await sendMessage({ text, files: fileParts });
  };
  const handleCreateAgentTask = (goal: string, attachments: AgentAttachment[]) => {
    const task = planAgentTask(createAgentTask(goal, undefined, undefined, attachments));
    setActiveAgentTask(task);
    setAgentExecution(null);
    setExecutionEvents([
      createExecutionEvent(task.id, "task-created", "Task created"),
      createExecutionEvent(task.id, "plan-created", `Plan created with ${task.steps.length} steps`),
    ]);
  };
  const handleRunAgentTask = async () => {
    if (!activeAgentTask) return;
    const step = activeAgentTask.steps.find((candidate) => candidate.status === "pending" && candidate.toolId);
    if (!step?.toolId) return;
    setExecutionEvents((events) => [...events, createExecutionEvent(activeAgentTask.id, "tool-started", `Started ${step.title}`, step.id, step.toolId)]);
    const outcome = await executeFirstToolStep(activeAgentTask);
    setActiveAgentTask(outcome.task);
    setAgentExecution({ message: outcome.message, output: outcome.output, ok: outcome.ok });
    setExecutionEvents((events) => {
      const nextEvents = [...events, createExecutionEvent(activeAgentTask.id, outcome.ok ? "tool-completed" : "tool-failed", outcome.message, step.id, step.toolId)];
      if (outcome.ok && outcome.task.status === "completed") nextEvents.push(createExecutionEvent(activeAgentTask.id, "task-completed", "Task completed"));
      if (!outcome.ok) nextEvents.push(createExecutionEvent(activeAgentTask.id, "task-failed", "Task failed"));
      return nextEvents;
    });
  };
  const handleClearAgentTask = () => {
    if (activeAgentTask) removeAgentTask(activeAgentTask.id);
    setActiveAgentTask(null);
    setAgentExecution(null);
    setExecutionEvents([]);
  };

  useEffect(() => {
    if (!tasksReady || restoredTask.current) return;
    restoredTask.current = true;
    const latest = records[0];
    if (latest) {
      // Restoring the persisted external snapshot is the purpose of this effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveAgentTask(latest.task);
      setExecutionEvents(latest.events);
    }
  }, [records, tasksReady]);

  useEffect(() => {
    if (!tasksReady || !activeAgentTask) return;
    saveAgentTask({ task: activeAgentTask, events: executionEvents, savedAt: new Date().toISOString() });
  }, [activeAgentTask, executionEvents, saveAgentTask, tasksReady]);

  return (
    <div className="flex h-screen overflow-hidden bg-brand-blue">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} selectedModel={selectedModel} onSelectModel={setSelectedModel} onNewChat={startNewConversation} onLoadConversation={handleLoadConversation} currentConversationId={currentConversationId} onOpenAbout={() => { setIsSettingsOpen(false); setIsAboutOpen(true); }} />
      <ChatArea mode={mode} onModeChange={setMode} activeAgentTask={activeAgentTask} agentExecution={agentExecution} executionEvents={executionEvents} onCreateAgentTask={handleCreateAgentTask} onRunAgentTask={handleRunAgentTask} onClearAgentTask={handleClearAgentTask} onOpenSidebar={() => setIsSidebarOpen(true)} selectedModel={selectedModel} messages={displayMessages} input={input} onInputChange={(event) => setInput(event.target.value)} onSend={handleSend} isLoading={isLoading} stop={stop} error={error} onRetry={regenerate} conversationTitle={conversationTitle} onPrompt={setInput} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}

function getMessageText(message: { parts?: Array<{ type?: string; text?: string; filename?: string }>; content?: unknown }): string {
  const text = message.parts?.filter((part) => part.type === "text").map((part) => part.text || "").join("\n") || (typeof message.content === "string" ? message.content : "");
  const files = message.parts?.filter((part) => part.type === "file").map((part) => part.filename || "Attached file") || [];
  return files.length > 0 ? `${text}${text ? "\n\n" : ""}Attachments: ${files.join(", ")}` : text;
}

function createExecutionEvent(taskId: string, type: ExecutionEvent["type"], message: string, stepId?: string, toolId?: string): ExecutionEvent {
  return { id: crypto.randomUUID(), taskId, type, message, stepId, toolId, timestamp: new Date().toISOString() };
}
