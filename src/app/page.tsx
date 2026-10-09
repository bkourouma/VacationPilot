"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Form, Input, Modal, Segmented } from "antd";
import {
  GraduationCap,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  User,
  Building,
  Mail,
  Clock,
  CalendarCheck,
  Settings,
  Hash,
  FlaskConical,
} from "lucide-react";

interface GoogleStatus {
  configured: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  clientIdMasked: string | null;
  redirectUri: string;
  appUrl: string;
}

type UrlAlert = { type: "info" | "warning" | "error"; message: string };

function SearchParamsListener({
  onUrlAlert,
  onOpenConfig,
}: {
  onUrlAlert: (alert: UrlAlert) => void;
  onOpenConfig: () => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("google_config_needed") === "true") {
      onUrlAlert({
        type: "warning",
        message:
          "Pour activer la connexion officielle Google, veuillez renseigner vos identifiants Google OAuth 2.0 ci-dessous.",
      });
      onOpenConfig();
    }
    const err = searchParams.get("error");
    if (err) {
      if (err === "google_cancelled") {
        onUrlAlert({ type: "warning", message: "La connexion Google a été annulée." });
      } else if (err === "session_expiree") {
        onUrlAlert({
          type: "warning",
          message: "La session d'authentification Google a expiré. Veuillez réessayer.",
        });
      } else if (err === "echange_token_echoue") {
        onUrlAlert({
          type: "error",
          message: "Erreur lors de la validation des jetons Google. Vérifiez votre Client Secret.",
        });
      } else if (err === "email_introuvable") {
        onUrlAlert({
          type: "error",
          message: "Votre compte Google n'a pas transmis d'adresse email valide.",
        });
      } else {
        onUrlAlert({ type: "error", message: `Erreur d'authentification Google (${err}).` });
      }
    }
  }, [searchParams, onUrlAlert, onOpenConfig]);

  return null;
}

// Raccourcis de démonstration : affichés uniquement en développement
const SHOW_DEMO = process.env.NODE_ENV !== "production";

const TEST_ACCOUNTS = [
  { label: "Direction", username: "admin", password: "admin123", tone: "text-amber-700 hover:border-amber-400" },
  { label: "Enseignant (démo)", username: "prof", password: "prof123", tone: "text-blue-700 hover:border-blue-400" },
  {
    label: "Enseignant — Dr. KONÉ",
    username: "ibrahimkoneprof",
    password: "Kone@2026",
    tone: "text-emerald-700 hover:border-emerald-400",
  },
  {
    label: "Enseignant — Mme COULIBALY",
    username: "awacoulibalyprof",
    password: "Coulibaly@2026",
    tone: "text-teal-700 hover:border-teal-400",
  },
  {
    label: "Chef de classe (démo)",
    username: "chef",
    password: "chef123",
    tone: "text-indigo-700 hover:border-indigo-400",
  },
];


const FEATURES = [
  {
    icon: Building,
    tone: "bg-amber-400/15 text-amber-300 border-amber-300/20",
    title: "Console Administration",
    text: "Consolidation globale, suivi en direct de l'avancement des cours et alertes automatiques sur les retards.",
  },
  {
    icon: Clock,
    tone: "bg-blue-400/15 text-blue-300 border-blue-300/20",
    title: "Volume horaire dédié",
    text: "Volume horaire défini pour chaque matière, avec décompte automatique des heures réalisées.",
  },
  {
    icon: Mail,
    tone: "bg-indigo-400/15 text-indigo-300 border-indigo-300/20",
    title: "Authentification Google",
    text: "Inscription simplifiée de chaque enseignant avec son compte Google pour gérer ses cours de façon indépendante.",
  },
  {
    icon: CalendarCheck,
    tone: "bg-emerald-400/15 text-emerald-300 border-emerald-300/20",
    title: "Émargement & assiduité",
    text: "Feuille d'appel heure par heure, détection des retards et exports Excel instantanés.",
  },
];

function GoogleLogo({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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
  );
}

