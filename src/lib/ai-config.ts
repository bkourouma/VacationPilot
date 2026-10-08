import { prisma } from "@/lib/prisma";

export interface CuratedModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  badge?: string;
  isPopular?: boolean;
}

export const CURATED_MODELS: CuratedModel[] = [
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    description: "Modèle polyvalent très performant, ultra économique et particulièrement précis pour l'extraction de syllabus.",
    badge: "Recommandé",
    isPopular: true,
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    description: "Modèle de raisonnement avancé pour les documents complexes et programmes structurés denses.",
    badge: "Raisonnement",
    isPopular: true,
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Google Gemini 2.5 Flash",
    provider: "Google",
    description: "Modèle ultra rapide de Google à très grand contexte et faible latence.",
    badge: "Ultra Rapide",
    isPopular: true,
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Google Gemini 2.5 Pro",
    provider: "Google",
    description: "Le modèle haut de gamme de Google pour une analyse sémantique exhaustive.",
    badge: "Haute Précision",
    isPopular: false,
  },
  {
    id: "anthropic/claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    description: "Excellente vitesse d'exécution et respect scrupuleux des structures JSON demandées.",
    badge: "Rapide & Fiable",
    isPopular: true,
  },
  {
    id: "anthropic/claude-3.7-sonnet",
    name: "Claude 3.7 Sonnet",
    provider: "Anthropic",
    description: "Performance d'exception pour le parsing documentaire et la rigueur d'extraction.",
    badge: "Top Qualité",
    isPopular: false,
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Modèle compact, rapide et polyvalent d'OpenAI pour les tâches quotidiennes.",
    badge: "Standard",
    isPopular: true,
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Modèle phare multimodal d'OpenAI avec un haut niveau de compréhension globale.",
    badge: "Puissant",
    isPopular: false,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Meta Llama 3.3 70B",
    provider: "Meta",
    description: "L'un des meilleurs modèles Open Source au monde pour l'instruction.",
    badge: "Open Source",
    isPopular: true,
  },
  {
    id: "mistralai/mistral-small-3",
    name: "Mistral Small 3",
    provider: "Mistral AI",
    description: "Modèle européen rapide, précis et hautement optimisé pour le français.",
    badge: "Made in France",
    isPopular: true,
  },
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B",
    provider: "Alibaba Cloud",
    description: "Puissant modèle multilingue d'Alibaba adapté aux structures académiques.",
    badge: "Multilingue",
    isPopular: false,
  },
];

export async function getAiConfig() {
  const settings = await prisma.systemSetting.findMany({
    where: {
      cle: { in: ["openrouter_api_key", "openrouter_model"] },
    },
  });

  const settingsMap = new Map(settings.map((s) => [s.cle, s.valeur]));

  const dbKey = settingsMap.get("openrouter_api_key");
  const dbModel = settingsMap.get("openrouter_model");

  const envKey = process.env.OPENROUTER_API_KEY || "";
  const envModel = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat";

  const apiKey = (dbKey && dbKey.trim().length > 0) ? dbKey.trim() : envKey.trim();
  const model = (dbModel && dbModel.trim().length > 0) ? dbModel.trim() : envModel.trim();

  const isConfiguredInEnv = envKey.trim().length > 0;
  const isConfiguredInDb = !!(dbKey && dbKey.trim().length > 0);

  return {
    apiKey,
    model: model || "deepseek/deepseek-chat",
    hasApiKey: apiKey.length > 0,
    isConfiguredInEnv,
    isConfiguredInDb,
  };
}

export async function setAiConfig({
  model,
  apiKey,
}: {
  model?: string;
  apiKey?: string;
}) {
  if (model !== undefined) {
    await prisma.systemSetting.upsert({
      where: { cle: "openrouter_model" },
      update: { valeur: model.trim() },
      create: { cle: "openrouter_model", valeur: model.trim() },
    });
  }

  if (apiKey !== undefined) {
    await prisma.systemSetting.upsert({
      where: { cle: "openrouter_api_key" },
      update: { valeur: apiKey.trim() },
      create: { cle: "openrouter_api_key", valeur: apiKey.trim() },
    });
  }

  return getAiConfig();
}

export async function callOpenRouter({
  model,
  messages,
  temperature = 0.1,
  maxTokens = 2500,
}: {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  maxTokens?: number;
}) {
  const config = await getAiConfig();
  const apiKey = config.apiKey;

  if (!apiKey) {
    throw new Error(
      "Clé API OpenRouter absente. Veuillez configurer OPENROUTER_API_KEY dans le fichier .env ou dans le menu de configuration."
    );
  }

  const appUrl = process.env.APP_URL || "http://localhost:3600";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": appUrl,
      "X-Title": "VacationPro - Gestion Presence Classe",
    },
    body: JSON.stringify({
      model: model || config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    let parsedMessage = errorText;
    try {
      const json = JSON.parse(errorText);
      parsedMessage = json.error?.message || json.message || errorText;
    } catch {
      // conserver le texte brut
    }
    throw new Error(`Erreur OpenRouter (${res.status}) : ${parsedMessage}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content || "";

  return {
    content,
    modelUsed: data.model || model,
    usage: data.usage,
  };
}
