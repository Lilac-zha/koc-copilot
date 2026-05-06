import { create } from "zustand";

export interface PersonaSeed {
  user_id: string;
  version: number;
  niche: string;
  tone: string;
  values: string[];
  target_audience: string;
  content_strengths: string[];
  language_patterns: string[];
  platform: string;
  growth_stage: "growth" | "plateau" | "declining";
  trust_score: number;
  commercial_ratio: number;
  evergreen_ratio: number;
  follower_count: number;
  avg_engagement_rate: number;
  analysis_summary?: string;
}

interface PersonaStore {
  persona: PersonaSeed | null;
  isOnboarded: boolean;
  setPersona: (p: PersonaSeed) => void;
  setOnboarded: (v: boolean) => void;
  reset: () => void;
}

export const usePersonaStore = create<PersonaStore>((set) => ({
  persona: null,
  isOnboarded: false,
  setPersona: (persona) => set({ persona, isOnboarded: true }),
  setOnboarded: (isOnboarded) => set({ isOnboarded }),
  reset: () => set({ persona: null, isOnboarded: false }),
}));
