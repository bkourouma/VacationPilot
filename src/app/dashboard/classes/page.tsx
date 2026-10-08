"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
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
  Edit,
  GraduationCap,
  ClipboardPaste,
  Download,
  Sparkles,
  ArrowRight,
  Check,
  X,
  FileText,
} from "lucide-react";

interface MatiereItem {
  id: string;
  matiereId?: string;
  coursId?: string;
  code: string;
  nom: string;
  coefficient: number;
  volumeHoraire?: number;
  heuresEffectuees?: number;
  heuresRestantes?: number;
  progression?: number;
  enseignantId?: string | null;
  enseignant?: { id: string; nom: string; email: string | null } | null;
}

interface EtudiantItem {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  contact: string | null;
  email: string | null;
}

interface ClasseFull {
  id: string;
  code: string;
  nom: string;
  anneeScolaire: string;
  matieres: MatiereItem[];
  etudiants: EtudiantItem[];
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
  const [classes, setClasses] = useState<ClasseFull[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("ENSEIGNANT");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Recherche étudiants
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Nouvelle Classe
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassCode, setNewClassCode] = useState("");
  const [newClassNom, setNewClassNom] = useState("");
  const [newClassAnnee, setNewClassAnnee] = useState("2025-2026");

  // Modal Modifier Classe
  const [showEditClass, setShowEditClass] = useState(false);
  const [editClassCode, setEditClassCode] = useState("");
  const [editClassNom, setEditClassNom] = useState("");
  const [editClassAnnee, setEditClassAnnee] = useState("");

  // Modal Choisir Classe & Programmer un Cours
  const [showAddMatiere, setShowAddMatiere] = useState(false);
  const [loadingAvailableClasses, setLoadingAvailableClasses] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<
    { id: string; code: string; nom: string; anneeScolaire: string; _count?: { etudiants: number } }[]
  >([]);
  const [targetClasseId, setTargetClasseId] = useState<string>("");
  const [matiereSource, setMatiereSource] = useState<"EXISTING" | "NEW">("EXISTING");
  const [catalogMatieres, setCatalogMatieres] = useState<
    { id: string; code: string; nom: string; enseignantId: string | null; enseignant?: { nom: string } | null }[]
  >([]);
  const [enseignantsList, setEnseignantsList] = useState<
    { id: string; nom: string; username: string }[]
  >([]);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [selectedCatalogMatiereId, setSelectedCatalogMatiereId] = useState("");
  const [selectedCoursEnseignantId, setSelectedCoursEnseignantId] = useState("");
  const [newMatCode, setNewMatCode] = useState("");
  const [newMatNom, setNewMatNom] = useState("");
  const [newMatCoef, setNewMatCoef] = useState<number>(1.0);
  const [newMatVolumeHoraire, setNewMatVolumeHoraire] = useState<number>(20.0);

  // Modal Modifier Cours / Matière
  const [editingMatiere, setEditingMatiere] = useState<MatiereItem | null>(null);
  const [editMatCode, setEditMatCode] = useState("");
  const [editMatNom, setEditMatNom] = useState("");
  const [editMatCoef, setEditMatCoef] = useState<number>(1.0);
  const [editMatVolumeHoraire, setEditMatVolumeHoraire] = useState<number>(20.0);
  const [editMatEnseignantId, setEditMatEnseignantId] = useState<string>("");

  // Modal Inscription Étudiants (Multi-modes)
  const [showAddEtudiant, setShowAddEtudiant] = useState(false);
  const [addEtudiantTab, setAddEtudiantTab] = useState<"saisie" | "coller" | "excel">("saisie");
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

  // Modal Modifier Étudiant
  const [editingEtudiant, setEditingEtudiant] = useState<EtudiantItem | null>(null);
  const [editEtMatricule, setEditEtMatricule] = useState("");
  const [editEtNom, setEditEtNom] = useState("");
  const [editEtPrenom, setEditEtPrenom] = useState("");
  const [editEtContact, setEditEtContact] = useState("");
  const [editEtEmail, setEditEtEmail] = useState("");
  const [editEtClasseId, setEditEtClasseId] = useState("");

