/* ── SaaS Plan Definitions ─────────────────────────────── */
export const ALL_MODULES = [
  "dashboard","accounts","invoicing","gst","receivables","payables",
  "bank","expenses","purchases","inventory","reports","audit",
  "budgets","users","settings",
] as const;

export type ModuleKey = typeof ALL_MODULES[number];

export const PLAN_DEFS: Record<string, {
  name: string; price: number; annualPrice: number;
  maxUsers: number; maxStorage: number;
  modules: ModuleKey[]; support: string; features: string[];
}> = {
  trial: {
    name: "Free Trial", price: 0, annualPrice: 0,
    maxUsers: 5, maxStorage: 1024,
    modules: ["dashboard","invoicing","gst","bank","reports"],
    support: "Email",
    features: ["14-day trial","Basic modules","Email support","Up to 5 users"],
  },
  starter: {
    name: "Starter", price: 2999, annualPrice: 29999,
    maxUsers: 10, maxStorage: 5120,
    modules: ["dashboard","accounts","invoicing","gst","receivables","payables","bank","reports","users","settings"],
    support: "Email",
    features: ["All Starter modules","10 users","5 GB storage","Email support","GST filing"],
  },
  growth: {
    name: "Growth", price: 7999, annualPrice: 79999,
    maxUsers: 25, maxStorage: 20480,
    modules: ["dashboard","accounts","invoicing","gst","receivables","payables","bank","expenses","purchases","inventory","reports","users","settings"],
    support: "Chat + Email",
    features: ["All Growth modules","25 users","20 GB storage","Priority support","Inventory & expenses"],
  },
  professional: {
    name: "Professional", price: 14999, annualPrice: 149999,
    maxUsers: 50, maxStorage: 51200,
    modules: ALL_MODULES as unknown as ModuleKey[],
    support: "Phone + Chat + Email",
    features: ["All 15 modules","50 users","50 GB storage","Dedicated support","Audit trail","Budget management"],
  },
  enterprise: {
    name: "Enterprise", price: 49999, annualPrice: 499999,
    maxUsers: 500, maxStorage: 512000,
    modules: ALL_MODULES as unknown as ModuleKey[],
    support: "24/7 Dedicated",
    features: ["All 15 modules","500 users","500 GB storage","24/7 SLA support","Custom modules","Onboarding & training","GSTIN API integration"],
  },
};

export function genTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  let p = "";
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

export function genInviteToken(): string {
  return Array.from({length:32}, () => Math.random().toString(36)[2]).join("");
}
