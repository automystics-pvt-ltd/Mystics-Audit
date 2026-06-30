import { createContext, useContext, useState, useEffect } from "react";

export interface FYOption {
  label: string;
  value: string;
  from: string;
  to: string;
}

export const FY_OPTIONS: FYOption[] = [
  { label: "FY 2022-23", value: "2022-23", from: "2022-04-01", to: "2023-03-31" },
  { label: "FY 2023-24", value: "2023-24", from: "2023-04-01", to: "2024-03-31" },
  { label: "FY 2024-25", value: "2024-25", from: "2024-04-01", to: "2025-03-31" },
  { label: "FY 2025-26", value: "2025-26", from: "2025-04-01", to: "2026-03-31" },
];

interface FYContextValue {
  fy: FYOption;
  setFY: (fy: FYOption) => void;
  options: FYOption[];
}

const FYContext = createContext<FYContextValue | null>(null);

const STORAGE_KEY = "mystics_selected_fy";
const DEFAULT_FY = FY_OPTIONS[2];

export function FYProvider({ children }: { children: React.ReactNode }) {
  const [fy, setFYState] = useState<FYOption>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const found = FY_OPTIONS.find(o => o.value === stored);
        if (found) return found;
      }
    } catch {}
    return DEFAULT_FY;
  });

  const setFY = (option: FYOption) => {
    setFYState(option);
    try { localStorage.setItem(STORAGE_KEY, option.value); } catch {}
  };

  return (
    <FYContext.Provider value={{ fy, setFY, options: FY_OPTIONS }}>
      {children}
    </FYContext.Provider>
  );
}

export function useFY() {
  const ctx = useContext(FYContext);
  if (!ctx) throw new Error("useFY must be used inside FYProvider");
  return ctx;
}