  // État Import Excel
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // 1. Charger les classes et le profil utilisateur
  const loadClasses = async (targetId?: string, silent = false) => {
    try {
      if (!silent) setLoading(true);
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
        if (Array.isArray(ensData)) {
          setEnseignantsList(ensData);
        }
      }

      const list = await res.json();
      if (Array.isArray(list)) {
        const fullClasses = await Promise.all(
          list.map(async (c: { id: string }) => {
            const detailRes = await fetch(`/api/classes/${c.id}?all=true`);
            return await detailRes.json();
          })
        );
        setClasses(fullClasses);
        if (fullClasses.length > 0) {
          const toSelect = targetId || selectedClasseId;
          if (toSelect && fullClasses.some((c) => c.id === toSelect)) {
            setSelectedClasseId(toSelect);
          } else {
            setSelectedClasseId(fullClasses[0].id);
          }
        } else {
          setSelectedClasseId("");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const openAddMatiereModal = useCallback((classeId?: string) => {
    setShowAddMatiere(true);
    setNewMatCode("");
    setNewMatNom("");
    setNewMatCoef(1.0);
    setNewMatVolumeHoraire(20.0);
    setMatiereSource("EXISTING");
    setSelectedCatalogMatiereId("");
    setSelectedCoursEnseignantId(userRole === "ENSEIGNANT" ? currentUserId : "");
    const chosen = classeId || selectedClasseId || "";
    setTargetClasseId(chosen);
    setLoadingAvailableClasses(true);

    Promise.all([
      fetch("/api/classes?all=true").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/matieres").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/enseignants").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([allCls, allMat, allEns]) => {
        if (Array.isArray(allCls)) {
          setAvailableClasses(allCls);
          if (!chosen && allCls.length > 0) {
            setTargetClasseId(allCls[0].id);
          }
        }
        if (Array.isArray(allMat)) {
          setCatalogMatieres(allMat);
          if (allMat.length > 0) {
            setSelectedCatalogMatiereId(allMat[0].id);
            if (userRole === "ADMINISTRATION" && allMat[0].enseignantId) {
              setSelectedCoursEnseignantId(allMat[0].enseignantId);
            } else if (userRole === "ENSEIGNANT") {
              setSelectedCoursEnseignantId(currentUserId);
            }
          } else {
            setMatiereSource("NEW");
          }
        }
        if (Array.isArray(allEns)) {
          setEnseignantsList(allEns);
        }
      })
      .catch((e) => {
        console.error("Erreur chargement données programmation cours:", e);
      })
      .finally(() => {
        setLoadingAvailableClasses(false);
      });
  }, [selectedClasseId, userRole, currentUserId]);

  const openAddEtudiantModal = useCallback(() => {
    setAddEtudiantTab("saisie");
    setQuickAddSessionCount(0);
    setQuickNotice(null);
    setShowAddEtudiant(true);
  }, []);

  useEffect(() => {
    loadClasses();
  }, []);

  const currentClasse = classes.find((c) => c.id === selectedClasseId);

  // --- ACTIONS SUR LES CLASSES ---

  const handleCreateClasse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newClassCode,
          nom: newClassNom,
          anneeScolaire: newClassAnnee,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setNotification({ type: "error", message: err.error || "Erreur création" });
        return;
      }

      const created = await res.json();
      setShowAddClass(false);
      setNewClassCode("");
      setNewClassNom("");
      await loadClasses(created.id);
      setSelectedClasseId(created.id);
      setQuickAddSessionCount(0);
      setQuickNotice(null);
      setAddEtudiantTab("saisie");
      setShowAddEtudiant(true);
      setNotification({
        type: "success",
        message: `Classe "${created.code}" créée avec succès ! Vous pouvez maintenant inscrire vos étudiants ci-dessous.`,
      });
    } catch {
      setNotification({ type: "error", message: "Erreur réseau" });
    }
  };

  const openEditClassModal = () => {
    if (!currentClasse) return;
    setEditClassCode(currentClasse.code);
    setEditClassNom(currentClasse.nom);
    setEditClassAnnee(currentClasse.anneeScolaire);
    setShowEditClass(true);
  };

