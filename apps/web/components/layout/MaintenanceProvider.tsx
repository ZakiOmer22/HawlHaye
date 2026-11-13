"use client";

import { useEffect, useState, useCallback } from "react";
import { MaintenanceScreen } from "./MaintenanceScreen";

interface Branding {
  logoUrl?: string | null;
  primaryColor?: string | null;
  universityName?: string;
}

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [branding, setBranding] = useState<Branding | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/categories");
      if (res.status !== 503) {
        setIsMaintenance(false);
      }
    } catch {
      /* ignore */
    }

    try {
      const meRes = await fetch("/api/v1/auth/me");
      if (meRes.ok) {
        const json = await meRes.json();
        if (json?.data?.branding) setBranding(json.data.branding);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const handleMaintenance = () => {
      setIsMaintenance(true);
      checkStatus();
    };

    window.addEventListener("maintenance_mode", handleMaintenance);

    let interval: NodeJS.Timeout;
    if (isMaintenance) {
      interval = setInterval(checkStatus, 5000);
    }

    return () => {
      window.removeEventListener("maintenance_mode", handleMaintenance);
      if (interval) clearInterval(interval);
    };
  }, [isMaintenance, checkStatus]);

  if (isMaintenance) {
    return <MaintenanceScreen branding={branding} onRetry={checkStatus} />;
  }

  return <>{children}</>;
}
