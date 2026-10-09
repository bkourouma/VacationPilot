"use client";

import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
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
  Filter,
  School,
} from "lucide-react";
import { AddEtudiantModal, EditEtudiantModal, type AddEtudiantTab } from "../_shared/EtudiantModals";
import { downloadStudentTemplate } from "../_shared/downloadTemplate";
import type { ClasseLite } from "../_shared/types";

const PAGE_SIZE = 20;

interface ClasseSummary extends ClasseLite {
  _count?: { etudiants: number };
}

interface EtudiantRow {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  contact: string | null;
  email: string | null;
  classeId: string;
  classe?: {
    id: string;
    code: string;
    nom: string;
  };
  _count?: {
    presences: number;
    notes: number;
  };
}

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

function EtudiantsUrlParamsHandler({ onOpenAdd }: { onOpenAdd: (classeId?: string) => void }) {
  const searchParams = useSearchParams();
  const executedRef = useRef<string | null>(null);
  const onOpenAddRef = useRef(onOpenAdd);

  useEffect(() => {
    onOpenAddRef.current = onOpenAdd;
  });

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "add" || action === "add-etudiant") {
      const key = `${action}_${searchParams.get("classeId") || ""}`;
      if (executedRef.current === key) return;
      executedRef.current = key;

      onOpenAddRef.current(searchParams.get("classeId") || undefined);

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("action");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }
  }, [searchParams]);
  return null;
}