  const handleUpdateClasse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClasseId) return;

    try {
      const res = await fetch(`/api/classes/${selectedClasseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editClassCode,
          nom: editClassNom,
          anneeScolaire: editClassAnnee,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setNotification({ type: "error", message: err.error || "Erreur modification" });
        return;
      }

      setNotification({ type: "success", message: "Classe modifiée avec succès !" });
      setShowEditClass(false);
      await loadClasses();
    } catch {
      setNotification({ type: "error", message: "Erreur réseau" });
    }
  };

  const handleDeleteClasse = async () => {
    if (!currentClasse) return;
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer définitivement la classe "${currentClasse.nom} (${currentClasse.code})" ?\n\nAttention : toutes les matières, étudiants, séances de présence et notes associées seront également supprimés.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/classes/${currentClasse.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        setNotification({ type: "error", message: err.error || "Erreur suppression" });
        return;
      }

      setNotification({ type: "success", message: "Classe supprimée avec succès." });
      await loadClasses();
    } catch {
      setNotification({ type: "error", message: "Erreur réseau" });
    }
  };

  // --- ACTIONS SUR LES MATIÈRES ---

  const handleAddMatiere = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalClasseId = targetClasseId || selectedClasseId;

    if (targetClasseId === "__NEW__") {
      if (!newClassCode.trim() || !newClassNom.trim()) {
        setNotification({
          type: "error",
          message: "Veuillez renseigner le code et le nom de la nouvelle classe.",
        });
        return;
      }

      try {
        const classRes = await fetch("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: newClassCode.trim().toUpperCase(),
            nom: newClassNom.trim(),
            anneeScolaire: newClassAnnee.trim() || "2025-2026",
          }),
        });

        if (!classRes.ok) {
          const err = await classRes.json();
          setNotification({
            type: "error",
            message: err.error || "Erreur création de la classe",
          });
          return;
        }

        const newClassData = await classRes.json();
        finalClasseId = newClassData.id;
      } catch {
        setNotification({
          type: "error",
          message: "Erreur réseau lors de la création de classe.",
        });
        return;
      }
    }

    if (!finalClasseId) {
      setNotification({
        type: "error",
        message: "Veuillez sélectionner ou créer une classe.",
      });
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        coefficient: 1.0,
        volumeHoraire: newMatVolumeHoraire,
        enseignantId: userRole === "ENSEIGNANT" ? currentUserId : (selectedCoursEnseignantId || null),
      };

      if (matiereSource === "EXISTING") {
        if (!selectedCatalogMatiereId) {
          setNotification({
            type: "error",
            message: "Veuillez sélectionner une matière du catalogue.",
          });
          return;
        }
        payload.matiereId = selectedCatalogMatiereId;
      } else {
        if (!newMatCode.trim() || !newMatNom.trim()) {
          setNotification({
            type: "error",
            message: "Le code et le nom de la matière sont obligatoires.",
          });
          return;
        }
        payload.code = newMatCode.trim().toUpperCase();
        payload.nom = newMatNom.trim();
      }

      const res = await fetch(`/api/classes/${finalClasseId}/cours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        setNotification({
          type: "error",
          message: err.error || "Erreur lors de la programmation du cours",
        });
        return;
      }

      setNotification({
        type: "success",
        message: "Cours programmé avec succès dans la classe !",
      });
      setShowAddMatiere(false);
      setNewMatCode("");
      setNewMatNom("");
      setNewMatVolumeHoraire(20.0);
      setSelectedClasseId(finalClasseId);
      await loadClasses();
    } catch {
      setNotification({ type: "error", message: "Erreur réseau" });
    }
  };

  const openEditMatiereModal = (m: MatiereItem) => {
    setEditingMatiere(m);
    setEditMatCode(m.code);
    setEditMatNom(m.nom);
    setEditMatCoef(m.coefficient || 1.0);
    setEditMatVolumeHoraire(m.volumeHoraire || 20.0);
    setEditMatEnseignantId(m.enseignantId || m.enseignant?.id || "");
    if (enseignantsList.length === 0) {
      fetch("/api/enseignants")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setEnseignantsList(data);
        })
        .catch((err) => console.error("Erreur chargement enseignants:", err));
    }
  };

  const handleUpdateMatiere = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatiere) return;

    try {
      const res = await fetch(`/api/cours/${editingMatiere.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editMatCode,
          nom: editMatNom,
          coefficient: editMatCoef,
          volumeHoraire: editMatVolumeHoraire,
          enseignantId: userRole === "ADMINISTRATION" ? (editMatEnseignantId || null) : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setNotification({ type: "error", message: err.error || "Erreur modification cours" });
        return;
      }

      setNotification({ type: "success", message: "Cours programmé mis à jour avec succès !" });
      setEditingMatiere(null);
      await loadClasses();
    } catch {
      setNotification({ type: "error", message: "Erreur réseau" });
    }
  };

  const handleDeleteMatiere = async (matiereId: string, nomMatiere: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer la matière "${nomMatiere}" et tous ses cours ?`)) return;

    try {
      const res = await fetch(`/api/matieres/${matiereId}`, { method: "DELETE" });
      if (res.ok) {
        setNotification({ type: "success", message: "Matière supprimée." });
        await loadClasses();
      } else {
        const err = await res.json();
        setNotification({ type: "error", message: err.error || "Erreur suppression" });
      }
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "Erreur réseau" });
    }
  };

  // --- ACTIONS SUR LES ÉTUDIANTS ---

  // 1. Télécharger un modèle Excel exemple
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
      XLSX.writeFile(workbook, `Modele_Import_Etudiants_${currentClasse?.code || "Classe"}.xlsx`);
    } catch (e) {
      console.error("Erreur téléchargement modèle Excel:", e);
      setNotification({ type: "error", message: "Impossible de générer le fichier modèle." });
    }
  };

  // 2. Saisie manuelle rapide (un par un avec enchaînement instantané)
  const handleAddEtudiantSingle = async (e?: React.FormEvent, keepOpen = true) => {
    if (e) e.preventDefault();
    if (!selectedClasseId) return;

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
          classeId: selectedClasseId,
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
        // Si matricule numérique, préremplir le suivant
        const currNum = parseInt(created.matricule || newEtMatricule, 10);
        if (!isNaN(currNum)) {
          setNewEtMatricule(String(currNum + 1));
        } else {
          setNewEtMatricule("");
        }
        await loadClasses(undefined, true);
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
        await loadClasses();
      }
    } catch {
      setQuickNotice("❌ Erreur réseau lors de l'inscription.");
    } finally {
      setSingleLoading(false);
    }
  };

  // 3. Détection et découpage intelligent de texte collé
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

        // Si le premier mot ressemble à un identifiant ou matricule
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

  // 4. Enregistrement en masse des étudiants collés
  const handleBulkSubmit = async () => {
    if (!selectedClasseId || bulkParsed.length === 0) return;
    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/etudiants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classeId: selectedClasseId,
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
      await loadClasses();
    } catch {
      setNotification({ type: "error", message: "Erreur réseau lors de l'inscription en masse." });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const openEditEtudiantModal = (et: EtudiantItem) => {
    setEditingEtudiant(et);
    setEditEtMatricule(et.matricule);
    setEditEtNom(et.nom);
    setEditEtPrenom(et.prenom);
    setEditEtContact(et.contact || "");
    setEditEtEmail(et.email || "");
    setEditEtClasseId(selectedClasseId);
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
      await loadClasses();
    } catch {
      setNotification({ type: "error", message: "Erreur réseau" });
    }
  };

  const handleDeleteEtudiant = async (etudiantId: string, nomComplet: string) => {
    if (
      !confirm(
        `Voulez-vous vraiment supprimer l'auditeur "${nomComplet}" de la classe ?\n\nSes présences et notes associées seront définitivement supprimées.`
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
      await loadClasses();
    } catch {
      setNotification({ type: "error", message: "Erreur réseau" });
    }
  };

  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile || !selectedClasseId) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", excelFile);
    formData.append("classeId", selectedClasseId);

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
      await loadClasses();
    } catch {
      setNotification({ type: "error", message: "Erreur réseau lors de l'import." });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredEtudiants =
    currentClasse?.etudiants.filter((et) => {
      const q = searchQuery.toLowerCase();
      return (
        et.matricule.toLowerCase().includes(q) ||
        et.nom.toLowerCase().includes(q) ||
        et.prenom.toLowerCase().includes(q) ||
        (et.contact && et.contact.includes(q)) ||
        (et.email && et.email.toLowerCase().includes(q))
      );
    }) || [];

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <ClassesUrlParamsHandler
          onAddMatiere={openAddMatiereModal}
          onAddEtudiant={openAddEtudiantModal}
        />
      </Suspense>

      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-600" />
            Gestion des Classes, Matières & Étudiants
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Rejoignez une classe pour y ajouter votre matière, ou créez et gérez vos filières et auditeurs
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <a
            href="/dashboard/etudiants"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            <Users className="w-4 h-4 text-slate-600" />
            Répertoire Étudiants &rarr;
          </a>
          <button
            onClick={() => openAddMatiereModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            Programmer un cours
          </button>
          <button
            onClick={() => setShowAddClass(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4 text-slate-400" />
            Nouvelle Classe
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

      {/* Cas où aucune classe/matière n'est associée à l'enseignant */}
      {classes.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 text-center max-w-2xl mx-auto shadow-xs my-6 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Bienvenue ! Vous n&apos;avez pas encore de classe ou de matière
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed max-w-lg mx-auto">
              Les classes de l&apos;établissement sont partagées. Pour commencer à faire l&apos;appel, gérer vos volumes horaires et saisir vos notes, choisissez la classe dans laquelle vous donnez cours et configurez votre matière.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => openAddMatiereModal()}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Choisir une classe & ajouter ma matière
            </button>
            <button
              onClick={() => setShowAddClass(true)}
              className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
            >
              Créer une nouvelle classe
            </button>
          </div>
        </div>
      ) : (
        /* Barre de sélection de classe active */
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClasseId(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                selectedClasseId === c.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>{c.code}</span>
              <span className="opacity-80 text-[10px]">({c.etudiants.length} auditeurs)</span>
            </button>
          ))}
        </div>
      )}

      {currentClasse && (
        <div className="space-y-6">
          {/* Fiche d'information de la classe active */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono font-bold text-xs">
                  {currentClasse.code}
                </span>
                <h2 className="text-lg font-bold text-slate-900">{currentClasse.nom}</h2>
                <button
                  onClick={openEditClassModal}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                  title="Modifier la classe"
                >
                  <Pencil className="w-3.5 h-3.5 text-blue-600" />
                  Modifier
                </button>
                <button
                  onClick={handleDeleteClasse}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition"
                  title="Supprimer la classe"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  Supprimer
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Année Scolaire : <strong className="text-slate-700">{currentClasse.anneeScolaire}</strong> &bull;{" "}
                {currentClasse.etudiants.length} auditeur(s) inscrits &bull; {currentClasse.matieres.length} matière(s)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openAddMatiereModal(currentClasse?.id)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                + Programmer un cours
              </button>
              <button
                onClick={() => {
                  setAddEtudiantTab("saisie");
                  setQuickAddSessionCount(0);
                  setQuickNotice(null);
                  setShowAddEtudiant(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-blue-700 transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Inscrire des auditeurs
              </button>
            </div>
          </div>

          {/* Deux colonnes : Matières & Module Import Excel */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Matières de la classe */}
            <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Matières enseignées ({currentClasse.matieres.length})
                </h3>
                <button
                  onClick={() => openAddMatiereModal(currentClasse?.id)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  + Nouvelle matière
                </button>
              </div>

              {currentClasse.matieres.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  Aucune matière enregistrée pour cette classe.
                </p>
              ) : (
                <div className="space-y-2">
                  {currentClasse.matieres.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/60 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-700 shrink-0 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                            {m.code}
                          </span>
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {m.nom}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                            {m.volumeHoraire || 20}h prévues
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1.5">
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            <span>Enseignant :</span>
                            <strong className="text-slate-700">
                              {m.enseignant?.nom || "Non assigné"}
                            </strong>
                            {userRole === "ADMINISTRATION" && (
                              <button
                                type="button"
                                onClick={() => openEditMatiereModal(m)}
                                className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline px-1.5 py-0.5 rounded bg-blue-50/80 border border-blue-200/60 transition inline-flex items-center gap-1 cursor-pointer"
                                title="Changer l'enseignant pour ce cours programmé"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                                Changer
                              </button>
                            )}
                          </span>
                          {m.heuresEffectuees !== undefined && (
                            <span className="text-blue-700 font-semibold">
                              {m.heuresEffectuees}h effectuées ({m.progression || 0}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => openEditMatiereModal(m)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white transition"
                          title="Modifier le cours (enseignant, volume horaire, intitulé)"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMatiere(m.id, m.nom)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition"
                          title="Supprimer ce cours de la classe"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Module d'Importation Excel */}
            <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Importer une liste d&apos;étudiants via Excel (.xlsx)
                </h3>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                  title="Télécharger le modèle Excel pré-formaté"
                >
                  <Download className="w-3.5 h-3.5" />
                  Modèle Excel (.xlsx)
                </button>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Importation flexible &amp; universelle : téléversez n&apos;importe quel fichier Excel (avec ou sans ligne d&apos;en-tête, liste brute de noms, relevé ou feuille de présence). Les colonnes et matricules sont détectés automatiquement.
              </p>

              <form onSubmit={handleImportExcel} className="space-y-4 pt-1">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition">
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
                  <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    {importResult}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!excelFile || importing}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {importing ? "Importation en cours..." : "Lancer l'importation vers cette classe"}
                </button>
              </form>
            </div>
          </div>

          {/* Liste des étudiants de la classe */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Auditeurs inscrits ({currentClasse.etudiants.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Liste des élèves pouvant se connecter avec leur matricule
                </p>
              </div>

              {/* Actions & Champ de recherche */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                <button
                  onClick={() => {
                    setAddEtudiantTab("saisie");
                    setQuickAddSessionCount(0);
                    setQuickNotice(null);
                    setShowAddEtudiant(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Inscrire des auditeurs
                </button>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, matricule..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {currentClasse.etudiants.length === 0 ? (
              <div className="p-8 sm:p-10 text-center bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200 space-y-4 my-2">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Aucun auditeur inscrit dans cette classe pour le moment
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Inscrivez vos élèves en choisissant le mode le plus rapide et adapté pour vous :
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setAddEtudiantTab("saisie");
                      setQuickAddSessionCount(0);
                      setQuickNotice(null);
                      setShowAddEtudiant(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Saisie manuelle rapide (1 par 1)
                  </button>
                  <button
                    onClick={() => {
                      setAddEtudiantTab("coller");
                      setShowAddEtudiant(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    Coller une liste (texte / WhatsApp / Word)
                  </button>
                  <button
                    onClick={() => {
                      setAddEtudiantTab("excel");
                      setShowAddEtudiant(true);
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
                Aucun auditeur ne correspond à votre recherche &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-y border-slate-200">
                      <th className="px-4 py-3 w-12">N°</th>
                      <th className="px-4 py-3 w-28">Matricule</th>
                      <th className="px-4 py-3">Nom et Prénom</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3 text-center">Fiche</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEtudiants.map((et, idx) => (
                      <tr key={et.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">
                          {et.matricule}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {et.nom} {et.prenom}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {et.contact ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" /> {et.contact}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {et.email ? (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" /> {et.email}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <a
                            href={`/etudiant/${et.matricule}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition"
                          >
                            Voir profil &rarr;
                          </a>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEditEtudiantModal(et)}
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
        </div>
      )}

      {/* Modal Créer une Classe */}
      {showAddClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Créer une nouvelle classe</h3>
            <form onSubmit={handleCreateClasse} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Code de la classe (ex: LPRIGL-B, MASTER-1)
                </label>
                <input
                  type="text"
                  required
                  placeholder="LPRIGL-B"
                  value={newClassCode}
                  onChange={(e) => setNewClassCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom complet / Filière
                </label>
                <input
                  type="text"
                  required
                  placeholder="Licence Pro RGL - Groupe B"
                  value={newClassNom}
                  onChange={(e) => setNewClassNom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Année Académique
                </label>
                <input
                  type="text"
                  required
                  placeholder="2025-2026"
                  value={newClassAnnee}
                  onChange={(e) => setNewClassAnnee(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddClass(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
                >
                  Créer la classe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modifier une Classe */}
      {showEditClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Modifier la classe
            </h3>
            <form onSubmit={handleUpdateClasse} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Code de la classe
                </label>
                <input
                  type="text"
                  required
                  value={editClassCode}
                  onChange={(e) => setEditClassCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom complet / Filière
                </label>
                <input
                  type="text"
                  required
                  value={editClassNom}
                  onChange={(e) => setEditClassNom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Année Académique
                </label>
                <input
                  type="text"
                  required
                  value={editClassAnnee}
                  onChange={(e) => setEditClassAnnee(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditClass(false)}
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

      {/* Modal Universelle : Choisir une Classe & Programmer un Cours */}
      {showAddMatiere && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Programmer un cours dans une classe
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Associez une matière à une classe et fixez son volume horaire officiel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMatiere(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddMatiere} className="space-y-4">
              {/* Étape 1 : Choix de la classe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Sélectionner la classe cible *
                </label>
                <select
                  value={targetClasseId}
                  onChange={(e) => setTargetClasseId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {loadingAvailableClasses && availableClasses.length === 0 ? (
                    <option value="">Chargement des classes de l&apos;établissement...</option>
                  ) : availableClasses.length === 0 ? (
                    <option value="__NEW__">+ Créer une nouvelle classe</option>
                  ) : (
                    <>
                      <option value="">-- Choisissez la classe dans la liste --</option>
                      {availableClasses.map((ac) => (
                        <option key={ac.id} value={ac.id}>
                          {ac.code} - {ac.nom} ({ac.anneeScolaire})
                          {ac._count?.etudiants !== undefined
                            ? ` • ${ac._count.etudiants} auditeur(s)`
                            : ""}
                        </option>
                      ))}
                      <option value="__NEW__">+ Créer une nouvelle classe...</option>
                    </>
                  )}
                </select>
              </div>

              {/* Si l'enseignant choisit de créer une nouvelle classe directement */}
              {targetClasseId === "__NEW__" && (
                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2.5 animate-in fade-in duration-150">
                  <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    Création rapide de la nouvelle classe
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Code de la classe * (ex: L3-INFO, M1-GL)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="L3-INFO"
                      value={newClassCode}
                      onChange={(e) => setNewClassCode(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Nom complet / Filière * (ex: Licence 3 Informatique)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Licence 3 Informatique"
                      value={newClassNom}
                      onChange={(e) => setNewClassNom(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Année Académique *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="2025-2026"
                      value={newClassAnnee}
                      onChange={(e) => setNewClassAnnee(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* Étape 2 : Matière à dispenser */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800">
                    2. Matière à dispenser
                  </p>
                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setMatiereSource("EXISTING")}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                        matiereSource === "EXISTING"
                          ? "bg-white text-blue-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Catalogue ({catalogMatieres.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatiereSource("NEW")}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                        matiereSource === "NEW"
                          ? "bg-white text-blue-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      + Créer nouvelle
                    </button>
                  </div>
                </div>

                {matiereSource === "EXISTING" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sélectionner la matière dans le catalogue *
                    </label>
                    {catalogMatieres.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                        Aucune matière dans le catalogue. Cliquez sur &quot;+ Créer nouvelle&quot; ci-dessus pour en créer une.
                      </div>
                    ) : (
                      <select
                        value={selectedCatalogMatiereId}
                        onChange={(e) => {
                          const matId = e.target.value;
                          setSelectedCatalogMatiereId(matId);
                          if (userRole === "ADMINISTRATION") {
                            const found = catalogMatieres.find((m) => m.id === matId);
                            if (found && found.enseignantId) {
                              setSelectedCoursEnseignantId(found.enseignantId);
                            }
                          } else {
                            setSelectedCoursEnseignantId(currentUserId);
                          }
                        }}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Choisissez la matière --</option>
                        {catalogMatieres.map((m) => (
                          <option key={m.id} value={m.id}>
                            [{m.code}] {m.nom} {m.enseignant ? `(Resp: ${m.enseignant.nom})` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Code Matière (ex: GL, RESEAUX, DEVWEB) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="DEVWEB"
                        value={newMatCode}
                        onChange={(e) => setNewMatCode(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Intitulé complet de la matière *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Développement Web & Applications Cloud"
                        value={newMatNom}
                        onChange={(e) => setNewMatNom(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}

                {/* Enseignant qui donne ce cours : verrouillé à soi-même si enseignant */}
                {userRole === "ADMINISTRATION" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Enseignant en charge de ce cours dans cette classe *
                    </label>
                    <select
                      value={selectedCoursEnseignantId}
                      onChange={(e) => setSelectedCoursEnseignantId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Sélectionner un enseignant --</option>
                      {enseignantsList.map((ens) => (
                        <option key={ens.id} value={ens.id}>
                          {ens.nom} ({ens.username})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Enseignant en charge de ce cours
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>Vous-même ({currentUserName || "Enseignant connecté"})</span>
                      <span className="text-[10px] text-slate-400 ml-auto italic">Assignation automatique</span>
                    </div>
                  </div>
                )}

                {/* Volume Horaire officiel (le coefficient n'est plus requis) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Volume Horaire prévu (en heures) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="200"
                    required
                    value={newMatVolumeHoraire}
                    onChange={(e) => setNewMatVolumeHoraire(parseFloat(e.target.value) || 20)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 20"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-500 mr-1">Raccourcis :</span>
                    {[10, 20, 30, 40, 50, 60].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setNewMatVolumeHoraire(h)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          newMatVolumeHoraire === h
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMatiere(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Programmer ce cours
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modifier un Cours Programmé */}
      {editingMatiere && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-blue-600" />
                  Modifier le cours programmé
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Classe : <strong className="text-slate-700">{currentClasse?.nom}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMatiere(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMatiere} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    required
                    value={editMatCode}
                    onChange={(e) => setEditMatCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Intitulé complet
                  </label>
                  <input
                    type="text"
                    required
                    value={editMatNom}
                    onChange={(e) => setEditMatNom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Enseignant en charge de ce cours programmé */}
              {userRole === "ADMINISTRATION" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Enseignant en charge de ce cours dans cette classe *
                  </label>
                  <select
                    value={editMatEnseignantId}
                    onChange={(e) => setEditMatEnseignantId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Aucun enseignant assigné --</option>
                    {enseignantsList.map((ens) => (
                      <option key={ens.id} value={ens.id}>
                        {ens.nom} ({ens.username})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    En tant que Direction, vous pouvez réaffecter ce cours à un autre enseignant pour cette classe.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Enseignant du cours
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>{editingMatiere.enseignant?.nom || "Non assigné"}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Volume Horaire Prévu (en heures)
                </label>
                <div className="flex items-center gap-1.5 mb-2">
                  {[10, 20, 30, 40, 50, 60].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setEditMatVolumeHoraire(h)}
                      className={`px-2.5 py-1 rounded text-xs font-bold border transition cursor-pointer ${
                        editMatVolumeHoraire === h
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="200"
                  required
                  value={editMatVolumeHoraire}
                  onChange={(e) => setEditMatVolumeHoraire(parseFloat(e.target.value) || 20)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  placeholder="Ex: 30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMatiere(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <p className="text-xs text-slate-500 mt-1">
                  Ajoutez vos étudiants par saisie manuelle rapide, copier-coller ou import Excel
                </p>
              </div>
              <button
                onClick={() => setShowAddEtudiant(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sélection de la classe de destination */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Classe de destination :</span>
                {selectedClasseId && (
                  <span className="text-[11px] font-normal text-slate-500">
                    {classes.find((c) => c.id === selectedClasseId)?.etudiants.length || 0} auditeur(s) déjà inscrit(s)
                  </span>
                )}
              </label>
              {classes.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
                  ⚠️ Aucune classe disponible dans l&apos;établissement. Veuillez d&apos;abord créer une classe.
                </div>
              ) : (
                <select
                  value={selectedClasseId}
                  onChange={(e) => setSelectedClasseId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Sélectionnez la classe cible --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} – {c.nom} ({c.anneeScolaire}) • {c.etudiants.length} auditeur(s)
                    </option>
                  ))}
                </select>
              )}
              {!selectedClasseId && classes.length > 0 && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1">
                  ⚠️ Veuillez d&apos;abord sélectionner une classe cible avant d&apos;inscrire des auditeurs.
                </p>
              )}
            </div>

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
                      Remplissez les champs et tapez <strong>Entrée ↵</strong> pour enregistrer et passer directement à l&apos;étudiant suivant sans utiliser la souris. Le matricule est auto-généré si vous le laissez vide.
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
                          if (quickAddSessionCount > 0) loadClasses();
                        }}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                      >
                        {quickAddSessionCount > 0 ? "Terminer" : "Annuler"}
                      </button>
                      <button
                        type="button"
                        disabled={singleLoading || !newEtNom.trim() || !selectedClasseId}
                        onClick={(e) => handleAddEtudiantSingle(e, false)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition"
                      >
                        Enregistrer et Fermer
                      </button>
                      <button
                        type="submit"
                        disabled={singleLoading || !newEtNom.trim() || !selectedClasseId}
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
                    disabled={bulkParsed.length === 0 || bulkSubmitting || !selectedClasseId}
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
                      disabled={!excelFile || importing || !selectedClasseId}
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
