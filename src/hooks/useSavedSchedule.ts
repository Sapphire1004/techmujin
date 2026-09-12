import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "techmujin:timetable:v3";

type StoredSchedule = {
  version: 3;
  selectedSessionIds: string[];
};

type StorageStatus = "ready" | "unavailable";

type InitialState = {
  selectedIds: string[];
  status: StorageStatus;
};

function readSchedule(): InitialState {
  if (typeof window === "undefined") {
    return { selectedIds: [], status: "ready" };
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return { selectedIds: [], status: "ready" };
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredSchedule>;
    if (parsed.version !== 3 || !Array.isArray(parsed.selectedSessionIds)) {
      return { selectedIds: [], status: "ready" };
    }

    return {
      selectedIds: parsed.selectedSessionIds.filter(
        (id): id is string => typeof id === "string",
      ),
      status: "ready",
    };
  } catch {
    return { selectedIds: [], status: "unavailable" };
  }
}

export function useSavedSchedule() {
  const [initialState] = useState(readSchedule);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialState.selectedIds);
  const [status, setStatus] = useState<StorageStatus>(initialState.status);

  useEffect(() => {
    if (status === "unavailable") {
      return;
    }

    try {
      const payload: StoredSchedule = {
        version: 3,
        selectedSessionIds: selectedIds,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      setStatus("unavailable");
    }
  }, [selectedIds, status]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      const nextState = readSchedule();
      setSelectedIds(nextState.selectedIds);
      setStatus(nextState.status);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleSession = useCallback((sessionId: string) => {
    setSelectedIds((current) =>
      current.includes(sessionId)
        ? current.filter((id) => id !== sessionId)
        : [...current, sessionId],
    );
  }, []);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return {
    selectedIds,
    selectedSet,
    storageStatus: status,
    toggleSession,
  };
}
