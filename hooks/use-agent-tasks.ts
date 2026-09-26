"use client";

import { useCallback, useEffect, useState } from "react";
import { AgentTaskRecord, deleteAgentTaskRecord, loadAgentTaskRecords, saveAgentTaskRecord } from "@/lib/agent/task-storage";

export function useAgentTasks() {
  const [records, setRecords] = useState<AgentTaskRecord[]>(() => loadAgentTaskRecords());
  const [ready] = useState(true);

  const refresh = useCallback(() => setRecords(loadAgentTaskRecords()), []);

  useEffect(() => {
    window.addEventListener("agent-tasks-updated", refresh);
    return () => window.removeEventListener("agent-tasks-updated", refresh);
  }, [refresh]);

  const save = useCallback((record: AgentTaskRecord) => setRecords(saveAgentTaskRecord(record)), []);
  const remove = useCallback((taskId: string) => setRecords(deleteAgentTaskRecord(taskId)), []);

  return { records, ready, save, remove, refresh };
}