// Année académique en cours : elle commence en septembre
function getAnneeAcademiqueCourante(): string {
  const now = new Date();
  const debut = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${debut}-${debut + 1}`;
}

const labelClass = "text-xs font-bold text-slate-700";

export default function HomePage() {
  const router = useRouter();
  const anneeCourante = getAnneeAcademiqueCourante();

  const [studentForm] = Form.useForm<{ matricule: string }>();
  const [staffForm] = Form.useForm<{ username: string; password: string }>();

  const [space, setSpace] = useState<"etudiant" | "staff">("staff");

  // La fenêtre Google (forceRender) s'insère via un portail : on ne la rend qu'après l'hydratation
  // pour éviter tout écart entre le HTML serveur et le premier rendu client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Matricules réellement présents en base, proposés en raccourci (développement uniquement)
  const [demoMatricules, setDemoMatricules] = useState<string[]>([]);
  useEffect(() => {
    if (!SHOW_DEMO) return;
    fetch("/api/etudiants/demo")
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (Array.isArray(list)) setDemoMatricules(list);
      })
      .catch(() => {});
  }, []);

  // Étudiant
  const [matriculeError, setMatriculeError] = useState("");
  const [isCheckingMatricule, setIsCheckingMatricule] = useState(false);

  // Personnel
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Google OAuth
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const [urlAlert, setUrlAlert] = useState<UrlAlert | null>(null);

  const loadGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/google/status");
      if (res.ok) setGoogleStatus(await res.json());
    } catch (e) {
      console.error("Erreur statut Google:", e);
    }
  }, []);

  useEffect(() => {
    loadGoogleStatus();
  }, [loadGoogleStatus]);

  const handleStudentSearch = async ({ matricule }: { matricule: string }) => {
    const value = matricule.trim();
    setMatriculeError("");
    setIsCheckingMatricule(true);

    try {
      const res = await fetch(`/api/etudiants/${encodeURIComponent(value)}`);
      if (!res.ok) {
        const data = await res.json();
        setMatriculeError(data.error || "Matricule non trouvé dans la base.");
        setIsCheckingMatricule(false);
        return;
      }
      router.push(`/etudiant/${encodeURIComponent(value)}`);
    } catch {
      setMatriculeError("Erreur de connexion au serveur.");
      setIsCheckingMatricule(false);
    }
  };

  const handleStaffLogin = async ({ username, password }: { username: string; password: string }) => {
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

  const openGoogleModal = () => {
    setShowGoogleModal(true);
  };

  // Navigation complète requise : /api/auth/google est une route serveur (redirection OAuth), pas une page.
  const startGoogleOAuth = () => {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/api/auth/google";
  };

  const handleGoogleClick = () => {
    if (googleStatus?.configured) {
      startGoogleOAuth();
    } else {
      openGoogleModal();
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,620px)] bg-slate-50">
      <Suspense fallback={null}>
        <SearchParamsListener onUrlAlert={setUrlAlert} onOpenConfig={() => openGoogleModal()} />
      </Suspense>

      {/* Panneau de marque */}
      <aside className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white px-6 sm:px-10 py-8 lg:py-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/40">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight leading-none">VacationPro</p>
            <p className="text-[11px] text-slate-300 mt-1">Gestion pédagogique</p>
          </div>
          <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" /> Année {anneeCourante}
          </span>
        </div>

        <div className="relative mt-10 lg:mt-0 max-w-xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Suivi des présences, des notes &amp; des volumes horaires
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            Plateforme complète pour les enseignants, la direction pédagogique, les chefs de classe et les
            étudiants. Émargement par séance, barèmes pondérés et tableau de bord consolidé de la progression.
          </p>

          <ul className="mt-8 hidden lg:grid gap-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3.5">
                <span
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${f.tone}`}
                >
                  <f.icon className="w-5 h-5" />
                </span>
                <div>
                  <p className="font-bold text-sm">{f.title}</p>
                  <p className="text-xs text-slate-300 leading-relaxed mt-0.5">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative hidden lg:block text-[11px] text-slate-400">
          Architecture multi-enseignants &amp; supervision de direction
        </p>
      </aside>

      {/* Zone de connexion */}
      <main className="flex flex-col justify-center px-4 sm:px-8 py-10 lg:py-12">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Connexion</h2>
            <p className="text-sm text-slate-500 mt-1">Choisissez votre espace pour accéder à la plateforme.</p>
          </div>

          {urlAlert && (
            <Alert
              type={urlAlert.type}
              showIcon
              closable
              onClose={() => setUrlAlert(null)}
              title={urlAlert.message}
            />
          )}

          <Segmented
            block
            size="large"
            className="[&_.ant-segmented-item-label]:!p-0 [&_.ant-segmented-item-label]:!leading-none"
            value={space}
            onChange={(v) => setSpace(v as "etudiant" | "staff")}
            options={[
              {
                value: "staff",
                label: (
                  <span className="flex h-10 items-center justify-center gap-2 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4" /> Enseignants &amp; Direction
                  </span>
                ),
              },
              {
                value: "etudiant",
                label: (
                  <span className="flex h-10 items-center justify-center gap-2 text-xs font-bold">
                    <Users className="w-4 h-4" /> Étudiants
                  </span>
                ),
              },
            ]}
          />

          {/* Espace Étudiant */}
          {space === "etudiant" && (
            <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Espace étudiant / élève</h3>
                    <p className="text-xs text-slate-500">Accès immédiat sans mot de passe</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Libre accès
                </span>
              </div>

              <Form
                form={studentForm}
                name="student_login_form"
                layout="vertical"
                requiredMark={false}
                autoComplete="off"
                onFinish={handleStudentSearch}
                onValuesChange={() => setMatriculeError("")}
              >
                <Form.Item
                  label={<span className={labelClass}>Votre numéro de matricule</span>}
                  name="matricule"
                  rules={[{ required: true, whitespace: true, message: "Veuillez saisir votre numéro de matricule." }]}
                >
                  <Input
                    size="large"
                    allowClear
                    prefix={<Hash className="w-4 h-4 text-slate-400" />}
                    placeholder="Ex : 33021"
                    inputMode="numeric"
                    autoFocus
                  />
                </Form.Item>

                {SHOW_DEMO && (
                  <div className="-mt-1 mb-4">
                    <p className="text-[11px] text-slate-500 mb-1.5 flex items-center gap-1.5">
                      <FlaskConical className="w-3 h-3" /> Matricules de démonstration :
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {demoMatricules.length === 0 && (
                        <span className="text-xs text-slate-400 italic">
                          Aucun étudiant en base : inscrivez-en un depuis l&apos;espace Direction.
                        </span>
                      )}
                      {demoMatricules.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            studentForm.setFieldsValue({ matricule: m });
                            setMatriculeError("");
                          }}
                          className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-md border border-slate-200 transition cursor-pointer"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-5">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Ce que vous pouvez consulter
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-1.5">
                    {[
                      "Vos notes détaillées par matière avec coefficients",
                      "Votre moyenne générale et votre positionnement dans la classe",
                      "L'historique de présence séance par séance et votre assiduité",
                      "La liste et l'assiduité générale de la classe",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                {matriculeError && <Alert className="!mb-4" type="error" showIcon title={matriculeError} />}

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={isCheckingMatricule}
                  className="!font-bold !bg-emerald-600 hover:!bg-emerald-700"
                >
                  {isCheckingMatricule ? (
                    "Vérification…"
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Accéder à mon espace étudiant <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </Form>
            </section>
          )}

          {/* Espace Pédagogique & Direction */}
          {space === "staff" && (
            <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Espace pédagogique &amp; direction</h3>
                    <p className="text-xs text-slate-500">Enseignants, administration &amp; chefs de classe</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Sécurisé
                </span>
              </div>

              <div>
                <Button
                  block
                  size="large"
                  onClick={handleGoogleClick}
                  className="!font-bold !h-12"
                >
                  <span className="flex items-center justify-center gap-3 w-full">
                    <GoogleLogo />
                    {googleStatus?.configured
                      ? "Continuer avec Google (OAuth officiel)"
                      : "Continuer avec Google / Gmail"}
                    {googleStatus?.configured && (
                      <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Actif
                      </span>
                    )}
                  </span>
                </Button>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-1">
                  <span>Authentification des enseignants par compte Google</span>
                  <button
                    type="button"
                    onClick={() => openGoogleModal()}
                    className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                  >
                    <Settings className="w-3 h-3" />
                    {googleStatus?.configured ? "Paramètres OAuth" : "Configuration"}
                  </button>
                </div>
              </div>

              <div className="relative flex items-center">
                <div className="grow border-t border-slate-200" />
                <span className="shrink mx-3 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                  ou avec identifiant
                </span>
                <div className="grow border-t border-slate-200" />
              </div>

              <Form
                form={staffForm}
                name="staff_login_form"
                layout="vertical"
                requiredMark={false}
                autoComplete="on"
                onFinish={handleStaffLogin}
                onValuesChange={() => setLoginError("")}
              >
                <Form.Item
                  label={<span className={labelClass}>Identifiant ou email</span>}
                  name="username"
                  rules={[{ required: true, whitespace: true, message: "Saisissez votre identifiant ou votre email." }]}
                >
                  <Input
                    size="large"
                    allowClear
                    autoComplete="username"
                    prefix={<User className="w-4 h-4 text-slate-400" />}
                    placeholder="ex : admin, prof ou chef"
                  />
                </Form.Item>

                <Form.Item
                  label={<span className={labelClass}>Mot de passe</span>}
                  name="password"
                  rules={[{ required: true, message: "Saisissez votre mot de passe." }]}
                >
                  <Input.Password
                    size="large"
                    autoComplete="current-password"
                    prefix={<Lock className="w-4 h-4 text-slate-400" />}
                    placeholder="••••••••"
                  />
                </Form.Item>

                {loginError && <Alert className="!mb-4" type="error" showIcon title={loginError} />}

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={isLoggingIn}
                  className="!font-bold !bg-slate-900 hover:!bg-slate-800"
                >
                  {isLoggingIn ? "Connexion en cours…" : "Se connecter"}
                </Button>
              </Form>

              {SHOW_DEMO && (
                <div id="comptes-test" className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <FlaskConical className="w-3 h-3" /> Comptes de test (développement uniquement)
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TEST_ACCOUNTS.map((account) => (
                      <button
                        key={account.username}
                        type="button"
                        data-account={account.username}
                        onClick={() => {
                          staffForm.setFieldsValue({ username: account.username, password: account.password });
                          setLoginError("");
                        }}
                        className={`p-2 text-left bg-white border border-slate-200 rounded-lg text-xs transition cursor-pointer ${account.tone}`}
                      >
                        <span className="font-bold block text-[11px]">{account.label}</span>
                        <span className="text-[10px] text-slate-500 block break-all">{account.username}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Atouts (petits écrans) */}
          <ul className="lg:hidden grid sm:grid-cols-2 gap-3 pt-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <f.icon className="w-4 h-4" />
                  </span>
                  <p className="font-bold text-sm text-slate-900">{f.title}</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-2">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Fenêtre Google : configuration OAuth */}
      {mounted && (
      <Modal
        open={showGoogleModal}
        onCancel={() => setShowGoogleModal(false)}
        footer={null}
        width={560}
        title={
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <GoogleLogo />
            </span>
            <div>
              <p className="font-bold text-base text-slate-900 leading-tight">Authentification Google enseignants</p>
              <p className="text-xs font-normal text-slate-500">Connexion OAuth 2.0 officielle</p>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Alert
            type={googleStatus?.configured ? "success" : "warning"}
            showIcon
            title={
              googleStatus?.configured
                ? `Connexion Google activée (${googleStatus.clientIdMasked})`
                : "La connexion Google n'est pas encore activée"
            }
            action={
              googleStatus?.configured ? (
                <Button size="small" type="primary" onClick={startGoogleOAuth}>
                  Se connecter avec Google
                </Button>
              ) : undefined
            }
          />

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs text-slate-600">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              Configuration réservée à l&apos;administration
            </p>
            <p className="text-[11px] leading-relaxed">
              Pour des raisons de sécurité, les clés Google ne peuvent plus être saisies depuis cette page publique.
              Un administrateur doit se connecter (onglet <strong>Enseignants &amp; Direction</strong>), puis ouvrir{" "}
              <strong>Configuration &amp; IA</strong> et renseigner l&apos;ID client et le secret dans la section
              <strong> Connexion Google</strong>.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setShowGoogleModal(false)}>Fermer</Button>
          </div>
        </div>
      </Modal>
      )}
    </div>
  );
}
