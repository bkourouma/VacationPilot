"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GraduationCap,
  Users,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Lock,
  User,
  Building,
  Mail,
  X,
  TrendingUp,
  Clock,
  CalendarCheck,
  Key,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Settings,
} from "lucide-react";

interface GoogleStatus {
  configured: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  clientIdMasked: string | null;
  redirectUri: string;
  appUrl: string;
}

function SearchParamsListener({
  onUrlAlert,
  onOpenConfig,
}: {
  onUrlAlert: (alert: { type: "info" | "warning" | "error"; message: string }) => void;
  onOpenConfig: () => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("google_config_needed") === "true") {
      onUrlAlert({
        type: "warning",
        message: "Pour activer la connexion officielle Google, veuillez renseigner vos identifiants Google OAuth 2.0 ci-dessous.",
      });
      onOpenConfig();
    }
    const err = searchParams.get("error");
    if (err) {
      if (err === "google_cancelled") {
        onUrlAlert({ type: "warning", message: "La connexion Google a été annulée." });
      } else if (err === "session_expiree") {
        onUrlAlert({ type: "warning", message: "La session d'authentification Google a expiré. Veuillez réessayer." });
      } else if (err === "echange_token_echoue") {
        onUrlAlert({ type: "error", message: "Erreur lors de la validation des jetons Google. Vérifiez votre Client Secret." });
      } else if (err === "email_introuvable") {
        onUrlAlert({ type: "error", message: "Votre compte Google n'a pas transmis d'adresse email valide." });
      } else {
        onUrlAlert({ type: "error", message: `Erreur d'authentification Google (${err}).` });
      }
    }
  }, [searchParams, onUrlAlert, onOpenConfig]);

  return null;
}

