import { createContext, useContext, ReactNode } from "react";
import { useListCompanies } from "@workspace/api-client-react";

export interface CompanyProfile {
  id: number;
  legalName: string;
  tradeName?: string | null;
  pan?: string | null;
  cin?: string | null;
  gstin?: string | null;
  companyType: string;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  logoUrl?: string | null;
  fiscalYearStart: string;
  gstFilingFrequency: string;
  isActive: boolean;
}

interface CompanyContextValue {
  company: CompanyProfile | null;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextValue>({ company: null, isLoading: true });

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useListCompanies({});
  const company = (data as CompanyProfile[] | undefined)?.[0] ?? null;

  return (
    <CompanyContext.Provider value={{ company, isLoading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
