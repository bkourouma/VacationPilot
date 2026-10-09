"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Form, Input, Segmented } from "antd";
import GoogleOAuthCard from "./_components/GoogleOAuthCard";
import {
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Key,
  Zap,
  ShieldCheck,
  Check,
  ExternalLink,
  Bot,
  Layers,
  Search,
  CircleDot,
  Save,
  X,
  Info,
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

interface ConfigFormValues {
  apiKey?: string;
  customModel?: string;
}

const ALL_PROVIDERS = "Tous";

function badgeClass(badge: string) {
  if (badge === "Recommandé") return "bg-blue-600 text-white";
  if (badge.includes("Rapide")) return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

function StepHeader({
  step,
  icon,
  title,
  description,
  action,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
          {icon}
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {step}
          </span>
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export default function ConfigPage() {
  const [form] = Form.useForm<ConfigFormValues>();
  const hasLoaded = useRef(false);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("deepseek/deepseek-chat");
  const [customModelInput, setCustomModelInput] = useState<string>("");
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>("");

  const [search, setSearch] = useState<string>("");
  const [providerFilter, setProviderFilter] = useState<string>(ALL_PROVIDERS);

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
      const res = await fetch("/api/config/ai");
      if (!res.ok) throw new Error("Erreur de chargement");
      const data: ConfigResponse = await res.json();
      setConfig(data);
      setSelectedModel(data.model);

      const isKnown = data.availableModels.some((m) => m.id === data.model);
      setIsCustomModel(!isKnown);
      setCustomModelInput(isKnown ? "" : data.model);

      // Rechargement après enregistrement : le formulaire est déjà monté
      if (hasLoaded.current) {
        form.setFieldsValue({ apiKey: "", customModel: isKnown ? "" : data.model });
      }
    } catch {
      setNotification({
        type: "error",
        message: "Impossible de charger la configuration IA.",
      });
    } finally {
      hasLoaded.current = true;
      setLoading(false);
    }
  };

  // Le formulaire n'est monté qu'une fois le premier chargement terminé : on y recopie alors les valeurs
  useEffect(() => {
    if (!loading) {
      form.setFieldsValue({ apiKey: apiKeyInput, customModel: customModelInput });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const providers = useMemo(
    () => [ALL_PROVIDERS, ...Array.from(new Set(config?.availableModels.map((m) => m.provider) ?? []))],
    [config]
  );

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (config?.availableModels ?? []).filter((m) => {
      if (providerFilter !== ALL_PROVIDERS && m.provider !== providerFilter) return false;
      if (!q) return true;
      return [m.name, m.id, m.provider, m.description].some((t) => t.toLowerCase().includes(q));
    });
  }, [config, search, providerFilter]);

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
    try {
      await form.validateFields(["customModel"]);
    } catch {
      return;
    }
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
          message: `Modèle « ${data.modelUsed} » — latence : ${data.latencyMs} ms`,
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

  const handleSave = async () => {
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
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-36 rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="space-y-6">
            <div className="h-48 rounded-2xl bg-white border border-slate-200" />
            <div className="h-96 rounded-2xl bg-white border border-slate-200" />
          </div>
          <div className="h-80 rounded-2xl bg-white border border-slate-200" />
        </div>
      </div>
    );
  }

  const activeModel = isCustomModel ? customModelInput.trim() : selectedModel;
  const hasNewKey = apiKeyInput.trim().length > 0;
  const isDirty = !!config && (activeModel !== config.model || hasNewKey);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Notifications */}
      {notification && (
        <div
          role="status"
          className={`fixed top-20 right-4 sm:right-8 z-[60] max-w-sm w-[calc(100%-2rem)] p-4 rounded-xl border text-xs font-semibold flex items-start justify-between gap-3 shadow-lg ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-start gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-px" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-px" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            aria-label="Fermer"
            className="opacity-60 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* En-tête */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 sm:p-8 text-white shadow-sm">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 backdrop-blur">
              <Sliders className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Configuration IA &amp; OpenRouter
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                Connectez OpenRouter et choisissez le modèle d&apos;intelligence artificielle utilisé
                pour l&apos;extraction automatique des chapitres et des syllabi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-col md:items-end gap-2 shrink-0">
            {config?.hasApiKey ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/15 border border-emerald-300/30 text-emerald-200 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                OpenRouter connecté
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Clé API non configurée
              </span>
            )}
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-slate-200 text-[11px] font-mono max-w-full">
              <Bot className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              <span className="truncate">{config?.model ?? "—"}</span>
            </span>
          </div>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleSave}
        onValuesChange={(changed: ConfigFormValues) => {
          if (changed.apiKey !== undefined) setApiKeyInput(changed.apiKey);
        }}
        initialValues={{ apiKey: "", customModel: "" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          {/* Colonne principale */}
          <div className="space-y-6 min-w-0">
            {/* Étape 1 : Clé API */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <StepHeader
                step={1}
                icon={<Key className="w-5 h-5" />}
                title="Clé API OpenRouter"
                description="Authentifie l'application auprès du service d'IA."
                action={
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 shrink-0"
                  >
                    Obtenir une clé
                    <ExternalLink className="w-3 h-3" />
                  </a>
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <span className="block text-xs font-bold text-slate-700 mb-1.5">
                    Statut actuel de la clé
                  </span>
                  {config?.isConfiguredInEnv ? (
                    <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        Clé définie dans le fichier{" "}
                        <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[11px]">
                          .env
                        </code>{" "}
                        (<span className="text-emerald-700 font-bold">OPENROUTER_API_KEY</span>)
                      </span>
                    </div>
                  ) : config?.isConfiguredInDb ? (
                    <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>Clé enregistrée en base de données locale</span>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        Aucune clé configurée. L&apos;application utilisera un analyseur heuristique
                        local en secours.
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <Form.Item
                    className="!mb-1.5"
                    label={
                      <span className="text-xs font-bold text-slate-700">
                        Définir ou remplacer la clé
                      </span>
                    }
                    name="apiKey"
                    rules={[{ pattern: /^\S*$/, message: "La clé ne doit pas contenir d'espaces." }]}
                  >
                    <Input.Password
                      size="large"
                      prefix={<Key className="w-4 h-4 text-slate-400" />}
                      placeholder={config?.hasApiKey ? "••••••••••••••••••••••••••••" : "sk-or-v1-..."}
                      autoComplete="new-password"
                      className="!font-mono !text-xs"
                    />
                  </Form.Item>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Renseignez-la ici ou ajoutez{" "}
                    <code className="font-mono">OPENROUTER_API_KEY=...</code> dans{" "}
                    <code className="font-mono">.env</code>.
                  </p>
                </div>
              </div>
            </section>

            {/* Étape 2 : Modèle */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <StepHeader
                step={2}
                icon={<Bot className="w-5 h-5" />}
                title="Modèle d'intelligence artificielle"
                description="Choisissez un modèle recommandé ou saisissez un identifiant OpenRouter."
              />

              {/* Recherche + filtre par fournisseur */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
                <Input
                  aria-label="Rechercher un modèle"
                  allowClear
                  prefix={<Search className="w-4 h-4 text-slate-400" />}
                  placeholder="Rechercher un modèle…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="lg:max-w-xs"
                />
                <div className="overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <Segmented
                    options={providers}
                    value={providerFilter}
                    onChange={(v) => setProviderFilter(String(v))}
                  />
                </div>
              </div>

              {/* Grille des modèles */}
              {filteredModels.length > 0 ? (
                <div
                  role="radiogroup"
                  aria-label="Modèles recommandés"
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
                >
                  {filteredModels.map((m) => {
                    const isSelected = !isCustomModel && selectedModel === m.id;
                    const isCurrent = config?.model === m.id;

                    return (
                      <div
                        key={m.id}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => handleSelectPredefinedModel(m.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSelectPredefinedModel(m.id);
                          }
                        }}
                        className={`group p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          isSelected
                            ? "bg-blue-50/70 border-blue-500 shadow-sm ring-2 ring-blue-500/15"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm hover:-translate-y-px"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                {m.provider}
                              </span>
                              <h3 className="font-bold text-sm text-slate-900 leading-tight">
                                {m.name}
                              </h3>
                            </div>
                            {m.badge && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badgeClass(
                                  m.badge
                                )}`}
                              >
                                {m.badge}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">
                            {m.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                          <span className="truncate text-[11px] font-mono text-slate-500">
                            {m.id}
                          </span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            {isCurrent && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-px">
                                Actif
                              </span>
                            )}
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                                isSelected
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-300 text-transparent group-hover:border-slate-400"
                              }`}
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  Aucun modèle ne correspond à votre recherche.
                </div>
              )}

              {/* Modèle personnalisé */}
              <div
                onClick={handleSelectCustomModel}
                className={`mt-4 p-4 rounded-xl border transition cursor-pointer ${
                  isCustomModel
                    ? "bg-indigo-50/60 border-indigo-500 ring-2 ring-indigo-500/15"
                    : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Autre modèle personnalisé
                    </span>
                    {isCustomModel && (
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Ex : <code className="font-mono">qwen/qwen-2.5-coder-32b-instruct</code>
                  </span>
                </div>

                <Form.Item className="!mb-0" name="customModel" rules={[
                  {
                    validator: async (_, value?: string) => {
                      const v = (value ?? "").trim();
                      if (!isCustomModel && !v) return;
                      if (!v) throw new Error("Saisissez un identifiant de modèle.");
                      if (!/^[\w.-]+\/[\w.:-]+$/.test(v))
                        throw new Error(
                          "Format attendu : fournisseur/modèle (ex : deepseek/deepseek-chat)."
                        );
                    },
                  },
                ]}>
                  <Input
                    aria-label="Identifiant du modèle personnalisé"
                    size="large"
                    prefix={<Layers className="w-4 h-4 text-slate-400" />}
                    placeholder="ex: deepseek/deepseek-chat, google/gemini-2.0-flash-thinking-exp:free"
                    onFocus={() => setIsCustomModel(true)}
                    onChange={(e) => {
                      setCustomModelInput(e.target.value);
                      setIsCustomModel(true);
                      setSelectedModel(e.target.value);
                      setTestResult(null);
                    }}
                    allowClear
                    className="!font-mono !text-xs"
                  />
                </Form.Item>
              </div>
            </section>
          </div>

          {/* Panneau récapitulatif (toujours visible) */}
          <aside className="lg:sticky lg:top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Récapitulatif</h2>
                {isDirty ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    <CircleDot className="w-3 h-3" />
                    Non enregistré
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                    <Check className="w-3 h-3" />À jour
                  </span>
                )}
              </div>

              <dl className="px-5 py-4 space-y-4 text-xs">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Clé API
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-semibold text-slate-800">
                    {hasNewKey ? (
                      <>
                        <Key className="w-3.5 h-3.5 text-blue-600" />
                        Nouvelle clé à enregistrer
                      </>
                    ) : config?.hasApiKey ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {config.isConfiguredInEnv ? "Fichier .env" : "Base de données"}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        Non configurée
                      </>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Modèle sélectionné
                  </dt>
                  <dd className="mt-1">
                    <span className="inline-block max-w-full truncate px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-mono text-[11px] font-bold">
                      {activeModel || "Non défini"}
                    </span>
                  </dd>
                </div>
              </dl>

              <div className="px-5 pb-5 space-y-3">
                <Button
                  block
                  size="large"
                  loading={testing}
                  disabled={!activeModel}
                  onClick={handleTestConnection}
                  icon={!testing ? <Sparkles className="w-4 h-4 text-amber-500" /> : undefined}
                  className="!text-xs !font-bold"
                >
                  {testing ? "Test en cours..." : "Tester la connexion"}
                </Button>

                {testResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      testResult.success
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                        : "bg-rose-50 text-rose-900 border-rose-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-px" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-px" />
                      )}
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-bold">
                          {testResult.success ? "Connexion réussie" : "Échec du test"}
                        </p>
                        <p className="break-words">{testResult.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={saving}
                  disabled={!isDirty}
                  icon={!saving ? <Save className="w-4 h-4" /> : undefined}
                  className="!text-xs !font-bold"
                >
                  {saving ? "Enregistrement..." : "Enregistrer la configuration"}
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 leading-relaxed">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-px" />
              <span>
                <Zap className="inline w-3 h-3 text-amber-500 -mt-0.5 mr-1" />
                Testez la connexion avant d&apos;enregistrer : le test vérifie que le modèle répond
                via votre clé OpenRouter.
              </span>
            </div>
          </aside>
        </div>
      </Form>

      <GoogleOAuthCard />
    </div>
  );
}
