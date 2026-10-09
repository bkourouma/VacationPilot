"use client";

import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { App, Button, Input, Pagination, Popconfirm, Tooltip } from "antd";
import {
  Users,
  Plus,
  FileSpreadsheet,
  BookOpen,
  Trash2,
  Mail,
  Phone,
  Search,
  Pencil,
  GraduationCap,
  ClipboardPaste,
  Download,
  ArrowUpRight,
  School,
  Clock,
  CalendarRange,
  UserCheck,
  Upload as UploadIcon,
} from "lucide-react";
import type {
  ClasseFull,
  Enseignant,
  EtudiantItem,
  MatiereItem,
  UserRole,
} from "./_components/types";
import ClasseFormModal from "./_components/ClasseFormModal";
import { AddCoursModal, EditCoursModal } from "./_components/CoursModals";
import {
  AddEtudiantModal,
  EditEtudiantModal,
  ExcelDropzone,
  type AddEtudiantTab,
} from "../_shared/EtudiantModals";
import { downloadStudentTemplate } from "../_shared/downloadTemplate";

const PAGE_SIZE = 15;

const AVATAR_TONES = [
  "bg-indigo-100 text-indigo-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

function avatarTone(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function ProgressBar({ value, tone = "bg-blue-500" }: { value: number; tone?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${tone}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function ClassesUrlParamsHandler({
  onAddMatiere,
  onAddEtudiant,
}: {
  onAddMatiere: () => void;
  onAddEtudiant: () => void;
}) {
  const searchParams = useSearchParams();
  const executedRef = useRef<string | null>(null);
  const onAddMatiereRef = useRef(onAddMatiere);
  const onAddEtudiantRef = useRef(onAddEtudiant);

  useEffect(() => {
    onAddMatiereRef.current = onAddMatiere;
    onAddEtudiantRef.current = onAddEtudiant;
  });

  useEffect(() => {
    const action = searchParams.get("action");
    if (!action) return;

    // Éviter de ré-exécuter en boucle la même action
    if (executedRef.current === action) return;
    executedRef.current = action;

    if (action === "add-matiere") {
      onAddMatiereRef.current();
    } else if (action === "add-etudiant") {
      onAddEtudiantRef.current();
    }

    // Nettoyer le paramètre d'action de l'URL pour éviter tout re-déclenchement intempestif
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("action");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  }, [searchParams]);

  return null;
}

export default function ClassesPage() {
  const { message, modal } = App.useApp();

  const [classes, setClasses] = useState<ClasseFull[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>("ENSEIGNANT");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);

  // Recherche + pagination des étudiants
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Fenêtres modales
  const [classModal, setClassModal] = useState<{ open: boolean; classe: ClasseFull | null }>({
    open: false,
    classe: null,
  });
  const [addCours, setAddCours] = useState<{ open: boolean; classeId: string }>({
    open: false,
    classeId: "",
  });
  const [editingCours, setEditingCours] = useState<MatiereItem | null>(null);
  const [addEtudiant, setAddEtudiant] = useState<{ open: boolean; tab: AddEtudiantTab }>({
    open: false,
    tab: "saisie",
  });
  const [editingEtudiant, setEditingEtudiant] = useState<EtudiantItem | null>(null);

  // Import Excel rapide (carte de la page)
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const isAdmin = userRole === "ADMINISTRATION";

  // 1. Charger les classes et le profil utilisateur
  const loadClasses = useCallback(
    async (targetId?: string) => {
      try {
        const [resAuth, res, resEns] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/classes?all=true"),
          fetch("/api/enseignants"),
        ]);

        if (resAuth.ok) {
          const authData = await resAuth.json();
          setUserRole(authData.user?.role || "ENSEIGNANT");
          setCurrentUserId(authData.user?.id || "");
          setCurrentUserName(authData.user?.nom || authData.user?.username || "");
        }

        if (resEns.ok) {
          const ensData = await resEns.json();
          if (Array.isArray(ensData)) setEnseignants(ensData);
        }

        const list = await res.json();
        if (Array.isArray(list)) {
          const fullClasses: ClasseFull[] = await Promise.all(
            list.map(async (c: { id: string }) => {
              const detailRes = await fetch(`/api/classes/${c.id}?all=true`);
              return await detailRes.json();
            })
          );
          setClasses(fullClasses);
          setSelectedClasseId((prev) => {
            const wanted = targetId || prev;
            if (wanted && fullClasses.some((c) => c.id === wanted)) return wanted;
            return fullClasses[0]?.id ?? "";
          });
        }
      } catch (err) {
        console.error(err);
        message.error("Impossible de charger les classes.");
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedClasseId]);

  const currentClasse = classes.find((c) => c.id === selectedClasseId);

  const openAddCours = useCallback(
    (classeId?: string) => {
      setAddCours({ open: true, classeId: classeId || selectedClasseId || "" });
    },
    [selectedClasseId]
  );

  const openAddEtudiant = useCallback((tab: AddEtudiantTab = "saisie") => {
    setAddEtudiant({ open: true, tab });
  }, []);

  // --- ACTIONS ---

  const handleDeleteClasse = () => {
    if (!currentClasse) return;
    modal.confirm({
      title: `Supprimer la classe « ${currentClasse.nom} (${currentClasse.code}) » ?`,
      content:
        "Attention : toutes les matières, étudiants, séances de présence et notes associées seront également supprimés. Cette action est définitive.",
      okText: "Supprimer définitivement",
      cancelText: "Annuler",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await fetch(`/api/classes/${currentClasse.id}`, { method: "DELETE" });
          if (!res.ok) {
            const err = await res.json();
            message.error(err.error || "Erreur suppression");
            return;
          }
          message.success("Classe supprimée avec succès.");
          await loadClasses();
        } catch {
          message.error("Erreur réseau");
        }
      },
    });
  };

  const handleDeleteMatiere = async (matiereId: string) => {
    try {
      const res = await fetch(`/api/matieres/${matiereId}`, { method: "DELETE" });
      if (res.ok) {
        message.success("Cours retiré de la classe.");
        await loadClasses();
      } else {
        const err = await res.json();
        message.error(err.error || "Erreur suppression");
      }
    } catch (err) {
      console.error(err);
      message.error("Erreur réseau");
    }
  };

  const handleDeleteEtudiant = async (etudiantId: string) => {
    try {
      const res = await fetch(`/api/etudiants/${etudiantId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        message.error(err.error || "Erreur suppression");
        return;
      }
      message.success("Auditeur supprimé avec succès.");
      await loadClasses();
    } catch {
      message.error("Erreur réseau");
    }
  };

  const handleImportExcel = async () => {
    if (!excelFile || !selectedClasseId) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", excelFile);
    formData.append("classeId", selectedClasseId);

    try {
      const res = await fetch("/api/etudiants/import-excel", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error || "Erreur lors de l'importation.");
        return;
      }
      setImportResult(json.message);
      message.success(json.message);
      setExcelFile(null);
      await loadClasses();
    } catch {
      message.error("Erreur réseau lors de l'import.");
    } finally {
      setImporting(false);
    }
  };

  // --- DONNÉES DÉRIVÉES ---

  const filteredEtudiants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = currentClasse?.etudiants ?? [];
    if (!q) return list;
    return list.filter(
      (et) =>
        et.matricule.toLowerCase().includes(q) ||
        et.nom.toLowerCase().includes(q) ||
        et.prenom.toLowerCase().includes(q) ||
        (et.contact && et.contact.includes(q)) ||
        (et.email && et.email.toLowerCase().includes(q))
    );
  }, [currentClasse, searchQuery]);

  const pagedEtudiants = filteredEtudiants.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const volumeStats = useMemo(() => {
    const matieres = currentClasse?.matieres ?? [];
    const prevu = matieres.reduce((s, m) => s + (m.volumeHoraire || 0), 0);
    const fait = matieres.reduce((s, m) => s + (m.heuresEffectuees || 0), 0);
    return { prevu, fait, pct: prevu > 0 ? Math.round((fait / prevu) * 100) : 0 };
  }, [currentClasse]);

  // --- RENDU : fragments partagés tableau / cartes ---

  const renderEtudiantActions = (et: EtudiantItem) => (
    <div className="inline-flex items-center gap-0.5">
      <Tooltip title="Voir la fiche de l'auditeur">
        <a
          href={`/etudiant/${et.matricule}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`Voir la fiche de ${et.nom} ${et.prenom}`}
          className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition inline-flex"
        >
          <ArrowUpRight className="w-4 h-4" />
        </a>
      </Tooltip>
      <Tooltip title="Modifier l'auditeur">
        <Button
          type="text"
          aria-label={`Modifier ${et.nom} ${et.prenom}`}
          icon={<Pencil className="w-4 h-4 text-slate-500" />}
          onClick={() => setEditingEtudiant(et)}
        />
      </Tooltip>
      <Popconfirm
        title={`Supprimer « ${et.nom} ${et.prenom} » ?`}
        description="Ses présences et notes associées seront définitivement supprimées."
        okText="Supprimer"
        cancelText="Annuler"
        okButtonProps={{ danger: true }}
        onConfirm={() => handleDeleteEtudiant(et.id)}
      >
        <Button
          type="text"
          danger
          aria-label={`Supprimer ${et.nom} ${et.prenom}`}
          icon={<Trash2 className="w-4 h-4" />}
        />
      </Popconfirm>
    </div>
  );

  const contactCell = (et: EtudiantItem) =>
    et.contact ? (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <Phone className="w-3 h-3 text-slate-400" /> {et.contact}
      </span>
    ) : (
      <span className="text-slate-300">—</span>
    );

  const emailCell = (et: EtudiantItem) =>
    et.email ? (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <Mail className="w-3 h-3 text-slate-400" /> {et.email}
      </span>
    ) : (
      <span className="text-slate-300">—</span>
    );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-32 rounded-2xl bg-slate-200" />
        <div className="h-14 rounded-2xl bg-white border border-slate-200" />
        <div className="h-40 rounded-2xl bg-white border border-slate-200" />
        <div className="h-72 rounded-2xl bg-white border border-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Suspense fallback={null}>
        <ClassesUrlParamsHandler
          onAddMatiere={() => openAddCours()}
          onAddEtudiant={() => openAddEtudiant()}
        />
      </Suspense>

      {/* En-tête */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 sm:p-8 text-white shadow-sm">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 backdrop-blur">
              <School className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Classes, cours &amp; étudiants
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                Rejoignez une classe pour y ajouter votre matière, ou créez et gérez vos filières
                et vos auditeurs.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href="/dashboard/etudiants"
              className="inline-flex items-center gap-1.5 px-3.5 h-10 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs rounded-lg transition"
            >
              <Users className="w-4 h-4" />
              Répertoire étudiants
            </Link>
            <Button
              size="large"
              ghost
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setClassModal({ open: true, classe: null })}
              className="!text-xs !font-bold !text-white !border-white/40 hover:!border-white"
            >
              Nouvelle classe
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<BookOpen className="w-4 h-4" />}
              onClick={() => openAddCours()}
              className="!text-xs !font-bold"
            >
              Programmer un cours
            </Button>
          </div>
        </div>
      </div>

      {/* Aucune classe */}
      {classes.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/80 text-center max-w-2xl mx-auto shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Bienvenue ! Aucune classe ni matière pour l&apos;instant
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed max-w-lg mx-auto">
              Les classes de l&apos;établissement sont partagées. Choisissez la classe dans laquelle
              vous donnez cours et configurez votre matière pour commencer à faire l&apos;appel et
              suivre vos volumes horaires.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              type="primary"
              size="large"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => openAddCours()}
              className="!text-xs !font-bold"
            >
              Choisir une classe &amp; ajouter ma matière
            </Button>
            <Button
              size="large"
              onClick={() => setClassModal({ open: true, classe: null })}
              className="!text-xs !font-semibold"
            >
              Créer une nouvelle classe
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="tablist"
          aria-label="Classes"
          className="flex items-stretch gap-2.5 overflow-x-auto pb-1 [scrollbar-width:thin]"
        >
          {classes.map((c) => {
            const active = selectedClasseId === c.id;
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedClasseId(c.id)}
                className={`shrink-0 min-w-44 text-left px-4 py-3 rounded-xl border transition cursor-pointer ${
                  active
                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <span className="block font-mono text-xs font-bold">{c.code}</span>
                <span
                  className={`block text-[11px] mt-0.5 truncate max-w-52 ${
                    active ? "text-blue-100" : "text-slate-500"
                  }`}
                >
                  {c.nom}
                </span>
                <span
                  className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold ${
                    active ? "text-white/90" : "text-slate-400"
                  }`}
                >
                  <Users className="w-3 h-3" /> {c.etudiants.length} auditeur
                  {c.etudiants.length > 1 ? "s" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {currentClasse && (
        <div className="space-y-6">
          {/* Fiche de la classe active */}
          <section className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-700 font-mono font-bold text-xs">
                    {currentClasse.code}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">{currentClasse.nom}</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 inline-flex items-center gap-1.5">
                  <CalendarRange className="w-3.5 h-3.5" />
                  Année académique :{" "}
                  <strong className="text-slate-700">{currentClasse.anneeScolaire}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  icon={<Pencil className="w-3.5 h-3.5" />}
                  onClick={() => setClassModal({ open: true, classe: currentClasse })}
                  className="!text-xs !font-semibold"
                >
                  Modifier
                </Button>
                <Button
                  danger
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={handleDeleteClasse}
                  className="!text-xs !font-semibold"
                >
                  Supprimer
                </Button>
                <Button
                  icon={<BookOpen className="w-3.5 h-3.5" />}
                  onClick={() => openAddCours(currentClasse.id)}
                  className="!text-xs !font-semibold"
                >
                  Programmer un cours
                </Button>
                <Button
                  type="primary"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => openAddEtudiant()}
                  className="!text-xs !font-bold"
                >
                  Inscrire des auditeurs
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-600" /> Auditeurs
                </p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">
                  {currentClasse.etudiants.length}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Matières
                </p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">
                  {currentClasse.matieres.length}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Volume prévu
                </p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">
                  {volumeStats.prevu}
                  <span className="text-sm font-semibold text-slate-400">h</span>
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Avancement
                </p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">
                  {volumeStats.pct}
                  <span className="text-sm font-semibold text-slate-400">%</span>
                </p>
                <div className="mt-1.5">
                  <ProgressBar value={volumeStats.pct} />
                </div>
              </div>
            </div>
          </section>

          {/* Matières + import Excel */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Matières enseignées
                  <span className="inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold tabular-nums">
                    {currentClasse.matieres.length}
                  </span>
                </h3>
                <Button
                  type="link"
                  size="small"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => openAddCours(currentClasse.id)}
                  className="!text-xs !font-semibold"
                >
                  Nouvelle matière
                </Button>
              </div>

              {currentClasse.matieres.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-500">Aucune matière enregistrée pour cette classe.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {currentClasse.matieres.map((m) => {
                    const volume = m.volumeHoraire || 0;
                    const fait = m.heuresEffectuees;
                    const pct =
                      fait !== undefined && volume > 0 ? Math.round((fait / volume) * 100) : null;
                    return (
                      <li key={m.id} className="px-5 py-4 hover:bg-slate-50/60 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[11px] font-bold text-blue-700 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100">
                                {m.code}
                              </span>
                              <span className="font-bold text-sm text-slate-900">{m.nom}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {volume}h prévues
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                              Enseignant :
                              <strong className="text-slate-700">
                                {m.enseignant?.nom || "Non assigné"}
                              </strong>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setEditingCours(m)}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 transition cursor-pointer"
                                  title="Changer l'enseignant pour ce cours programmé"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                  Changer
                                </button>
                              )}
                            </p>
                            {pct !== null && (
                              <div className="space-y-1 max-w-sm">
                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                  <span>Avancement horaire</span>
                                  <span className="font-semibold text-slate-700 tabular-nums">
                                    {fait}h / {volume}h &bull; {pct}%
                                  </span>
                                </div>
                                <ProgressBar value={pct} />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center shrink-0 -mr-2">
                            <Tooltip title="Modifier le cours (enseignant, volume horaire, intitulé)">
                              <Button
                                type="text"
                                aria-label={`Modifier ${m.nom}`}
                                icon={<Pencil className="w-4 h-4 text-slate-500" />}
                                onClick={() => setEditingCours(m)}
                              />
                            </Tooltip>
                            <Popconfirm
                              title={`Retirer « ${m.nom} » de la classe ?`}
                              description="Le cours programmé et ses données associées seront supprimés."
                              okText="Retirer"
                              cancelText="Annuler"
                              okButtonProps={{ danger: true }}
                              onConfirm={() => handleDeleteMatiere(m.id)}
                            >
                              <Button
                                type="text"
                                danger
                                aria-label={`Retirer ${m.nom}`}
                                icon={<Trash2 className="w-4 h-4" />}
                              />
                            </Popconfirm>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="flex items-center justify-between gap-2 flex-wrap px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Import Excel rapide
                </h3>
                <Button
                  size="small"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => downloadStudentTemplate(currentClasse.code)}
                  className="!text-[11px] !font-semibold"
                >
                  Modèle .xlsx
                </Button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Téléversez n&apos;importe quel fichier Excel (avec ou sans en-tête, liste brute de
                  noms, relevé ou feuille de présence). Les colonnes et matricules sont détectés
                  automatiquement.
                </p>
                <ExcelDropzone file={excelFile} onChange={setExcelFile} />
                {importResult && (
                  <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    {importResult}
                  </p>
                )}
                <Button
                  type="primary"
                  block
                  size="large"
                  disabled={!excelFile}
                  loading={importing}
                  icon={<UploadIcon className="w-4 h-4" />}
                  onClick={handleImportExcel}
                  className="!text-xs !font-bold !bg-emerald-600 hover:!bg-emerald-700 disabled:!bg-slate-100"
                >
                  {importing ? "Importation en cours..." : "Lancer l'importation vers cette classe"}
                </Button>
              </div>
            </section>
          </div>

          {/* Étudiants */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Auditeurs inscrits
                  <span className="ml-2 inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold tabular-nums">
                    {currentClasse.etudiants.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Élèves pouvant se connecter avec leur matricule
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Input
                  aria-label="Rechercher un étudiant"
                  allowClear
                  prefix={<Search className="w-4 h-4 text-slate-400" />}
                  placeholder="Rechercher par nom, matricule…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sm:w-64"
                />
                <Button
                  type="primary"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => openAddEtudiant()}
                  className="!text-xs !font-bold"
                >
                  Inscrire des auditeurs
                </Button>
              </div>
            </div>

            {currentClasse.etudiants.length === 0 ? (
              <div className="p-8 sm:p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Aucun auditeur inscrit dans cette classe
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Inscrivez vos élèves en choisissant le mode le plus adapté :
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <Button
                    type="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => openAddEtudiant("saisie")}
                    className="!text-xs !font-bold"
                  >
                    Saisie rapide (1 par 1)
                  </Button>
                  <Button
                    icon={<ClipboardPaste className="w-4 h-4" />}
                    onClick={() => openAddEtudiant("coller")}
                    className="!text-xs !font-semibold"
                  >
                    Coller une liste
                  </Button>
                  <Button
                    icon={<FileSpreadsheet className="w-4 h-4" />}
                    onClick={() => openAddEtudiant("excel")}
                    className="!text-xs !font-semibold"
                  >
                    Importer un fichier Excel
                  </Button>
                </div>
              </div>
            ) : filteredEtudiants.length === 0 ? (
              <div className="px-6 py-12 text-center text-xs text-slate-500">
                Aucun auditeur ne correspond à votre recherche «&nbsp;{searchQuery}&nbsp;».
              </div>
            ) : (
              <>
                {/* Grand écran : tableau */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full min-w-max table-auto text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-5 py-3 whitespace-nowrap">N°</th>
                        <th className="px-4 py-3 whitespace-nowrap">Matricule</th>
                        <th className="px-4 py-3 whitespace-nowrap">Nom et prénom</th>
                        <th className="px-4 py-3 whitespace-nowrap">Contact</th>
                        <th className="px-4 py-3 whitespace-nowrap">Email</th>
                        <th className="px-5 py-3 text-right whitespace-nowrap sticky right-0 bg-slate-50 shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.12)]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedEtudiants.map((et, idx) => (
                        <tr key={et.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-5 py-3 text-slate-400 font-mono">
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-bold text-slate-800">
                              {et.matricule}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${avatarTone(
                                  et.nom
                                )}`}
                              >
                                {et.nom.charAt(0).toUpperCase()}
                              </span>
                              <span className="font-semibold text-slate-900 text-sm whitespace-nowrap">
                                {et.nom} {et.prenom}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{contactCell(et)}</td>
                          <td className="px-4 py-3 text-slate-600">{emailCell(et)}</td>
                          <td className="px-5 py-3 text-right whitespace-nowrap sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.12)]">
                            {renderEtudiantActions(et)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile & tablette : cartes */}
                <ul className="lg:hidden divide-y divide-slate-100">
                  {pagedEtudiants.map((et) => (
                    <li key={et.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-sm shrink-0 ${avatarTone(
                              et.nom
                            )}`}
                          >
                            {et.nom.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-900 truncate">
                              {et.nom} {et.prenom}
                            </p>
                            <p className="font-mono text-[11px] font-bold text-slate-500">
                              {et.matricule}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 -mr-2">{renderEtudiantActions(et)}</div>
                      </div>
                      {(et.contact || et.email) && (
                        <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1 pl-11">
                          {et.contact && contactCell(et)}
                          {et.email && emailCell(et)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="px-5 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 tabular-nums">
                    {filteredEtudiants.length} résultat{filteredEtudiants.length > 1 ? "s" : ""}
                    {searchQuery.trim() ? ` sur ${currentClasse.etudiants.length}` : ""}
                  </span>
                  <Pagination
                    size="small"
                    current={page}
                    pageSize={PAGE_SIZE}
                    total={filteredEtudiants.length}
                    onChange={setPage}
                    showSizeChanger={false}
                    hideOnSinglePage
                  />
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* Fenêtres modales (formulaires Ant Design) */}
      <ClasseFormModal
        open={classModal.open}
        classe={classModal.classe}
        onClose={() => setClassModal({ open: false, classe: null })}
        onSaved={async (classeId, created) => {
          setClassModal({ open: false, classe: null });
          await loadClasses(classeId);
          if (created) openAddEtudiant();
        }}
      />

      <AddCoursModal
        open={addCours.open}
        defaultClasseId={addCours.classeId}
        userRole={userRole}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        onClose={() => setAddCours({ open: false, classeId: "" })}
        onSaved={async (classeId) => {
          setAddCours({ open: false, classeId: "" });
          setSelectedClasseId(classeId);
          await loadClasses(classeId);
        }}
      />

      <EditCoursModal
        cours={editingCours}
        classeNom={currentClasse?.nom}
        userRole={userRole}
        enseignants={enseignants}
        onClose={() => setEditingCours(null)}
        onSaved={async () => {
          setEditingCours(null);
          await loadClasses();
        }}
      />

      <AddEtudiantModal
        open={addEtudiant.open}
        initialTab={addEtudiant.tab}
        classes={classes}
        selectedClasseId={selectedClasseId}
        onSelectClasse={setSelectedClasseId}
        onClose={() => setAddEtudiant((s) => ({ ...s, open: false }))}
        onChanged={() => loadClasses()}
      />

      <EditEtudiantModal
        etudiant={editingEtudiant}
        classes={classes}
        currentClasseId={selectedClasseId}
        onClose={() => setEditingEtudiant(null)}
        onSaved={async () => {
          setEditingEtudiant(null);
          await loadClasses();
        }}
      />
    </div>
  );
}
