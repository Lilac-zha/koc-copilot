import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// ─── Persona ───────────────────────────────────────────────
export const getDemo = () => api.get("/persona/demo");

export const buildFromContent = (userId: string, platform: string, samples: string[]) =>
  api.post("/persona/build/from-content", {
    user_id: userId,
    platform,
    content_samples: samples,
  });

export const buildFromQuestionnaire = (
  userId: string,
  platform: string,
  answers: Record<string, string>,
  otherInputs?: Record<string, string>,
) =>
  api.post("/persona/build/from-questionnaire", {
    user_id: userId,
    platform,
    answers,
    other_inputs: otherInputs || {},
  });

export const getPersona = (userId: string) => api.get(`/persona/${userId}`);

// ─── Topics ────────────────────────────────────────────────
export const getTopicRecommendations = (userId: string, count = 5) =>
  api.get(`/topics/recommendations/${userId}`, { params: { count } });

// ─── Content ───────────────────────────────────────────────
export const generateContent = (userId: string, topic: object, mode: string) =>
  api.post("/content/generate", { user_id: userId, topic, mode });

// ─── Analytics ─────────────────────────────────────────────
export const getAnalytics = (userId: string) => api.get(`/analytics/${userId}`);

export const updateFlywheel = (userId: string, data: object) =>
  api.post("/analytics/flywheel/update", { user_id: userId, ...data });

// ─── Matching ──────────────────────────────────────────────
export const getBrandMatches = (userId: string) => api.get(`/matching/brands/${userId}`);

export const analyzeTopic = (userId: string, topic: object, mode = "light") =>
  api.post("/content/analyze-topic", { user_id: userId, topic, mode });

// ─── Content Refine ────────────────────────────────────────
export const refineContent = (
  userId: string,
  topic: string,
  previousResult: object,
  userInstruction: string,
  originalMode: string,
) =>
  api.post("/content/refine", {
    user_id: userId,
    topic,
    previous_result: previousResult,
    user_instruction: userInstruction,
    original_mode: originalMode,
  });

// ─── Advisor ───────────────────────────────────────────────
export const advisorChat = (message: string, history: object[], persona: object) =>
  api.post("/advisor/chat", { message, conversation_history: history, persona });

export const getAdvisorBubbles = () => api.get("/advisor/start-bubbles");
