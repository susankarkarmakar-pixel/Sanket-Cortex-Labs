"use client";

import { useCallback, useEffect, useState } from "react";
import { AppSettings, getAppSettings, updateAppSettings } from "@/lib/app-settings";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => getAppSettings());

  const refresh = useCallback(() => setSettings(getAppSettings()), []);
  useEffect(() => {
    window.addEventListener("app-settings-updated", refresh);
    return () => window.removeEventListener("app-settings-updated", refresh);
  }, [refresh]);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings(updateAppSettings(patch));
  }, []);

  return { settings, update };
}
