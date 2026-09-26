"use client";

import { useCallback, useEffect, useState } from "react";
import { AgentMode, getAgentMode, MODE_UPDATED_EVENT, saveAgentMode } from "@/lib/agent/mode";

export function useAgentMode() {
  const [mode, setModeState] = useState<AgentMode>("chat");

  useEffect(() => {
    const refresh = () => setModeState(getAgentMode());
    refresh();
    window.addEventListener(MODE_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(MODE_UPDATED_EVENT, refresh);
  }, []);

  const setMode = useCallback((nextMode: AgentMode) => {
    setModeState(nextMode);
    saveAgentMode(nextMode);
  }, []);

  return { mode, setMode };
}