export default function HomePage() {
  const router = useRouter();

  // État Espace Étudiant
  const [matricule, setMatricule] = useState("");
  const [matriculeError, setMatriculeError] = useState("");
  const [isCheckingMatricule, setIsCheckingMatricule] = useState(false);

  // État Espace Staff (Enseignant / Admin / Chef)
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Statut Google OAuth
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleModalTab, setGoogleModalTab] = useState<"oauth" | "direct">("oauth");

  // Formulaire Configuration Google OAuth
  const [googleClientIdInput, setGoogleClientIdInput] = useState("");
  const [googleClientSecretInput, setGoogleClientSecretInput] = useState("");
  const [isConfiguringGoogle, setIsConfiguringGoogle] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);

  // Formulaire Connexion Directe Gmail Enseignant
  const [gmailEmail, setGmailEmail] = useState("");
  const [gmailNom, setGmailNom] = useState("");
  const [gmailError, setGmailError] = useState("");
  const [isGmailLoading, setIsGmailLoading] = useState(false);

  // Bannière d'alerte URL
  const [urlAlert, setUrlAlert] = useState<{ type: "info" | "warning" | "error"; message: string } | null>(null);

  // Vérification de la configuration Google OAuth au chargement
  const loadGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/google/status");
      if (res.ok) {
        const data = await res.json();
        setGoogleStatus(data);
      }
    } catch (e) {
      console.error("Erreur statut Google:", e);
    }
  }, []);

  useEffect(() => {
    loadGoogleStatus();
  }, [loadGoogleStatus]);

  const handleStudentSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricule.trim()) {
      setMatriculeError("Veuillez saisir votre numéro de matricule.");
      return;
    }
    setMatriculeError("");
    setIsCheckingMatricule(true);

    try {
      const res = await fetch(`/api/etudiants/${matricule.trim()}`);
      if (!res.ok) {
        const data = await res.json();
        setMatriculeError(data.error || "Matricule non trouvé dans la base.");
        setIsCheckingMatricule(false);
        return;
      }
      router.push(`/etudiant/${matricule.trim()}`);
    } catch {
      setMatriculeError("Erreur de connexion au serveur.");
      setIsCheckingMatricule(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Identifiants invalides.");
        setIsLoggingIn(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setLoginError("Erreur réseau lors de la connexion.");
      setIsLoggingIn(false);
    }
  };

  // Clic sur "Continuer avec Google"
  const handleGoogleClick = () => {
    if (googleStatus?.configured) {
      // Redirection immédiate vers le serveur OAuth Google
      window.location.href = "/api/auth/google";
    } else {
      // Ouvre la boîte de dialogue de configuration / connexion
      setGoogleModalTab("oauth");
      setShowGoogleModal(true);
    }
  };

  // Sauvegarde des identifiants Google OAuth
  const handleSaveGoogleConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleClientIdInput.trim() || !googleClientSecretInput.trim()) {
      setConfigMessage({ type: "error", text: "Veuillez renseigner le Client ID et le Client Secret." });
      return;
    }

    setIsConfiguringGoogle(true);
    setConfigMessage(null);

    try {
      const res = await fetch("/api/auth/google/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: googleClientIdInput.trim(),
          clientSecret: googleClientSecretInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setConfigMessage({ type: "error", text: data.error || "Erreur de configuration." });
        setIsConfiguringGoogle(false);
        return;
      }

      await loadGoogleStatus();
      setConfigMessage({
        type: "success",
        text: "Configuration Google enregistrée ! Redirection vers Google...",
      });

      // Lancement automatique du flux Google OAuth après 1 seconde
      setTimeout(() => {
        window.location.href = "/api/auth/google";
      }, 1200);
    } catch {
      setConfigMessage({ type: "error", text: "Erreur réseau lors de l'enregistrement." });
      setIsConfiguringGoogle(false);
    }
  };

  // Copie de l'URI de redirection
  const handleCopyRedirectUri = () => {
    const uri = googleStatus?.redirectUri || `${window.location.origin}/api/auth/google/callback`;
    navigator.clipboard.writeText(uri);
    setCopiedRedirectUri(true);
    setTimeout(() => setCopiedRedirectUri(false), 2000);
  };

  // Connexion directe Enseignant Gmail
  const handleGmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailEmail.trim()) {
      setGmailError("Veuillez saisir votre adresse Gmail.");
      return;
    }
    setGmailError("");
    setIsGmailLoading(true);

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: gmailEmail.trim(),
          nom: gmailNom.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGmailError(data.error || "Erreur lors de la connexion.");
        setIsGmailLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setGmailError("Erreur réseau lors de la connexion.");
      setIsGmailLoading(false);
    }
  };

  const sampleMatricules = ["33021", "32260", "33055", "33592", "32197"];

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-slate-100 to-slate-200">
      <Suspense fallback={null}>
        <SearchParamsListener
          onUrlAlert={setUrlAlert}
          onOpenConfig={() => setShowGoogleModal(true)}
        />
      </Suspense>

      {/* Barre de navigation */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                VacationPro
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Gestion Pédagogique &bull; Présences, Notes & Progression
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <Building className="w-3.5 h-3.5" /> Multi-Enseignants & Direction
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3.5 h-3.5" /> Année 2025-2026
            </span>
          </div>
        </div>
      </header>

      {/* Section Héro */}
      <main className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Suivi des présences, notes & volumes horaires
          </h2>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Plateforme complète pour les enseignants, la direction pédagogique, les chefs de classe et les étudiants.
            Émargement par séance, barèmes pondérés et tableau de bord consolidé de la progression.
          </p>
        </div>

        {/* Alerte éventuelle issue d'une redirection OAuth */}
        {urlAlert && (
          <div
            className={`max-w-3xl mx-auto mb-8 p-4 rounded-xl border flex items-start justify-between gap-3 animate-in fade-in duration-200 ${
              urlAlert.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : urlAlert.type === "warning"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium">{urlAlert.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setUrlAlert(null)}
              className="p-1 rounded-md hover:bg-black/5 text-current"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Double grille d'accès */}
        <div className="grid md:grid-cols-12 gap-8 items-start">
          {/* Espace Étudiant */}
          <div className="md:col-span-6 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 p-6 sm:p-8">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Espace Étudiant / Élève
                  </h3>
                  <p className="text-xs text-slate-500">
                    Accès immédiat sans mot de passe
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Libre accès
              </span>
            </div>

            <form onSubmit={handleStudentSearch} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Entrez votre numéro de matricule
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={matricule}
                    onChange={(e) => {
                      setMatricule(e.target.value);
                      setMatriculeError("");
                    }}
                    placeholder="Ex: 33021 ou 32260"
                    className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-base font-medium transition"
                  />
                  <button
                    type="submit"
                    disabled={isCheckingMatricule}
                    className="absolute right-2 top-2 bottom-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center transition disabled:opacity-50"
                    title="Rechercher"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                {matriculeError && (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {matriculeError}
                  </p>
                )}
              </div>

              {/* Suggestions rapides pour tester */}
              <div className="pt-2">
                <p className="text-xs text-slate-500 mb-2">
                  Exemples de matricules pour tester immédiatement :
                </p>
                <div className="flex flex-wrap gap-2">
                  {sampleMatricules.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMatricule(m);
                        setMatriculeError("");
                      }}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-md border border-slate-200 transition"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 mt-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ce que vous pouvez consulter :
                </h4>
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Vos notes détaillées par matière avec coefficients
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Votre moyenne générale et positionnement de classe
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Historique de présence séance par séance et taux d&apos;assiduité
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Liste et assiduité générale de la classe
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={isCheckingMatricule}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isCheckingMatricule ? (
                  "Vérification..."
                ) : (
                  <>
                    Accéder à mon espace étudiant
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Espace Professionnel (Enseignants & Administration) */}
          <div className="md:col-span-6 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 p-6 sm:p-8">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Espace Pédagogique & Direction
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enseignants, Administration & Chefs
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                Sécurisé
              </span>
            </div>

            {/* Bouton Principal : Google Auth */}
            <div className="mt-6 space-y-4">
              <div>
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-50 active:scale-[0.99] border-2 border-slate-200 hover:border-slate-300 rounded-xl font-bold text-slate-700 text-sm shadow-xs flex items-center justify-center gap-3 transition group relative"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>
                    {googleStatus?.configured
                      ? "Continuer avec Google (OAuth Officiel)"
                      : "Continuer avec Google / Gmail"}
                  </span>
                  {googleStatus?.configured && (
                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Actif
                    </span>
                  )}
                </button>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-1">
                  <span>Authentification des enseignants par compte Google</span>
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleModalTab("oauth");
                      setShowGoogleModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 underline underline-offset-2"
                  >
                    <Settings className="w-3 h-3" />
                    {googleStatus?.configured ? "Paramètres OAuth" : "Configuration"}
                  </button>
                </div>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-3 text-xs text-slate-400 font-medium uppercase tracking-wider">
                  ou avec identifiant
                </span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleStaffLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Identifiant ou Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ex: admin, prof ou chef"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs transition"
                    />
                  </div>
                </div>

                {loginError && (
                  <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50 text-xs"
                >
                  {isLoggingIn ? "Connexion en cours..." : "Se connecter par mot de passe"}
                </button>
              </form>

              {/* Raccourcis de connexion de démonstration */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 mt-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Comptes de test pré-configurés :
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setUsername("admin");
                      setPassword("admin123");
                      setLoginError("");
                    }}
                    className="p-2 text-left bg-white hover:border-amber-400 border border-slate-200 rounded-lg text-xs transition"
                  >
                    <span className="font-bold text-amber-700 block text-[11px]">
                      Direction
                    </span>
                    <span className="text-[9px] text-slate-500 block truncate">
                      admin / admin123
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUsername("prof");
                      setPassword("prof123");
                      setLoginError("");
                    }}
                    className="p-2 text-left bg-white hover:border-blue-400 border border-slate-200 rounded-lg text-xs transition"
                  >
                    <span className="font-bold text-blue-700 block text-[11px]">
                      Enseignant
                    </span>
                    <span className="text-[9px] text-slate-500 block truncate">
                      prof / prof123
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUsername("chef");
                      setPassword("chef123");
                      setLoginError("");
                    }}
                    className="p-2 text-left bg-white hover:border-indigo-400 border border-slate-200 rounded-lg text-xs transition"
                  >
                    <span className="font-bold text-indigo-700 block text-[11px]">
                      Chef Classe
                    </span>
                    <span className="text-[9px] text-slate-500 block truncate">
                      chef / chef123
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Complète Google Auth & Configuration */}
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Authentification Google Enseignants
                    </h3>
                    <p className="text-xs text-slate-500">
                      OAuth 2.0 officiel & Accès Enseignant Gmail
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Onglets */}
              <div className="flex border-b border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setGoogleModalTab("oauth")}
                  className={`flex-1 pb-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
                    googleModalTab === "oauth"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  Google OAuth 2.0
                  {googleStatus?.configured ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-500 ml-1"></span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setGoogleModalTab("direct")}
                  className={`flex-1 pb-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
                    googleModalTab === "direct"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Accès Direct Gmail
                </button>
              </div>

              {/* Onglet 1 : Configuration et Lancement Google OAuth 2.0 */}
              {googleModalTab === "oauth" && (
                <div className="mt-4 space-y-4">
                  {/* Statut de la configuration */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      googleStatus?.configured
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          googleStatus?.configured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                        }`}
                      />
                      <span className="font-semibold">
                        {googleStatus?.configured
                          ? `Google OAuth configuré (${googleStatus.clientIdMasked})`
                          : "Google OAuth non configuré"}
                      </span>
                    </div>
                    {googleStatus?.configured && (
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = "/api/auth/google";
                        }}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition"
                      >
                        Tester la connexion
                      </button>
                    )}
                  </div>

                  {/* Instructions Google Cloud Console */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs text-slate-600">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Comment activer la connexion Google en 3 étapes :
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
                      <li>
                        Rendez-vous sur la{" "}
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-0.5"
                        >
                          Google Cloud Console <ExternalLink className="w-3 h-3" />
                        </a>{" "}
                        et créez un <strong>ID Client OAuth 2.0</strong> (Type: <em>Application Web</em>).
                      </li>
                      <li>
                        Dans <strong>URI de redirection autorisés</strong>, renseignez l&apos;adresse exacte ci-dessous :
                      </li>
                    </ol>

                    {/* Champ de copie rapide de l'URI de redirection */}
                    <div className="mt-2 flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1.5">
                      <code className="text-[10px] text-blue-900 font-mono flex-1 truncate px-1">
                        {googleStatus?.redirectUri || "http://localhost:3600/api/auth/google/callback"}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyRedirectUri}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold flex items-center gap-1 shrink-0 transition"
                      >
                        {copiedRedirectUri ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" /> Copié !
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copier
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Formulaire de saisie du Client ID et Secret */}
                  <form onSubmit={handleSaveGoogleConfig} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Google Client ID *
                      </label>
                      <input
                        type="text"
                        value={googleClientIdInput}
                        onChange={(e) => setGoogleClientIdInput(e.target.value)}
                        placeholder="ex: 123456789-xxxx.apps.googleusercontent.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Google Client Secret *
                      </label>
                      <input
                        type="password"
                        value={googleClientSecretInput}
                        onChange={(e) => setGoogleClientSecretInput(e.target.value)}
                        placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {configMessage && (
                      <p
                        className={`text-xs p-2.5 rounded-lg border font-medium ${
                          configMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-red-50 text-red-800 border-red-200"
                        }`}
                      >
                        {configMessage.text}
                      </p>
                    )}

                    <div className="pt-2 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setGoogleModalTab("direct")}
                        className="text-xs text-slate-500 hover:text-slate-800 underline"
                      >
                        Ou accès rapide sans clés
                      </button>

                      <button
                        type="submit"
                        disabled={isConfiguringGoogle}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {isConfiguringGoogle ? "Enregistrement..." : "Enregistrer et Lancer Google"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Onglet 2 : Connexion directe Enseignant Gmail (Sans configuration) */}
              {googleModalTab === "direct" && (
                <div className="mt-4 space-y-4">
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900">
                    <p className="font-bold flex items-center gap-1.5 mb-1">
                      <Mail className="w-4 h-4 text-blue-600" /> Accès Enseignant immédiat
                    </p>
                    <p className="text-[11px] text-blue-700">
                      Vous n&apos;avez pas encore créé de projet Google Cloud ? Aucun problème : saisissez votre adresse Gmail pour accéder ou créer directement votre compte enseignant.
                    </p>
                  </div>

                  <form onSubmit={handleGmailAuth} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Adresse Gmail de l&apos;enseignant *
                      </label>
                      <input
                        type="email"
                        value={gmailEmail}
                        onChange={(e) => {
                          setGmailEmail(e.target.value);
                          setGmailError("");
                        }}
                        placeholder="exemple.professeur@gmail.com"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nom et Prénom (optionnel si compte déjà existant)
                      </label>
                      <input
                        type="text"
                        value={gmailNom}
                        onChange={(e) => setGmailNom(e.target.value)}
                        placeholder="Ex: Dr. Martin KOFFI"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Sera affiché sur vos fiches de présence, cours et notes.
                      </p>
                    </div>

                    {gmailError && (
                      <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                        {gmailError}
                      </p>
                    )}

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowGoogleModal(false)}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={isGmailLoading}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {isGmailLoading ? "Connexion..." : "Accéder à mon espace"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fonctionnalités clés */}
        <div className="mt-16 border-t border-slate-200/80 pt-10">
          <h3 className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
            Architecture multi-enseignants & supervision de direction
          </h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Console Administration</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Consolidation globale, suivi en direct de l&apos;avancement des cours et alertes automatiques sur les retards.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Volume Horaire Dédié</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Définition du volume horaire (10h, 20h, 30h, 40h...) pour chaque matière avec décompte automatique des heures réalisées.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Authentification Google</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Inscription simplifiée pour chaque enseignant avec son compte Google / Gmail pour gérer ses cours de manière indépendante.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Émargement & Assiduité</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Feuille d&apos;appel heure par heure, détection des retards et exports Excel instantanés.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