export default function EtudiantsPage() {
  const { message } = App.useApp();

  const [etudiants, setEtudiants] = useState<EtudiantRow[]>([]);
  const [classes, setClasses] = useState<ClasseSummary[]>([]);
  const [selectedClasseFilter, setSelectedClasseFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [addModal, setAddModal] = useState<{ open: boolean; tab: AddEtudiantTab }>({
    open: false,
    tab: "saisie",
  });
  const [targetClasseId, setTargetClasseId] = useState<string>("");
  const [editingEtudiant, setEditingEtudiant] = useState<EtudiantRow | null>(null);

  // Charger les données (toutes les classes de l'établissement pour la gestion des étudiants)
  const loadData = useCallback(async () => {
    try {
      const [resEtudiants, resClasses] = await Promise.all([
        fetch("/api/etudiants"),
        fetch("/api/classes?all=true"),
      ]);

      let validClasses: ClasseSummary[] = [];
      if (resClasses.ok) {
        const clList = await resClasses.json();
        validClasses = Array.isArray(clList) ? clList : [];
        setClasses(validClasses);
      }

      if (resEtudiants.ok) {
        const etList = await resEtudiants.json();
        setEtudiants(Array.isArray(etList) ? etList : []);
      }

      setTargetClasseId((prev) =>
        prev && validClasses.some((c) => c.id === prev) ? prev : validClasses[0]?.id ?? ""
      );
    } catch (err) {
      console.error("Erreur chargement données étudiants:", err);
      message.error("Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedClasseFilter]);

  const openAddModal = useCallback(
    (presetClasseId?: string, tab: AddEtudiantTab = "saisie") => {
      let toSelect = "";
      if (presetClasseId && classes.some((c) => c.id === presetClasseId)) {
        toSelect = presetClasseId;
      } else if (selectedClasseFilter !== "ALL" && classes.some((c) => c.id === selectedClasseFilter)) {
        toSelect = selectedClasseFilter;
      } else if (targetClasseId && classes.some((c) => c.id === targetClasseId)) {
        toSelect = targetClasseId;
      } else if (classes.length > 0) {
        toSelect = classes[0].id;
      }
      setTargetClasseId(toSelect);
      setAddModal({ open: true, tab });
    },
    [classes, selectedClasseFilter, targetClasseId]
  );

  // Les classes se chargent après le montage : on rejoue l'action d'URL une fois prêtes
  const urlHandlerOpenAdd = useCallback((cls?: string) => openAddModal(cls), [openAddModal]);

  const handleDeleteEtudiant = async (etudiantId: string) => {
    try {
      const res = await fetch(`/api/etudiants/${etudiantId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        message.error(err.error || "Erreur suppression");
        return;
      }
      message.success("Auditeur supprimé avec succès.");
      await loadData();
    } catch {
      message.error("Erreur réseau");
    }
  };

  // Filtrage des étudiants
  const filteredEtudiants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return etudiants.filter((et) => {
      if (selectedClasseFilter !== "ALL" && et.classeId !== selectedClasseFilter) return false;
      if (!q) return true;
      return (
        et.matricule.toLowerCase().includes(q) ||
        et.nom.toLowerCase().includes(q) ||
        et.prenom.toLowerCase().includes(q) ||
        (et.contact && et.contact.includes(q)) ||
        (et.email && et.email.toLowerCase().includes(q)) ||
        (et.classe?.code && et.classe.code.toLowerCase().includes(q))
      );
    });
  }, [etudiants, selectedClasseFilter, searchQuery]);

  const pagedEtudiants = filteredEtudiants.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const countByClasse = useMemo(() => {
    const map = new Map<string, number>();
    etudiants.forEach((e) => map.set(e.classeId, (map.get(e.classeId) ?? 0) + 1));
    return map;
  }, [etudiants]);

  // Exporter la liste actuelle des étudiants en Excel
  const handleExportList = () => {
    if (filteredEtudiants.length === 0) {
      message.error("Aucun étudiant à exporter.");
      return;
    }

    try {
      const dataToExport = filteredEtudiants.map((et, idx) => ({
        "N°": idx + 1,
        MATRICULE: et.matricule,
        NOM: et.nom,
        PRENOM: et.prenom,
        CLASSE: et.classe?.code || "-",
        CONTACT: et.contact || "",
        EMAIL: et.email || "",
        PRESENCES_EFFECTUEES: et._count?.presences || 0,
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Liste_Auditeurs");
      const currentClassCode =
        classes.find((c) => c.id === selectedClasseFilter)?.code || "Toutes_Classes";
      XLSX.writeFile(workbook, `Liste_Etudiants_${currentClassCode}.xlsx`);
      message.success(`${filteredEtudiants.length} auditeur(s) exporté(s).`);
    } catch (e) {
      console.error("Erreur export étudiants:", e);
      message.error("Erreur lors de l'exportation.");
    }
  };

  const renderActions = (et: EtudiantRow) => (
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
        description="Ses séances de présence et notes associées seront définitivement supprimées."
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

  const classBadge = (et: EtudiantRow) => (
    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-mono font-bold text-[11px] border border-blue-100 whitespace-nowrap">
      {et.classe?.code || "—"}
    </span>
  );

  const contactCell = (et: EtudiantRow) =>
    et.contact ? (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono">
        <Phone className="w-3 h-3 text-slate-400" /> {et.contact}
      </span>
    ) : (
      <span className="text-slate-300">—</span>
    );

  const emailCell = (et: EtudiantRow) =>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-slate-200" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-white border border-slate-200" />
      </div>
    );
  }

  const kpis = [
    {
      label: "Total auditeurs",
      value: etudiants.length,
      icon: <Users className="w-5 h-5" />,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "Classes associées",
      value: classes.length,
      icon: <School className="w-5 h-5" />,
      tone: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Auditeurs affichés",
      value: filteredEtudiants.length,
      icon: <Filter className="w-5 h-5" />,
      tone: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Suspense fallback={null}>
        <EtudiantsUrlParamsHandler onOpenAdd={urlHandlerOpenAdd} />
      </Suspense>

      {/* En-tête */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 sm:p-8 text-white shadow-sm">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 backdrop-blur">
              <Users className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Répertoire des étudiants &amp; auditeurs
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                Gérez vos listes d&apos;élèves par classe, inscrivez de nouveaux auditeurs et suivez
                leurs présences.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              size="large"
              ghost
              icon={<Download className="w-4 h-4" />}
              onClick={() => downloadStudentTemplate()}
              title="Télécharger le modèle Excel pré-formaté"
              className="!text-xs !font-semibold !text-white !border-white/40 hover:!border-white"
            >
              Modèle Excel
            </Button>
            <Button
              size="large"
              ghost
              icon={<FileSpreadsheet className="w-4 h-4" />}
              onClick={handleExportList}
              disabled={filteredEtudiants.length === 0}
              title="Exporter la liste actuelle en Excel"
              className="!text-xs !font-semibold !text-white !border-white/40 hover:!border-white disabled:!opacity-40"
            >
              Exporter (.xlsx)
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => openAddModal()}
              className="!text-xs !font-bold"
            >
              Inscrire des auditeurs
            </Button>
          </div>
        </div>
      </div>

      {/* Indicateurs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3.5"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${k.tone}`}>
              {k.icon}
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{k.label}</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5 tabular-nums">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Liste */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Filtrer par classe"
            className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full [scrollbar-width:thin]"
          >
            <button
              role="tab"
              aria-selected={selectedClasseFilter === "ALL"}
              onClick={() => setSelectedClasseFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedClasseFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Toutes les classes ({etudiants.length})
            </button>
            {classes.map((cls) => {
              const isSelected = selectedClasseFilter === cls.id;
              return (
                <button
                  key={cls.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedClasseFilter(cls.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <span>{cls.code}</span>
                  <span
                    className={`text-[10px] px-1.5 rounded-full ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {countByClasse.get(cls.id) ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <Input
            aria-label="Rechercher un étudiant"
            allowClear
            prefix={<Search className="w-4 h-4 text-slate-400" />}
            placeholder="Rechercher par nom, matricule, contact…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="xl:w-80 shrink-0"
          />
        </div>

        {classes.length === 0 ? (
          <div className="px-6 py-14 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              Aucune classe n&apos;a encore été créée dans l&apos;établissement
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Pour inscrire des étudiants, créez d&apos;abord la première classe de l&apos;établissement.
            </p>
            <Link
              href="/dashboard/classes"
              className="inline-flex items-center gap-2 px-4 h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Créer une classe
            </Link>
          </div>
        ) : etudiants.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Vous n&apos;avez encore aucun auditeur inscrit
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Inscrivez vos premiers élèves en quelques secondes grâce aux modes rapides :
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => openAddModal(undefined, "saisie")}
                className="!text-xs !font-bold"
              >
                Saisie rapide (1 par 1)
              </Button>
              <Button
                icon={<ClipboardPaste className="w-4 h-4" />}
                onClick={() => openAddModal(undefined, "coller")}
                className="!text-xs !font-semibold"
              >
                Coller une liste (WhatsApp / Word)
              </Button>
              <Button
                icon={<FileSpreadsheet className="w-4 h-4" />}
                onClick={() => openAddModal(undefined, "excel")}
                className="!text-xs !font-semibold"
              >
                Importer un fichier Excel
              </Button>
            </div>
          </div>
        ) : filteredEtudiants.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-slate-500">
            Aucun auditeur ne correspond à votre filtre ou à votre recherche
            {searchQuery.trim() ? <> «&nbsp;{searchQuery}&nbsp;»</> : null}.
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
                    <th className="px-4 py-3 whitespace-nowrap">Classe</th>
                    <th className="px-4 py-3 whitespace-nowrap">Contact</th>
                    <th className="px-4 py-3 whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Présences</th>
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
                      <td className="px-4 py-3">{classBadge(et)}</td>
                      <td className="px-4 py-3 text-slate-600">{contactCell(et)}</td>
                      <td className="px-4 py-3 text-slate-600">{emailCell(et)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-7 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 tabular-nums">
                          {et._count?.presences || 0}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.12)]">
                        {renderActions(et)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & tablette : cartes */}
            <ul className="lg:hidden divide-y divide-slate-100">
              {pagedEtudiants.map((et) => (
                <li key={et.id} className="p-4 space-y-2.5">
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
                        <p className="font-mono text-[11px] font-bold text-slate-500">{et.matricule}</p>
                      </div>
                    </div>
                    <div className="shrink-0 -mr-2">{renderActions(et)}</div>
                  </div>
                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-11">
                    {classBadge(et)}
                    <span className="text-[11px] text-slate-500">
                      {et._count?.presences || 0} présence(s)
                    </span>
                    {et.contact && contactCell(et)}
                    {et.email && emailCell(et)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="px-5 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-xs text-slate-500 tabular-nums">
                {filteredEtudiants.length} résultat{filteredEtudiants.length > 1 ? "s" : ""}
                {filteredEtudiants.length !== etudiants.length ? ` sur ${etudiants.length}` : ""}
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

      {/* Fenêtres modales (formulaires Ant Design) */}
      <AddEtudiantModal
        open={addModal.open}
        initialTab={addModal.tab}
        classes={classes}
        selectedClasseId={targetClasseId}
        onSelectClasse={setTargetClasseId}
        onClose={() => setAddModal((s) => ({ ...s, open: false }))}
        onChanged={() => loadData()}
      />

      <EditEtudiantModal
        etudiant={editingEtudiant}
        classes={classes}
        currentClasseId={editingEtudiant?.classeId ?? ""}
        onClose={() => setEditingEtudiant(null)}
        onSaved={async () => {
          setEditingEtudiant(null);
          await loadData();
        }}
      />
    </div>
  );
}
