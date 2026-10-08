"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Users,
  Plus,
  FileSpreadsheet,
  Upload,
  BookOpen,
  Trash2,
  CheckCircle2,
  Mail,
  Phone,
  Search,
  Pencil,
  GraduationCap,
  ClipboardPaste,
  Download,
  Sparkles,
  ArrowRight,
  Check,
  X,
  ExternalLink,
  Filter,
} from "lucide-react";

interface ClasseSummary {
  id: string;
  code: string;
  nom: string;
  anneeScolaire: string;
  _count?: { etudiants: number };
}

interface EtudiantItem {
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
  const [etudiants, setEtudiants] = useState<EtudiantItem[]>([]);
  const [classes, setClasses] = useState<ClasseSummary[]>([]);
  const [selectedClasseFilter, setSelectedClasseFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal Inscription Étudiants (Multi-modes)
  const [showAddEtudiant, setShowAddEtudiant] = useState(false);
  const [addEtudiantTab, setAddEtudiantTab] = useState<"saisie" | "coller" | "excel">("saisie");
  const [targetClasseId, setTargetClasseId] = useState<string>("");
  const [newEtMatricule, setNewEtMatricule] = useState("");
  const [newEtNom, setNewEtNom] = useState("");
  const [newEtPrenom, setNewEtPrenom] = useState("");
  const [newEtContact, setNewEtContact] = useState("");
  const [newEtEmail, setNewEtEmail] = useState("");
  const [quickAddSessionCount, setQuickAddSessionCount] = useState(0);
  const [quickNotice, setQuickNotice] = useState<string | null>(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const nomInputRef = useRef<HTMLInputElement>(null);

  // Mode "Coller une liste"
  const [bulkText, setBulkText] = useState("");
  const [bulkParsed, setBulkParsed] = useState<
    { id: string; matricule: string; nom: string; prenom: string; contact: string; email: string }[]
  >([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Mode Excel
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Modal Modifier Étudiant
  const [editingEtudiant, setEditingEtudiant] = useState<EtudiantItem | null>(null);
  const [editEtMatricule, setEditEtMatricule] = useState("");
  const [editEtNom, setEditEtNom] = useState("");
  const [editEtPrenom, setEditEtPrenom] = useState("");
  const [editEtContact, setEditEtContact] = useState("");
  const [editEtEmail, setEditEtEmail] = useState("");
  const [editEtClasseId, setEditEtClasseId] = useState("");

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Charger les données (toutes les classes de l'établissement pour la gestion des étudiants)
  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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

      setTargetClasseId((prev) => {
        if (prev && validClasses.some((c) => c.id === prev)) return prev;
        if (validClasses.length === 1) return validClasses[0].id;
        if (validClasses.length > 0) return validClasses[0].id;
        return "";
      });
    } catch (err) {
      console.error("Erreur chargement données étudiants:", err);
      setNotification({ type: "error", message: "Erreur lors du chargement des données." });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = (presetClasseId?: string) => {
    let toSelect = "";
    if (presetClasseId && classes.some((c) => c.id === presetClasseId)) {
      toSelect = presetClasseId;
    } else if (selectedClasseFilter !== "ALL" && classes.some((c) => c.id === selectedClasseFilter)) {
      toSelect = selectedClasseFilter;
    } else if (classes.length === 1) {
      toSelect = classes[0].id;
    } else if (targetClasseId && classes.some((c) => c.id === targetClasseId)) {
      toSelect = targetClasseId;
    } else if (classes.length > 0) {
      toSelect = classes[0].id;
    }
    setTargetClasseId(toSelect);

    setQuickAddSessionCount(0);
    setQuickNotice(null);
    setNewEtMatricule("");
    setNewEtNom("");
    setNewEtPrenom("");
    setNewEtContact("");
    setNewEtEmail("");
    setBulkText("");
    setBulkParsed([]);
    setExcelFile(null);
    setImportResult(null);
    setAddEtudiantTab("saisie");
    setShowAddEtudiant(true);
  };

  // Télécharger modèle Excel
  const handleDownloadTemplate = () => {
    try {
      const sampleData = [
        {
          MATRICULE: "34001",
          NOM: "KOUAME",
          PRENOM: "Jean-Marc",
          CONTACT: "07 01 02 03 04",
          EMAIL: "jean.kouame@gmail.com",
        },
        {
          MATRICULE: "34002",
          NOM: "KONE",
          PRENOM: "Aminata",
          CONTACT: "05 11 22 33 44",
          EMAIL: "aminata.kone@gmail.com",
        },
        {
          MATRICULE: "34003",
          NOM: "TRAORE",
          PRENOM: "Bakary",
          CONTACT: "01 55 66 77 88",
          EMAIL: "bakary.traore@gmail.com",
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Auditeurs");
      XLSX.writeFile(workbook, "Modele_Import_Etudiants.xlsx");
    } catch (e) {
      console.error("Erreur téléchargement modèle Excel:", e);
      setNotification({ type: "error", message: "Impossible de générer le fichier modèle." });
    }
  };

  // Exporter la liste actuelle des étudiants en Excel
  const handleExportList = () => {
    if (filteredEtudiants.length === 0) {
      setNotification({ type: "error", message: "Aucun étudiant à exporter." });
      return;
    }

    try {
      const dataToExport = filteredEtudiants.map((et, idx) => ({
        "N°": idx + 1,
        "MATRICULE": et.matricule,
        "NOM": et.nom,
        "PRENOM": et.prenom,
        "CLASSE": et.classe?.code || "-",
        "CONTACT": et.contact || "",
        "EMAIL": et.email || "",
        "PRESENCES_EFFECTUEES": et._count?.presences || 0,
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Liste_Auditeurs");
      const currentClassCode = classes.find((c) => c.id === selectedClasseFilter)?.code || "Toutes_Classes";
      XLSX.writeFile(workbook, `Liste_Etudiants_${currentClassCode}.xlsx`);
    } catch (e) {
      console.error("Erreur export étudiants:", e);
      setNotification({ type: "error", message: "Erreur lors de l'exportation." });
    }
  };

  // 1. Saisie manuelle rapide (un par un avec enchaînement instantané)
  const handleAddEtudiantSingle = async (e?: React.FormEvent, keepOpen = true) => {
    if (e) e.preventDefault();
    if (!targetClasseId) {
      setQuickNotice("Veuillez d'abord sélectionner une classe cible.");
      return;
    }

    if (!newEtNom.trim()) {
      setQuickNotice("Le nom de famille est obligatoire.");
      return;
    }

    setSingleLoading(true);
    setQuickNotice(null);

    try {
      const res = await fetch("/api/etudiants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricule: newEtMatricule.trim() || undefined,
          nom: newEtNom.trim().toUpperCase(),
          prenom: newEtPrenom.trim(),
          contact: newEtContact.trim(),
          email: newEtEmail.trim(),
          classeId: targetClasseId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setQuickNotice(`❌ ${err.error || "Erreur lors de l'enregistrement"}`);
        setSingleLoading(false);
        return;
      }

      const created = await res.json();
      setQuickAddSessionCount((prev) => prev + 1);
      const savedNom = newEtNom.trim().toUpperCase();
      const savedPrenom = newEtPrenom.trim();
      setQuickNotice(`✓ ${savedNom} ${savedPrenom} enregistré(e) avec succès (Matricule : ${created.matricule || "Attribué"}) !`);

      if (keepOpen) {
        setNewEtNom("");
        setNewEtPrenom("");
        setNewEtContact("");
        setNewEtEmail("");
        const currNum = parseInt(created.matricule || newEtMatricule, 10);
        if (!isNaN(currNum)) {
          setNewEtMatricule(String(currNum + 1));
        } else {
          setNewEtMatricule("");
        }
        await loadData(true);
        setTimeout(() => nomInputRef.current?.focus(), 50);
      } else {
        setShowAddEtudiant(false);
        setNewEtMatricule("");
        setNewEtNom("");
        setNewEtPrenom("");
        setNewEtContact("");
        setNewEtEmail("");
        setNotification({
          type: "success",
          message: `Auditeur ${savedNom} ${savedPrenom} inscrit avec succès !`,
        });
        await loadData();
      }
    } catch {
      setQuickNotice("❌ Erreur réseau lors de l'inscription.");
    } finally {
      setSingleLoading(false);
    }
  };

  // 2. Découpage intelligent de texte collé
  const handleBulkTextChange = (text: string) => {
    setBulkText(text);
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    const parsed = lines
      .map((line, idx) => {
        let parts: string[] = [];
        if (line.includes("\t")) {
          parts = line.split("\t").map((p) => p.trim()).filter(Boolean);
        } else if (line.includes(";")) {
          parts = line.split(";").map((p) => p.trim()).filter(Boolean);
        } else if (line.includes(",")) {
          parts = line.split(",").map((p) => p.trim()).filter(Boolean);
        } else {
          parts = line.split(/\s+/).map((p) => p.trim()).filter(Boolean);
        }

        let matricule = "";
        let nom = "";
        let prenom = "";
        let contact = "";
        let email = "";

        const remainingWords: string[] = [];

        parts.forEach((part) => {
          if (part.includes("@")) {
            email = part;
          } else if (/^[+0-9\s.-]{8,}$/.test(part) && !/[a-zA-Z]/.test(part)) {
            contact = part;
          } else {
            remainingWords.push(part);
          }
        });

        if (
          remainingWords.length >= 2 &&
          (/^\d+$/.test(remainingWords[0]) || /^[A-Z0-9-]{4,}$/i.test(remainingWords[0])) &&
          !/^[A-ZÀ-ÖØ-öø-ÿ]+$/i.test(remainingWords[0])
        ) {
          matricule = remainingWords.shift() || "";
        }

        if (remainingWords.length > 0) {
          nom = remainingWords[0];
          prenom = remainingWords.slice(1).join(" ");
        }

        return {
          id: `bulk-${idx}-${Date.now()}`,
          matricule,
          nom: nom.toUpperCase(),
          prenom,
          contact,
          email,
        };
      })
      .filter((item) => item.nom.length > 0);

    setBulkParsed(parsed);
  };

  const handleRemoveBulkRow = (id: string) => {
    setBulkParsed((prev) => prev.filter((item) => item.id !== id));
  };

  // 3. Enregistrement en masse des étudiants collés
  const handleBulkSubmit = async () => {
    if (!targetClasseId) {
      setNotification({ type: "error", message: "Veuillez choisir une classe de destination." });
      return;
    }
    if (bulkParsed.length === 0) return;

    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/etudiants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classeId: targetClasseId,
          etudiants: bulkParsed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({
          type: "error",
          message: data.error || "Erreur lors de l'enregistrement en masse.",
        });
        setBulkSubmitting(false);
        return;
      }

      setNotification({
        type: "success",
        message: data.message || `${bulkParsed.length} auditeurs inscrits avec succès !`,
      });
      setBulkText("");
      setBulkParsed([]);
      setShowAddEtudiant(false);
      await loadData();
    } catch {
      setNotification({ type: "error", message: "Erreur réseau lors de l'inscription en masse." });
    } finally {
      setBulkSubmitting(false);
    }
  };

  // 4. Import Excel
  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile || !targetClasseId) {
      setNotification({ type: "error", message: "Veuillez choisir un fichier et une classe." });
      return;
    }

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", excelFile);
    formData.append("classeId", targetClasseId);

    try {
      const res = await fetch("/api/etudiants/import-excel", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        setNotification({ type: "error", message: json.error || "Erreur lors de l'importation." });
        setImporting(false);
        return;
      }

      setImportResult(json.message);
      setNotification({ type: "success", message: json.message });
      setExcelFile(null);
      await loadData();
    } catch {
      setNotification({ type: "error", message: "Erreur réseau lors de l'import Excel." });
    } finally {
      setImporting(false);
    }
  };

  // Modifier un étudiant
  const openEditModal = (et: EtudiantItem) => {
    setEditingEtudiant(et);
    setEditEtMatricule(et.matricule);
    setEditEtNom(et.nom);
    setEditEtPrenom(et.prenom);
    setEditEtContact(et.contact || "");
    setEditEtEmail(et.email || "");
    setEditEtClasseId(et.classeId);
  };

  const handleUpdateEtudiant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEtudiant) return;

    try {
      const res = await fetch(`/api/etudiants/${editingEtudiant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricule: editEtMatricule,
          nom: editEtNom,
          prenom: editEtPrenom,
          contact: editEtContact,
          email: editEtEmail,
          classeId: editEtClasseId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setNotification({ type: "error", message: err.error || "Erreur modification" });
        return;
      }

      setNotification({ type: "success", message: "Auditeur mis à jour avec succès !" });
      setEditingEtudiant(null);
      await loadData();
    } catch {
      setNotification({ type: "error", message: "Erreur réseau" });
    }
  };

  const handleDeleteEtudiant = async (etudiantId: string, nomComplet: string) => {
    if (
      !confirm(
        `Voulez-vous vraiment supprimer l'auditeur "${nomComplet}" ?\n\nSes séances de présence et notes associées seront définitivement supprimées.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/etudiants/${etudiantId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        setNotification({ type: "error", message: err.error || "Erreur suppression" });
        return;
      }

      setNotification({ type: "success", message: "Auditeur supprimé avec succès." });
      await loadData();
    } catch {
      setNotification({ type: "error", message: "Erreur réseau" });
    }
  };

  // Filtrage des étudiants
  const filteredEtudiants = etudiants.filter((et) => {
    // Filtre par classe
    if (selectedClasseFilter !== "ALL" && et.classeId !== selectedClasseFilter) {
      return false;
    }
    // Filtre par recherche
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        et.matricule.toLowerCase().includes(q) ||
        et.nom.toLowerCase().includes(q) ||
        et.prenom.toLowerCase().includes(q) ||
        (et.contact && et.contact.includes(q)) ||
        (et.email && et.email.toLowerCase().includes(q)) ||
        (et.classe?.code && et.classe.code.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <EtudiantsUrlParamsHandler onOpenAdd={(cls) => openAddModal(cls)} />
      </Suspense>

      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-600" />
            Répertoire des Étudiants & Auditeurs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gérez vos listes d&apos;élèves par classe, inscrivez de nouveaux auditeurs et suivez leurs présences
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <button
            onClick={() => handleDownloadTemplate()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition"
            title="Télécharger le modèle Excel pré-formaté"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Modèle Excel
          </button>
          <button
            onClick={() => handleExportList()}
            disabled={filteredEtudiants.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
            title="Exporter la liste actuelle en Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Exporter (.xlsx)
          </button>
          <button
            onClick={() => openAddModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            Inscrire des auditeurs
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100">
            &times;
          </button>
        </div>
      )}

      {/* Cartes de statistiques rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Auditeurs
            </p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{etudiants.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Classes Associées
            </p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{classes.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Filter className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Auditeurs Affichés
            </p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{filteredEtudiants.length}</p>
          </div>
        </div>
      </div>

      {/* Filtres par classe et barre de recherche */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Onglets Filtre Classe */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedClasseFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedClasseFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Toutes les classes ({etudiants.length})
            </button>
            {classes.map((cls) => {
              const countInClass = etudiants.filter((e) => e.classeId === cls.id).length;
              const isSelected = selectedClasseFilter === cls.id;
              return (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClasseFilter(cls.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <span>{cls.code}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                    {countInClass}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Recherche */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher par nom, matricule, contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tableau des étudiants */}
        {classes.length === 0 ? (
          <div className="p-10 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">
              Aucune classe n&apos;a encore été créée dans l&apos;établissement
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Pour inscrire des étudiants, créez d&apos;abord la première classe de l&apos;établissement.
            </p>
            <a
              href="/dashboard/classes"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Créer une classe
            </a>
          </div>
        ) : etudiants.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200 space-y-4 my-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Vous n&apos;avez encore aucun auditeur inscrit
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Inscrivez vos premiers élèves en quelques secondes grâce à nos modes rapides :
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setAddEtudiantTab("saisie");
                  openAddModal();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                Saisie manuelle rapide (1 par 1)
              </button>
              <button
                onClick={() => {
                  setAddEtudiantTab("coller");
                  openAddModal();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition"
              >
                <ClipboardPaste className="w-4 h-4" />
                Coller une liste (WhatsApp / Word)
              </button>
              <button
                onClick={() => {
                  setAddEtudiantTab("excel");
                  openAddModal();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Importer fichier Excel (.xlsx)
              </button>
            </div>
          </div>
        ) : filteredEtudiants.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">
            Aucun auditeur ne correspond à votre filtre ou à votre recherche &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                  <th className="px-4 py-3 w-12">N°</th>
                  <th className="px-4 py-3 w-28">Matricule</th>
                  <th className="px-4 py-3">Nom et Prénom</th>
                  <th className="px-4 py-3">Classe</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-center">Présences</th>
                  <th className="px-4 py-3 text-center">Fiche</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEtudiants.map((et, idx) => (
                  <tr key={et.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">
                      {et.matricule}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {et.nom} {et.prenom}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 font-mono font-bold text-xs border border-blue-200">
                        {et.classe?.code || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {et.contact ? (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" /> {et.contact}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {et.email ? (
                        <span className="flex items-center gap-1 truncate max-w-48" title={et.email}>
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {et.email}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {et._count?.presences || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a
                        href={`/etudiant/${et.matricule}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition"
                      >
                        Profil <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(et)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Modifier l'auditeur"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEtudiant(et.id, `${et.nom} ${et.prenom}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Supprimer l'auditeur"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Inscription Étudiants (Multi-modes : Rapide, Copier-Coller, Excel) */}
      {showAddEtudiant && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl space-y-5 my-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* En-tête du Modal */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-blue-600" />
                  Inscrire des auditeurs
                </h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-600">Classe de destination :</span>
                  <select
                    value={targetClasseId}
                    onChange={(e) => setTargetClasseId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Choisir une classe de destination --</option>
                    {classes.map((c) => {
                      const countInClass = c._count?.etudiants ?? etudiants.filter((e) => e.classeId === c.id).length;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.code} – {c.nom} ({c.anneeScolaire}) • {countInClass} auditeur{countInClass > 1 ? "s" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <button
                onClick={() => setShowAddEtudiant(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!targetClasseId && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-center gap-2">
                <span>⚠️ Veuillez sélectionner une classe de destination ci-dessus pour pouvoir inscrire les auditeurs.</span>
              </div>
            )}

            {/* Onglets de sélection du mode d'ajout */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAddEtudiantTab("saisie")}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition ${
                  addEtudiantTab === "saisie"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Saisie Rapide (1 par 1)</span>
              </button>
              <button
                type="button"
                onClick={() => setAddEtudiantTab("coller")}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition ${
                  addEtudiantTab === "coller"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ClipboardPaste className="w-4 h-4" />
                <span>Coller une liste (en masse)</span>
              </button>
              <button
                type="button"
                onClick={() => setAddEtudiantTab("excel")}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition ${
                  addEtudiantTab === "excel"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Fichier Excel (.xlsx)</span>
              </button>
            </div>

            {/* --- ONGLET 1 : SAISIE MANUELLE RAPIDE (CONTINUE) --- */}
            {addEtudiantTab === "saisie" && (
              <div className="space-y-4">
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      Mode saisie ultra-rapide au clavier :
                    </p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Remplissez les champs et tapez <strong>Entrée ↵</strong> pour enregistrer et passer immédiatement au suivant sans utiliser la souris. Le matricule est auto-généré si vous le laissez vide.
                    </p>
                  </div>
                </div>

                {quickNotice && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                      quickNotice.startsWith("✓")
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                  >
                    <span>{quickNotice}</span>
                    <button
                      onClick={() => setQuickNotice(null)}
                      className="text-xs opacity-70 hover:opacity-100"
                    >
                      &times;
                    </button>
                  </div>
                )}

                <form
                  onSubmit={(e) => handleAddEtudiantSingle(e, true)}
                  className="space-y-3.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nom de famille <span className="text-rose-500">*</span>
                      </label>
                      <input
                        ref={nomInputRef}
                        type="text"
                        required
                        autoFocus
                        placeholder="Ex: KOUAME"
                        value={newEtNom}
                        onChange={(e) => setNewEtNom(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Prénom(s)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Jean-Marc"
                        value={newEtPrenom}
                        onChange={(e) => setNewEtPrenom(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Matricule <span className="text-slate-400 font-normal">(Optionnel)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Auto si vide"
                        value={newEtMatricule}
                        onChange={(e) => setNewEtMatricule(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Contact / Téléphone
                      </label>
                      <input
                        type="text"
                        placeholder="07 00 00 00 00"
                        value={newEtContact}
                        onChange={(e) => setNewEtContact(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="etudiant@ecole.ci"
                        value={newEtEmail}
                        onChange={(e) => setNewEtEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-500 font-medium">
                      {quickAddSessionCount > 0 ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          {quickAddSessionCount} auditeur(s) inscrit(s) dans cette session
                        </span>
                      ) : (
                        <span className="text-slate-400">Aucun auditeur ajouté pour l&apos;instant</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddEtudiant(false);
                          if (quickAddSessionCount > 0) loadData();
                        }}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                      >
                        {quickAddSessionCount > 0 ? "Terminer" : "Annuler"}
                      </button>
                      <button
                        type="button"
                        disabled={singleLoading || !newEtNom.trim()}
                        onClick={(e) => handleAddEtudiantSingle(e, false)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition"
                      >
                        Enregistrer et Fermer
                      </button>
                      <button
                        type="submit"
                        disabled={singleLoading || !newEtNom.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
                      >
                        <span>{singleLoading ? "Inscription..." : "Enregistrer et Suivant ↵"}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* --- ONGLET 2 : COPIER-COLLER UNE LISTE EN MASSE --- */}
            {addEtudiantTab === "coller" && (
              <div className="space-y-4">
                <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3 text-xs text-indigo-900">
                  <p className="font-semibold flex items-center gap-1.5">
                    <ClipboardPaste className="w-4 h-4 text-indigo-600" />
                    Collez votre liste d&apos;élèves depuis WhatsApp, Word ou Excel :
                  </p>
                  <p className="text-[11px] text-indigo-700 mt-1">
                    Un auditeur par ligne. Le système extrait automatiquement les noms, prénoms, téléphones et emails. Les matricules sont générés automatiquement si omis.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Liste brute des étudiants
                  </label>
                  <textarea
                    rows={5}
                    value={bulkText}
                    onChange={(e) => handleBulkTextChange(e.target.value)}
                    placeholder={`Collez ici votre liste...\nExemple:\nKOUAME Jean-Marc 0701020304\nKONE Aminata aminata@gmail.com\nTRAORE Bakary 0511223344\n34005; N'GUESSAN; Ange`}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Aperçu du découpage en temps réel */}
                {bulkParsed.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        {bulkParsed.length} auditeur(s) détecté(s) :
                      </span>
                      <span className="text-slate-400 font-normal text-[11px]">
                        Vérifiez l&apos;aperçu avant de valider
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                          <tr>
                            <th className="px-3 py-2 w-10">N°</th>
                            <th className="px-3 py-2 w-24">Matricule</th>
                            <th className="px-3 py-2">Nom</th>
                            <th className="px-3 py-2">Prénoms</th>
                            <th className="px-3 py-2">Contact</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-2 py-2 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {bulkParsed.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-2 font-mono text-[11px] text-blue-700">
                                {item.matricule || <span className="text-slate-400 italic">Auto</span>}
                              </td>
                              <td className="px-3 py-2 font-bold text-slate-900">{item.nom}</td>
                              <td className="px-3 py-2 text-slate-700">{item.prenom || "-"}</td>
                              <td className="px-3 py-2 text-slate-600 text-[11px]">
                                {item.contact || "-"}
                              </td>
                              <td className="px-3 py-2 text-slate-600 text-[11px]">
                                {item.email || "-"}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBulkRow(item.id)}
                                  className="text-slate-300 hover:text-rose-600 p-1 rounded transition"
                                  title="Retirer cette ligne"
                                >
                                  &times;
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : bulkText.trim().length > 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    Aucun nom n&apos;a pu être extrait. Vérifiez que chaque ligne contient au moins un nom d&apos;étudiant.
                  </p>
                ) : null}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddEtudiant(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={bulkParsed.length === 0 || bulkSubmitting}
                    onClick={handleBulkSubmit}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    <span>
                      {bulkSubmitting
                        ? "Inscription en cours..."
                        : `Valider et inscrire ces ${bulkParsed.length} auditeurs`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* --- ONGLET 3 : IMPORT FICHIER EXCEL (.XLSX) --- */}
            {addEtudiantTab === "excel" && (
              <div className="space-y-4">
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      Importation automatique depuis votre fichier Excel
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-1 max-w-md">
                      Format flexible &amp; universel : accepte les fichiers avec ou sans ligne d&apos;en-tête, les listes brutes de noms, ou les feuilles de présence. Les matricules sont générés automatiquement si omis.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-300 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger le modèle Excel type
                  </button>
                </div>

                <form onSubmit={handleImportExcel} className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                      className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    {excelFile && (
                      <p className="text-xs font-semibold text-emerald-700 mt-2 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Fichier sélectionné : {excelFile.name}
                      </p>
                    )}
                  </div>

                  {importResult && (
                    <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                      {importResult}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddEtudiant(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                    >
                      Fermer
                    </button>
                    <button
                      type="submit"
                      disabled={!excelFile || importing}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      {importing ? "Importation en cours..." : "Lancer l'importation vers cette classe"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Modifier un Étudiant */}
      {editingEtudiant && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" />
              Modifier l&apos;auditeur
            </h3>
            <form onSubmit={handleUpdateEtudiant} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Numéro de Matricule
                </label>
                <input
                  type="text"
                  required
                  value={editEtMatricule}
                  onChange={(e) => setEditEtMatricule(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom de famille
                </label>
                <input
                  type="text"
                  required
                  value={editEtNom}
                  onChange={(e) => setEditEtNom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Prénom(s)
                </label>
                <input
                  type="text"
                  value={editEtPrenom}
                  onChange={(e) => setEditEtPrenom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact téléphonique
                </label>
                <input
                  type="text"
                  placeholder="07 00 00 00 00"
                  value={editEtContact}
                  onChange={(e) => setEditEtContact(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adresse Email
                </label>
                <input
                  type="email"
                  placeholder="etudiant@ecole.ci"
                  value={editEtEmail}
                  onChange={(e) => setEditEtEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Classe de rattachement
                </label>
                <select
                  value={editEtClasseId}
                  onChange={(e) => setEditEtClasseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingEtudiant(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
