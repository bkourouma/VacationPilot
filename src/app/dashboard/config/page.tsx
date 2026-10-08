"use client";

import { useEffect, useState } from "react";
import {
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Key,
  Cpu,
  Zap,
  ShieldCheck,
  Check,
  RefreshCw,
  ExternalLink,
  Bot,
  Layers,
} from "lucide-react";

interface CuratedModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  badge?: string;
  isPopular?: boolean;
}

interface ConfigResponse {
  model: string;
  hasApiKey: boolean;
  isConfiguredInEnv: boolean;
  isConfiguredInDb: boolean;
  availableModels: CuratedModel[];
}

export default function ConfigPage() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("deepseek/deepseek-chat");
  const [customModelInput, setCustomModelInput] = useState<string>("");
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    modelUsed?: string;
  } | null>(null);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/config/ai");
      if (!res.ok) throw new Error("Erreur de chargement");
      const data: ConfigResponse = await res.json();
      setConfig(data);
      setSelectedModel(data.model);

      const isKnown = data.availableModels.some((m) => m.id === data.model);
      if (!isKnown) {
        setIsCustomModel(true);
        setCustomModelInput(data.model);
      } else {
        setIsCustomModel(false);
        setCustomModelInput("");
      }
    } catch {
      setNotification({
        type: "error",
        message: "Impossible de charger la configuration IA.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSelectPredefinedModel = (modelId: string) => {
    setSelectedModel(modelId);
    setIsCustomModel(false);
    setTestResult(null);
  };

  const handleSelectCustomModel = () => {
    setIsCustomModel(true);
    if (customModelInput.trim()) {
      setSelectedModel(customModelInput.trim());
    }
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    const modelToTest = isCustomModel ? customModelInput.trim() : selectedModel;
    if (!modelToTest) {
      setNotification({
        type: "error",
        message: "Veuillez spécifier un identifiant de modèle à tester.",
      });
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      const res = await fetch("/api/config/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelToTest }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Connexion réussie ! Modèle utilisé : "${data.modelUsed}" — Latence : ${data.latencyMs} ms`,
          latencyMs: data.latencyMs,
          modelUsed: data.modelUsed,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Échec de connexion au service OpenRouter.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur réseau";
      setTestResult({
        success: false,
        message: `Erreur réseau lors du test : ${msg}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalModel = isCustomModel ? customModelInput.trim() : selectedModel;

    if (!finalModel) {
      setNotification({
        type: "error",
        message: "Veuillez sélectionner ou saisir un modèle valide.",
      });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/config/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: finalModel,
          apiKey: apiKeyInput.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setNotification({
          type: "success",
          message: `Modèle "${finalModel}" enregistré avec succès comme modèle par défaut !`,
        });
        setApiKeyInput("");
        await loadConfig();
      } else {
        setNotification({
          type: "error",
          message: data.error || "Erreur lors de la sauvegarde.",
        });
      }
    } catch {
      setNotification({
        type: "error",
        message: "Erreur réseau lors de la sauvegarde.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* En-tête */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Sliders className="w-7 h-7 text-blue-600" />
            Configuration IA & OpenRouter
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gérez la connexion OpenRouter et choisissez le modèle d&apos;intelligence artificielle utilisé pour l&apos;extraction automatique des chapitres et syllabi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {config?.hasApiKey ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              OpenRouter Connecté
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Clé API non configurée
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1 : État et Clé API OpenRouter */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Key className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                1. Clé API OpenRouter
              </h2>
            </div>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Obtenir une clé OpenRouter
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Statut actuel de la clé :
              </label>
              {config?.isConfiguredInEnv ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Clé configurée dans le fichier <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[11px]">.env</code> (<span className="text-emerald-700 font-bold">OPENROUTER_API_KEY</span>)
                  </span>
                </div>
              ) : config?.isConfiguredInDb ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Clé enregistrée en base de données locale</span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Aucune clé configurée. L&apos;application utilisera un analyseur heuristique local en secours.
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Définir ou remplacer la clé API :
              </label>
              <input
                type="password"
                placeholder={config?.hasApiKey ? "••••••••••••••••••••••••••••••" : "sk-or-v1-..."}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400">
                Vous pouvez soit la renseigner ici, soit l&apos;ajouter dans <code className="font-mono">.env</code> avec <code className="font-mono">OPENROUTER_API_KEY=...</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2 : Sélection du Modèle */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  2. Choix du Modèle d&apos;Intelligence Artificielle
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sélectionnez parmi les modèles recommandés ou entrez n&apos;importe quel identifiant de modèle compatible OpenRouter.
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-400 block">Modèle actuellement actif</span>
              <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-mono text-xs font-bold">
                {isCustomModel ? (customModelInput || "Non défini") : selectedModel}
              </span>
            </div>
          </div>

          {/* Grille des modèles présélectionnés */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {config?.availableModels.map((m) => {
              const isSelected = !isCustomModel && selectedModel === m.id;

              return (
                <div
                  key={m.id}
                  onClick={() => handleSelectPredefinedModel(m.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition relative flex flex-col justify-between ${
                    isSelected
                      ? "bg-blue-50/70 border-blue-500 shadow-sm ring-2 ring-blue-500/20"
                      : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          {m.provider}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 leading-tight">
                          {m.name}
                        </h3>
                      </div>
                      {m.badge && (
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                            m.badge === "Recommandé"
                              ? "bg-blue-600 text-white"
                              : m.badge.includes("Rapide")
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {m.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">
                      {m.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-500">
                    <span className="truncate max-w-[200px]">{m.id}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Option Modèle Personnalisé */}
          <div
            onClick={handleSelectCustomModel}
            className={`p-4 rounded-xl border transition cursor-pointer ${
              isCustomModel
                ? "bg-indigo-50/60 border-indigo-500 ring-2 ring-indigo-500/20"
                : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">
                  Autre modèle personnalisé (n&apos;importe quel modèle d&apos;OpenRouter)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Ex: <code className="font-mono">qwen/qwen-2.5-coder-32b-instruct</code>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="ex: deepseek/deepseek-chat, google/gemini-2.0-flash-thinking-exp:free..."
                value={customModelInput}
                onFocus={() => setIsCustomModel(true)}
                onChange={(e) => {
                  setCustomModelInput(e.target.value);
                  setIsCustomModel(true);
                  setSelectedModel(e.target.value);
                }}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3 : Test de connexion en direct */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Vérification & Test de Connectivité
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Vérifiez immédiatement que le modèle sélectionné répond correctement via votre clé OpenRouter.
              </p>
            </div>

            <button
              type="button"
              disabled={testing || (!selectedModel && !customModelInput)}
              onClick={handleTestConnection}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-xs shrink-0 cursor-pointer"
            >
              {testing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Test en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Tester la connexion avec ce modèle
                </>
              )}
            </button>
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs leading-relaxed ${
                testResult.success
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : "bg-rose-50 text-rose-900 border-rose-200"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">
                    {testResult.success ? "Test réussi avec succès !" : "Échec du test"}
                  </p>
                  <p>{testResult.message}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bouton de sauvegarde */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Enregistrer la configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
