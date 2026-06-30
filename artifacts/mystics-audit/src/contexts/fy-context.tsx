import { createContext, useContext, useState } from "react";

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
  { label: "FY 2026-27", value: "2026-27", from: "2026-04-01", to: "2027-03-31" },
];

/** Returns the FYOption that contains today's date */
export function detectCurrentFY(): FYOption {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const fyStartYear = month >= 4 ? year : year - 1;
  const value = `${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
  return FY_OPTIONS.find(o => o.value === value) ?? FY_OPTIONS[FY_OPTIONS.length - 1];
}

interface FYContextValue {
  fy: FYOption;
  setFY: (fy: FYOption) => void;
  options: FYOption[];
}

const FYContext = createContext<FYContextValue | null>(null);
const STORAGE_KEY = "mystics_selected_fy";

export function FYProvider({ children }: { children: React.ReactNode }) {
  const [fy, setFYState] = useState<FYOption>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const found = FY_OPTIONS.find(o => o.value === stored);
        if (found) return found;
      }
    } catch {}
    return detectCurrentFY();
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
