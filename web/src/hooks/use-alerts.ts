"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertConfig } from "@/lib/types";
import {
  fetchAlertConfigs,
  saveAlertConfig,
  deleteAlertConfig,
  toggleAlertActive,
} from "@/lib/data";

interface UseAlertsReturn {
  alerts: AlertConfig[];
  loading: boolean;
  editing: Partial<AlertConfig> | null;
  startCreate: () => void;
  startEdit: (alert: AlertConfig) => void;
  cancelEdit: () => void;
  setEditing: (alert: Partial<AlertConfig> | null) => void;
  save: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggleActive: (alert: AlertConfig) => Promise<void>;
}

const NEW_ALERT_DEFAULTS: Partial<AlertConfig> = {
  name: "",
  max_price_per_sqm: 7500,
  min_score: 40,
  min_surface: 20,
  max_price: null,
  arrondissements: [],
  phone_number: "",
  is_active: true,
};

export function useAlerts(): UseAlertsReturn {
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<AlertConfig> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAlertConfigs();
      setAlerts(data);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startCreate = useCallback(() => {
    setEditing({ ...NEW_ALERT_DEFAULTS });
  }, []);

  const startEdit = useCallback((alert: AlertConfig) => {
    setEditing(alert);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditing(null);
  }, []);

  const save = useCallback(async () => {
    if (!editing) return;
    await saveAlertConfig(editing);
    setEditing(null);
    await load();
  }, [editing, load]);

  const remove = useCallback(async (id: string) => {
    await deleteAlertConfig(id);
    await load();
  }, [load]);

  const toggleActive = useCallback(async (alert: AlertConfig) => {
    await toggleAlertActive(alert);
    await load();
  }, [load]);

  return {
    alerts,
    loading,
    editing,
    startCreate,
    startEdit,
    cancelEdit,
    setEditing,
    save,
    remove,
    toggleActive,
  };
}
