"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  Save,
  Plus,
  History,
  Trash2,
  Edit,
  Download,
  ListChecks,
  BookOpen,
  Check,
  CheckCheck,
  XCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import { PresenceBadge } from "@/components/ui/Badge";

interface ClasseItem {
  id: string;
  code: string;
  nom: string;
  matieres: { id: string; code: string; nom: string }[];
}

interface EtudiantItem {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
}

interface SousChapitreSeance {
  id: string;
  chapitreId: string;
  titre: string;
  ordre: number;
  valide?: boolean;
  dateValidation?: string | null;
}

interface ChapitreSeance {
  id: string;
  numero: number;
  titre: string;
  description: string | null;
  valide?: boolean;
  validesSous?: number;
  totalSous?: number;
  progressionPct?: number;
  dateValidation?: string | null;
  sousChapitres?: SousChapitreSeance[];
}

interface SeanceHistorique {
  id: string;
  date: string;
  nombreHeures: number;
  heureDebut: string | null;
  heureFin: string | null;
  description: string | null;
  creePar: { nom: string; role: string } | null;
  chapitresCouverts?: { id: string; numero: number; titre: string }[];
  sousChapitresCouverts?: { id: string; chapitreId: string; titre: string }[];
  presences: {
    id: string;
    etudiantId?: string;
    statut: string;
    remarque: string | null;
    etudiant?: { id?: string; matricule: string; nom: string; prenom: string };
  }[];
}

type StatutPresence = "PRESENT" | "ABSENT" | "RETARD" | "JUSTIFIE";

interface TrancheHoraire {
  index: number;
  label: string;
  shortLabel: string;
  heureDebut: string;
  heureFin: string;
}

function computeHeureFin(start: string, duration: number): string {
  const [h, m] = (start || "08:00").split(":").map(Number);
  if (isNaN(h)) return "10:00";
  const totalMin = h * 60 + (isNaN(m) ? 0 : m) + Math.round(duration * 60);
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function getTranchesHoraires(startStr: string, totalHours: number): TrancheHoraire[] {
  const [startH, startM] = (startStr || "08:00").split(":").map(Number);
  const count = Math.max(1, Math.min(8, Math.floor(totalHours || 1)));
  const slots: TrancheHoraire[] = [];

  for (let i = 0; i < count; i++) {
    const totalStartMin = ((isNaN(startH) ? 8 : startH) * 60) + (isNaN(startM) ? 0 : startM) + i * 60;
    const totalEndMin = totalStartMin + 60;

    const sH = Math.floor(totalStartMin / 60) % 24;
    const sM = totalStartMin % 60;
    const eH = Math.floor(totalEndMin / 60) % 24;
    const eM = totalEndMin % 60;

    const sStr = `${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")}`;
    const eStr = `${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`;

    slots.push({
      index: i,
      label: `Heure ${i + 1} (${sStr} - ${eStr})`,
      shortLabel: `H${i + 1}`,
      heureDebut: sStr,
      heureFin: eStr,
    });
  }
  return slots;
}

export default function PresencesPage() {
  const searchParams = useSearchParams();
  const preselectedClasse = searchParams.get("classeId");

  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [selectedMatiereId, setSelectedMatiereId] = useState<string>("");

  const [etudiants, setEtudiants] = useState<EtudiantItem[]>([]);
  const [presencesState, setPresencesState] = useState<
    Record<string, { statut: StatutPresence; remarque: string }>
  >({});

  // Mode heure par heure
  const [modeHeureParHeure, setModeHeureParHeure] = useState(false);
  const [hourlyPresencesState, setHourlyPresencesState] = useState<
    Record<string, Record<number, { statut: StatutPresence; remarque: string }>>
  >({});

  // Champs de la séance
  const [dateSeance, setDateSeance] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [heureDebut, setHeureDebut] = useState("08:00");
  const [heureFin, setHeureFin] = useState("10:00");
  const [nombreHeures, setNombreHeures] = useState<number>(2);
  const [description, setDescription] = useState("");

  // Progression pédagogique / Chapitres & Sous-chapitres
  const [courseChapitres, setCourseChapitres] = useState<ChapitreSeance[]>([]);
  const [selectedChapitreIds, setSelectedChapitreIds] = useState<string[]>([]);
  const [selectedSousChapitreIds, setSelectedSousChapitreIds] = useState<string[]>([]);

  // Mode édition vs nouvelle
  const [editingSeanceId, setEditingSeanceId] = useState<string | null>(null);

  // Historique
  const [historique, setHistorique] = useState<SeanceHistorique[]>([]);
  const [currentTab, setCurrentTab] = useState<"nouveau" | "historique">("nouveau");
  const [expandedSeanceIds, setExpandedSeanceIds] = useState<string[]>([]);

  const toggleExpandSeance = (id: string) => {
    setExpandedSeanceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleExpandAll = () => {
    if (expandedSeanceIds.length === historique.length) {
      setExpandedSeanceIds([]);
    } else {
      setExpandedSeanceIds(historique.map((s) => s.id));
    }
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>("ENSEIGNANT");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [, startTransition] = useTransition();

  // 1. Charger classes et profil utilisateur
  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true);
        const [resAuth, resClasses] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/classes"),
        ]);

        const auth = await resAuth.json();
        setUserRole(auth.user?.role || "ENSEIGNANT");

        const cls = await resClasses.json();
        if (Array.isArray(cls)) {
          setClasses(cls);

          const defaultClass =
            (preselectedClasse && cls.find((c) => c.id === preselectedClasse)?.id) ||
            cls[0]?.id ||
            "";

          setSelectedClasseId(defaultClass);

          const firstMat = cls.find((c) => c.id === defaultClass)?.matieres[0]?.id || "";
          setSelectedMatiereId(firstMat);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, [preselectedClasse]);

  // 2. Charger les étudiants et l'historique quand la classe ou matière change
  useEffect(() => {
    if (!selectedClasseId) return;

    async function loadClasseData() {
      try {
        const resEtudiants = await fetch(`/api/etudiants?classeId=${selectedClasseId}`);
        const dataEtudiants = await resEtudiants.json();
        if (Array.isArray(dataEtudiants)) {
          setEtudiants(dataEtudiants);

          // Initialiser tous les étudiants à PRESENT par défaut
          const initialPres: Record<string, { statut: StatutPresence; remarque: string }> = {};
          const initialHourly: Record<string, Record<number, { statut: StatutPresence; remarque: string }>> = {};
          const currentTranches = getTranchesHoraires(heureDebut, nombreHeures);

          dataEtudiants.forEach((et) => {
            initialPres[et.id] = { statut: "PRESENT", remarque: "" };
            initialHourly[et.id] = {};
            currentTranches.forEach((t) => {
              initialHourly[et.id][t.index] = { statut: "PRESENT", remarque: "" };
            });
          });
          setPresencesState(initialPres);
          setHourlyPresencesState(initialHourly);
        }

        if (selectedMatiereId) {
          const [resSeances, resProg] = await Promise.all([
            fetch(`/api/seances?matiereId=${selectedMatiereId}`),
            fetch(`/api/cours/${selectedMatiereId}/progression`),
          ]);
          if (resSeances.ok) {
            const dataSeances = await resSeances.json();
            if (Array.isArray(dataSeances)) {
              setHistorique(dataSeances);
            }
          }
          if (resProg.ok) {
            const dataProg = await resProg.json();
            if (Array.isArray(dataProg.chapitres)) {
              setCourseChapitres(dataProg.chapitres);
            } else {
              setCourseChapitres([]);
            }
          } else {
            setCourseChapitres([]);
          }
        } else {
          setCourseChapitres([]);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadClasseData();
  }, [selectedClasseId, selectedMatiereId]);

  // Tranches horaires calculées dynamiquement
  const tranches = getTranchesHoraires(heureDebut, nombreHeures);

  // Gestion du changement de classe
  const handleClasseChange = (clsId: string) => {
    setSelectedClasseId(clsId);
    setEditingSeanceId(null);
    setSelectedChapitreIds([]);
    setSelectedSousChapitreIds([]);
    const cls = classes.find((c) => c.id === clsId);
    const firstMat = cls?.matieres[0]?.id || "";
    setSelectedMatiereId(firstMat);
  };

  const handleMatiereChange = (matId: string) => {
    setSelectedMatiereId(matId);
    if (!editingSeanceId) {
      setSelectedChapitreIds([]);
      setSelectedSousChapitreIds([]);
    }
  };

  const handleHeureDebutChange = (val: string) => {
    setHeureDebut(val);
    setHeureFin(computeHeureFin(val, nombreHeures));
  };

  const handleNombreHeuresChange = (val: number) => {
    setNombreHeures(val);
    setHeureFin(computeHeureFin(heureDebut, val));
  };

  // Actions globales de marquage
  const markAll = (statut: StatutPresence) => {
    const updated = { ...presencesState };
    etudiants.forEach((et) => {
      updated[et.id] = { ...updated[et.id], statut };
    });
    setPresencesState(updated);

    if (modeHeureParHeure) {
      setHourlyPresencesState((prev) => {
        const hUpdated = { ...prev };
        etudiants.forEach((et) => {
          const studentSlots = hUpdated[et.id] ? { ...hUpdated[et.id] } : {};
          tranches.forEach((t) => {
            studentSlots[t.index] = {
              statut,
              remarque: studentSlots[t.index]?.remarque || "",
            };
          });
          hUpdated[et.id] = studentSlots;
        });
        return hUpdated;
      });
    }
  };

  // Gestion du mode heure par heure
  const handleToggleModeHeureParHeure = () => {
    const nextMode = !modeHeureParHeure;
    setModeHeureParHeure(nextMode);

    if (nextMode) {
      setHourlyPresencesState((prev) => {
        const updated = { ...prev };
        etudiants.forEach((et) => {
          const studentSlots = updated[et.id] ? { ...updated[et.id] } : {};
          const baseStatut = presencesState[et.id]?.statut || "PRESENT";
          const baseRemarque = presencesState[et.id]?.remarque || "";
          tranches.forEach((t) => {
            if (!studentSlots[t.index]) {
              studentSlots[t.index] = { statut: baseStatut, remarque: baseRemarque };
            }
          });
          updated[et.id] = studentSlots;
        });
        return updated;
      });
    }
  };

  const getStudentHourStatut = (etudiantId: string, slotIndex: number): StatutPresence => {
    return (
      hourlyPresencesState[etudiantId]?.[slotIndex]?.statut ||
      presencesState[etudiantId]?.statut ||
      "PRESENT"
    );
  };

  const setStudentHourStatut = (
    etudiantId: string,
    slotIndex: number,
    statut: StatutPresence
  ) => {
    setHourlyPresencesState((prev) => {
      const studentSlots = prev[etudiantId] ? { ...prev[etudiantId] } : {};
      studentSlots[slotIndex] = {
        statut,
        remarque: studentSlots[slotIndex]?.remarque || "",
      };
      return {
        ...prev,
        [etudiantId]: studentSlots,
      };
    });
  };

  const markAllHour = (slotIndex: number, statut: StatutPresence) => {
    setHourlyPresencesState((prev) => {
      const updated = { ...prev };
      etudiants.forEach((et) => {
        const studentSlots = updated[et.id] ? { ...updated[et.id] } : {};
        studentSlots[slotIndex] = {
          statut,
          remarque: studentSlots[slotIndex]?.remarque || "",
        };
        updated[et.id] = studentSlots;
      });
      return updated;
    });
  };

  const copyHourToNext = (fromIndex: number, toIndex: number) => {
    setHourlyPresencesState((prev) => {
      const updated = { ...prev };
      etudiants.forEach((et) => {
        const studentSlots = updated[et.id] ? { ...updated[et.id] } : {};
        const source = studentSlots[fromIndex] || {
          statut: presencesState[et.id]?.statut || "PRESENT",
          remarque: "",
        };
        studentSlots[toIndex] = { ...source };
        updated[et.id] = studentSlots;
      });
      return updated;
    });
  };

  // Modification du statut pour un étudiant (mode classique)
  const setStudentStatut = (
    etudiantId: string,
    statut: StatutPresence
  ) => {
    setPresencesState((prev) => ({
      ...prev,
      [etudiantId]: {
        ...prev[etudiantId],
        statut,
      },
    }));
  };

  const setStudentRemarque = (etudiantId: string, remarque: string) => {
    setPresencesState((prev) => ({
      ...prev,
      [etudiantId]: {
        ...prev[etudiantId],
        remarque,
      },
    }));
  };

  // Gestion de la sélection des chapitres et sous-chapitres
  const handleToggleSousChapitre = (ch: ChapitreSeance, scId: string) => {
    setSelectedSousChapitreIds((prev) => {
      const isChecked = prev.includes(scId);
      const nextSous = isChecked ? prev.filter((id) => id !== scId) : [...prev, scId];

      const allSousIds = (ch.sousChapitres || []).map((s) => s.id);
      const allSelected = allSousIds.length > 0 && allSousIds.every((id) => nextSous.includes(id));

      setSelectedChapitreIds((prevCh) => {
        if (allSelected) {
          return prevCh.includes(ch.id) ? prevCh : [...prevCh, ch.id];
        } else {
          return prevCh.filter((id) => id !== ch.id);
        }
      });

      return nextSous;
    });
  };

  const handleToggleChapitre = (ch: ChapitreSeance) => {
    const isChecked = selectedChapitreIds.includes(ch.id);
    const sousList = ch.sousChapitres || [];

    if (isChecked) {
      setSelectedChapitreIds((prev) => prev.filter((id) => id !== ch.id));
      if (sousList.length > 0) {
        const sousIds = sousList.map((s) => s.id);
        setSelectedSousChapitreIds((prev) => prev.filter((id) => !sousIds.includes(id)));
      }
    } else {
      setSelectedChapitreIds((prev) => (prev.includes(ch.id) ? prev : [...prev, ch.id]));
      if (sousList.length > 0) {
        const sousIds = sousList.map((s) => s.id);
        setSelectedSousChapitreIds((prev) => Array.from(new Set([...prev, ...sousIds])));
      }
    }
  };

  const handleSelectAllSous = (ch: ChapitreSeance) => {
    const sousList = ch.sousChapitres || [];
    if (sousList.length === 0) return;
    const sousIds = sousList.map((s) => s.id);
    const allSelected = sousIds.every((id) => selectedSousChapitreIds.includes(id));

    if (allSelected) {
      setSelectedSousChapitreIds((prev) => prev.filter((id) => !sousIds.includes(id)));
      setSelectedChapitreIds((prev) => prev.filter((id) => id !== ch.id));
    } else {
      setSelectedSousChapitreIds((prev) => Array.from(new Set([...prev, ...sousIds])));
      setSelectedChapitreIds((prev) => (prev.includes(ch.id) ? prev : [...prev, ch.id]));
    }
  };

  // Sauvegarder la séance
  const handleSaveSeance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatiereId) {
      setNotification({ type: "error", message: "Veuillez sélectionner une matière." });
      return;
    }

    setSaving(true);
    setNotification(null);

    // MODE HEURE PAR HEURE : enregistrement par lot
    if (modeHeureParHeure && !editingSeanceId) {
      const seancesPayload = tranches.map((tranche) => ({
        matiereId: selectedMatiereId,
        date: dateSeance,
        heureDebut: tranche.heureDebut,
        heureFin: tranche.heureFin,
        nombreHeures: 1.0,
        description: description
          ? `${description} (${tranche.shortLabel})`
          : `Cours - ${tranche.label}`,
        chapitreIds: selectedChapitreIds,
        sousChapitreIds: selectedSousChapitreIds,
        presences: etudiants.map((et) => {
          const slotData = hourlyPresencesState[et.id]?.[tranche.index];
          return {
            etudiantId: et.id,
            statut: slotData?.statut || "PRESENT",
            remarque: slotData?.remarque || presencesState[et.id]?.remarque || null,
          };
        }),
      }));

      try {
        const res = await fetch("/api/seances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batch: true,
            seances: seancesPayload,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setNotification({ type: "error", message: data.error || "Erreur lors de l'enregistrement de l'appel." });
          setSaving(false);
          return;
        }

        setNotification({
          type: "success",
          message: `${tranches.length} feuilles d'appel horaires enregistrées avec succès !`,
        });

        // Recharger l'historique et les chapitres
        const [resSeances, resProg] = await Promise.all([
          fetch(`/api/seances?matiereId=${selectedMatiereId}`),
          fetch(`/api/cours/${selectedMatiereId}/progression`),
        ]);
        if (resSeances.ok) {
          const dataSeances = await resSeances.json();
          if (Array.isArray(dataSeances)) setHistorique(dataSeances);
        }
        if (resProg.ok) {
          const dataProg = await resProg.json();
          if (Array.isArray(dataProg.chapitres)) setCourseChapitres(dataProg.chapitres);
        }

        setDescription("");
        setSelectedChapitreIds([]);
        setSelectedSousChapitreIds([]);
      } catch {
        setNotification({ type: "error", message: "Erreur réseau." });
      } finally {
        setSaving(false);
      }
      return;
    }

    // MODE STANDARD
    const presencesPayload = etudiants.map((et) => ({
      etudiantId: et.id,
      statut: presencesState[et.id]?.statut || "PRESENT",
      remarque: presencesState[et.id]?.remarque || null,
    }));

    try {
      const url = editingSeanceId ? `/api/seances/${editingSeanceId}` : "/api/seances";
      const method = editingSeanceId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matiereId: selectedMatiereId,
          date: dateSeance,
          heureDebut,
          heureFin,
          nombreHeures,
          description,
          chapitreIds: selectedChapitreIds,
          sousChapitreIds: selectedSousChapitreIds,
          presences: presencesPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setNotification({ type: "error", message: data.error || "Erreur lors de l'enregistrement." });
        setSaving(false);
        return;
      }

      setNotification({
        type: "success",
        message: editingSeanceId
          ? "Feuille de présence modifiée avec succès !"
          : "Feuille de présence enregistrée avec succès !",
      });

      // Recharger l'historique et les chapitres
      const [resSeances, resProg] = await Promise.all([
        fetch(`/api/seances?matiereId=${selectedMatiereId}`),
        fetch(`/api/cours/${selectedMatiereId}/progression`),
      ]);
      if (resSeances.ok) {
        const dataSeances = await resSeances.json();
        if (Array.isArray(dataSeances)) setHistorique(dataSeances);
      }
      if (resProg.ok) {
        const dataProg = await resProg.json();
        if (Array.isArray(dataProg.chapitres)) setCourseChapitres(dataProg.chapitres);
      }

      setSelectedChapitreIds([]);
      setSelectedSousChapitreIds([]);

      // Réinitialiser si c'était une nouvelle séance ou terminer l'édition
      if (editingSeanceId) {
        setEditingSeanceId(null);
        setDescription("");
        setCurrentTab("historique");
      } else {
        setDescription("");
      }
    } catch {
      setNotification({ type: "error", message: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  };

  // Éditer une séance existante depuis l'historique
  const handleEditSeance = (seance: SeanceHistorique) => {
    setEditingSeanceId(seance.id);
    setModeHeureParHeure(false);
    const dateStr =
      typeof seance.date === "string"
        ? seance.date.split("T")[0]
        : new Date(seance.date).toISOString().split("T")[0];
    setDateSeance(dateStr);
    setHeureDebut(seance.heureDebut || "08:00");
    setHeureFin(seance.heureFin || "10:00");
    setNombreHeures(seance.nombreHeures);
    setDescription(seance.description || "");

    const chIds = Array.isArray(seance.chapitresCouverts)
      ? seance.chapitresCouverts.map((c) => c.id)
      : [];
    const scIds = Array.isArray(seance.sousChapitresCouverts)
      ? seance.sousChapitresCouverts.map((sc) => sc.id)
      : [];

    setSelectedChapitreIds(chIds);
    setSelectedSousChapitreIds(scIds);

    const newPresState: Record<string, { statut: StatutPresence; remarque: string }> = {};

    // 1. Initialiser à partir des présences enregistrées pour la séance
    if (Array.isArray(seance.presences)) {
      seance.presences.forEach((p) => {
        const id = p.etudiantId || p.etudiant?.id;
        if (id) {
          newPresState[id] = {
            statut: (p.statut as StatutPresence) || "PRESENT",
            remarque: p.remarque || "",
          };
        }
      });
    }

    // 2. Harmoniser pour tous les étudiants actuellement affichés
    etudiants.forEach((et) => {
      const p = seance.presences.find(
        (pres) =>
          pres.etudiantId === et.id ||
          pres.etudiant?.id === et.id ||
          pres.etudiant?.matricule === et.matricule
      );
      if (p) {
        newPresState[et.id] = {
          statut: (p.statut as StatutPresence) || "PRESENT",
          remarque: p.remarque || "",
        };
      } else if (!newPresState[et.id]) {
        newPresState[et.id] = {
          statut: "PRESENT",
          remarque: "",
        };
      }
    });

    setPresencesState(newPresState);
    setCurrentTab("nouveau");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Supprimer une séance (Enseignant uniquement)
  const handleDeleteSeance = async (seanceId: string) => {
    if (!confirm("Êtes-vous certain de vouloir supprimer cette feuille d'appel ?")) return;

    try {
      const res = await fetch(`/api/seances/${seanceId}`, { method: "DELETE" });
      if (res.ok) {
        startTransition(() => {
          setHistorique((prev) => prev.filter((s) => s.id !== seanceId));
        });
        if (editingSeanceId === seanceId) {
          setEditingSeanceId(null);
        }
        setNotification({ type: "success", message: "Séance supprimée." });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calcul dynamique des compteurs actuels
  const countP = Object.values(presencesState).filter((p) => p.statut === "PRESENT").length;
  const countA = Object.values(presencesState).filter((p) => p.statut === "ABSENT").length;
  const countR = Object.values(presencesState).filter((p) => p.statut === "RETARD").length;
  const countJ = Object.values(presencesState).filter((p) => p.statut === "JUSTIFIE").length;
  const totalCount = etudiants.length;
  const currentAssiduiteRate =
    totalCount > 0 ? Math.round(((countP + countR + countJ) / totalCount) * 100) : 100;

  // Statistiques en mode heure par heure
  const hourlyStats = tranches.map((t) => {
    let p = 0;
    let a = 0;
    let r = 0;
    let j = 0;
    etudiants.forEach((et) => {
      const st = getStudentHourStatut(et.id, t.index);
      if (st === "PRESENT") p++;
      else if (st === "ABSENT") a++;
      else if (st === "RETARD") r++;
      else if (st === "JUSTIFIE") j++;
    });
    const total = etudiants.length;
    const rate = total > 0 ? Math.round(((p + r + j) / total) * 100) : 100;
    return { ...t, p, a, r, j, total, rate };
  });

  const totalSlotStudent = tranches.length * etudiants.length;
  const totalPresentsHourly = hourlyStats.reduce((sum, h) => sum + h.p + h.r + h.j, 0);
  const globalHourlyAssiduiteRate =
    totalSlotStudent > 0 ? Math.round((totalPresentsHourly / totalSlotStudent) * 100) : 100;

  const currentClasse = classes.find((c) => c.id === selectedClasseId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-blue-600" />
            Émargement & Feuille de Présences
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pointage rapide par séance, calcul de l&apos;assiduité et historique des cours
          </p>
        </div>

        {/* Sélecteur de Classe & Matière */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <label className="text-[10px] font-bold text-slate-400 uppercase block">
              Classe
            </label>
            <select
              value={selectedClasseId}
              onChange={(e) => handleClasseChange(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <label className="text-[10px] font-bold text-slate-400 uppercase block">
              Matière
            </label>
            <select
              value={selectedMatiereId}
              onChange={(e) => handleMatiereChange(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {currentClasse?.matieres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} ({m.nom})
                </option>
              ))}
            </select>
          </div>
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

      {/* Onglets Nouveau pointage vs Historique */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => {
            if (editingSeanceId) {
              setEditingSeanceId(null);
              setSelectedChapitreIds([]);
              setSelectedSousChapitreIds([]);
              setDescription("");
            }
            setCurrentTab("nouveau");
          }}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            currentTab === "nouveau" && !editingSeanceId
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Plus className="w-4 h-4" /> Nouvelle Séance
        </button>
        {editingSeanceId && (
          <button
            onClick={() => setCurrentTab("nouveau")}
            className="pb-3 px-4 text-xs font-bold border-b-2 border-amber-600 text-amber-700 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" /> Modification en cours
          </button>
        )}
        <button
          onClick={() => setCurrentTab("historique")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            currentTab === "historique"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" /> Historique ({historique.length})
        </button>
      </div>

      {/* ONGLET 1 : FORMULAIRE D'ÉMARGEMENT */}
      {currentTab === "nouveau" && (
        <form onSubmit={handleSaveSeance} className="space-y-6">
          {editingSeanceId && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-xs shrink-0">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950">
                    Mode Modification : Feuille d&apos;appel du{" "}
                    {new Date(dateSeance).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    ({heureDebut} - {heureFin})
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Les présences et les progressions de cette séance passée sont chargées et cochées ci-dessous. Vous pouvez les ajuster puis enregistrer.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingSeanceId(null);
                  setDescription("");
                  setSelectedChapitreIds([]);
                  setSelectedSousChapitreIds([]);
                }}
                className="px-3.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg transition self-end sm:self-center shadow-2xs"
              >
                Annuler la modification
              </button>
            </div>
          )}

          {/* Métadonnées de la séance */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date de la séance
              </label>
              <input
                type="date"
                value={dateSeance}
                onChange={(e) => setDateSeance(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Horaires (Début - Fin)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={heureDebut}
                  onChange={(e) => handleHeureDebutChange(e.target.value)}
                  className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                />
                <span className="text-xs text-slate-400">&agrave;</span>
                <input
                  type="time"
                  value={heureFin}
                  onChange={(e) => setHeureFin(e.target.value)}
                  className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre d&apos;heures (Volume)
              </label>
              <select
                value={nombreHeures}
                onChange={(e) => handleNombreHeuresChange(parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 heure</option>
                <option value={2}>2 heures (standard)</option>
                <option value={3}>3 heures</option>
                <option value={4}>4 heures (demi-journée)</option>
                <option value={6}>6 heures</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Intitulé / Thème du cours
              </label>
              <input
                type="text"
                placeholder="Ex: TP Modélisation, Cours magistral..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Progression Pédagogique : Chapitres et sous-chapitres abordés durant cette séance */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-blue-600" />
                  Progression Pédagogique &bull; Chapitres &amp; Sous-chapitres abordés
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cochez les sous-chapitres ou chapitres traités au cours de cette séance pour actualiser la progression du cours.
                </p>
              </div>
              {courseChapitres.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                  {selectedSousChapitreIds.length > 0 && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {selectedSousChapitreIds.length} sous-chapitre{selectedSousChapitreIds.length > 1 ? "s" : ""}
                    </span>
                  )}
                  {selectedChapitreIds.length > 0 && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {selectedChapitreIds.length} chapitre{selectedChapitreIds.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
            </div>

            {courseChapitres.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  Aucun syllabus ou chapitre n&apos;est encore défini pour ce cours.
                </span>
                <Link
                  href={`/dashboard/progression?classeId=${selectedClasseId}&coursId=${selectedMatiereId}`}
                  className="font-bold text-blue-600 hover:text-blue-800 underline shrink-0 inline-flex items-center gap-1"
                >
                  Définir le programme (saisie manuelle ou Word IA) &rarr;
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {courseChapitres.map((ch) => {
                  const isChecked = selectedChapitreIds.includes(ch.id);
                  const wasAlreadyValidated = !!ch.valide;
                  const sousList = ch.sousChapitres || [];
                  const hasSous = sousList.length > 0;
                  const selectedSousCount = sousList.filter((s) => selectedSousChapitreIds.includes(s.id)).length;
                  const isAllSousSelected = hasSous && selectedSousCount === sousList.length;

                  return (
                    <div
                      key={ch.id}
                      className={`flex flex-col p-3 rounded-xl border text-xs transition ${
                        isChecked || isAllSousSelected
                          ? "bg-blue-50/80 border-blue-400 text-blue-950 shadow-2xs ring-1 ring-blue-400"
                          : selectedSousCount > 0
                          ? "bg-indigo-50/50 border-indigo-300 text-indigo-950"
                          : wasAlreadyValidated
                          ? "bg-emerald-50/40 border-emerald-200/80 text-slate-700 hover:bg-emerald-50/70"
                          : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100/60"
                      }`}
                    >
                      {/* Entête du chapitre */}
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked || isAllSousSelected}
                          onChange={() => handleToggleChapitre(ch)}
                          className="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900">
                              Ch. {ch.numero}
                            </span>
                            {wasAlreadyValidated && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                                Déjà vu
                              </span>
                            )}
                            {hasSous && (
                              <span className="text-[10px] font-medium text-slate-500 bg-white/70 px-1.5 py-0.2 rounded border border-slate-200">
                                {selectedSousCount}/{sousList.length} sous-ch.
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-slate-800 mt-0.5 leading-snug">
                            {ch.titre}
                          </p>
                        </div>
                      </div>

                      {/* Sous-chapitres sélectionnables individuellement */}
                      {hasSous && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold px-0.5">
                            <span>Sous-chapitres traités :</span>
                            <button
                              type="button"
                              onClick={() => handleSelectAllSous(ch)}
                              className="text-blue-600 hover:text-blue-800 underline font-bold"
                            >
                              {selectedSousCount === sousList.length ? "Tout décocher" : "Tout cocher"}
                            </button>
                          </div>
                          <div className="space-y-1">
                            {sousList.map((sc) => {
                              const isSousChecked = selectedSousChapitreIds.includes(sc.id);
                              const scAlreadyValidated = !!sc.valide;

                              return (
                                <button
                                  key={sc.id}
                                  type="button"
                                  onClick={() => handleToggleSousChapitre(ch, sc.id)}
                                  className={`w-full text-left flex items-start gap-2 p-1.5 rounded-lg text-[11px] transition ${
                                    isSousChecked
                                      ? "bg-blue-100/80 text-blue-900 font-semibold"
                                      : scAlreadyValidated
                                      ? "bg-emerald-50/60 text-slate-700 hover:bg-emerald-100/50"
                                      : "bg-white/80 hover:bg-white text-slate-700 border border-slate-100"
                                  }`}
                                >
                                  <span
                                    className={`w-3.5 h-3.5 rounded mt-0.5 flex items-center justify-center shrink-0 border transition ${
                                      isSousChecked
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "border-slate-300 bg-white"
                                    }`}
                                  >
                                    {isSousChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </span>
                                  <span className="flex-1 min-w-0 leading-tight">
                                    {sc.titre}
                                  </span>
                                  {scAlreadyValidated && !isSousChecked && (
                                    <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded shrink-0">
                                      Vu
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toggle Émargement heure par heure */}
          {!editingSeanceId && (
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">
                      Émargement heure par heure
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        modeHeureParHeure
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {modeHeureParHeure ? "Activé" : "Désactivé"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {modeHeureParHeure
                      ? `Pointage distinct pour chaque heure (${tranches.map((t) => t.shortLabel).join(", ")}) — Enregistrera ${tranches.length} séance(s) d'1h distinctes`
                      : `Faire l'appel séparément pour chacune des ${nombreHeures}h du cours`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleModeHeureParHeure}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  modeHeureParHeure ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    modeHeureParHeure ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Barre de contrôle et résumé du pointage */}
          {modeHeureParHeure ? (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                  Actions globales :
                </span>
                <button
                  type="button"
                  onClick={() => markAll("PRESENT")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                  title="Marquer tous les étudiants présents pour toutes les heures"
                >
                  <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Marquer tous présents (Toutes les heures)</span>
                </button>
                <button
                  type="button"
                  onClick={() => markAll("ABSENT")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
                  title="Marquer tous les étudiants absents pour toutes les heures"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Marquer tous absents</span>
                </button>
              </div>

              {/* Compteurs horaires */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                {hourlyStats.map((h) => (
                  <span
                    key={h.index}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-1.5 shadow-2xs"
                  >
                    <span className="font-extrabold text-blue-700">{h.shortLabel}:</span>
                    <span className="text-emerald-700">{h.p}P</span> /{" "}
                    <span className="text-rose-700">{h.a}A</span>
                  </span>
                ))}
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="text-slate-900 font-extrabold bg-blue-50 border border-blue-200 text-blue-900 px-2.5 py-1 rounded-lg shadow-2xs">
                  {globalHourlyAssiduiteRate}% assiduité globale
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                  Actions rapides :
                </span>
                <button
                  type="button"
                  onClick={() => markAll("PRESENT")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                  title="Marquer tous les étudiants comme présents"
                >
                  <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Marquer tous présents</span>
                </button>
                <button
                  type="button"
                  onClick={() => markAll("ABSENT")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
                  title="Marquer tous les étudiants comme absents"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Marquer tous absents</span>
                </button>
              </div>

              {/* Compteurs en temps réel */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{countP} Présent{countP > 1 ? "s" : ""}</span>
                </span>
                <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{countR} Retard{countR > 1 ? "s" : ""}</span>
                </span>
                <span className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 shadow-2xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{countA} Absent{countA > 1 ? "s" : ""}</span>
                </span>
                <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{countJ} Justifié{countJ > 1 ? "s" : ""}</span>
                </span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="text-slate-900 font-extrabold bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                  {currentAssiduiteRate}% d&apos;assiduité
                </span>
              </div>
            </div>
          )}

          {/* Tableau des étudiants */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              {modeHeureParHeure ? (
                /* TABLEAU HEURE PAR HEURE */
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                      <th className="px-4 py-3 w-10">N°</th>
                      <th className="px-4 py-3 w-28">Matricule</th>
                      <th className="px-4 py-3 min-w-[180px]">Nom et Prénom</th>
                      {tranches.map((t) => (
                        <th
                          key={t.index}
                          className="px-3 py-3 text-center border-l border-slate-200 min-w-[210px]"
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-1 text-slate-800 font-bold">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              <span>{t.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <button
                                type="button"
                                onClick={() => markAllHour(t.index, "PRESENT")}
                                className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold transition"
                                title="Tous présents pour cette heure"
                              >
                                Tous P
                              </button>
                              <button
                                type="button"
                                onClick={() => markAllHour(t.index, "ABSENT")}
                                className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 hover:bg-rose-200 font-bold transition"
                                title="Tous absents pour cette heure"
                              >
                                Tous A
                              </button>
                              {t.index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => copyHourToNext(t.index - 1, t.index)}
                                  className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 font-bold transition"
                                  title={`Copier l'appel de H${t.index} vers H${t.index + 1}`}
                                >
                                  = H{t.index}
                                </button>
                              )}
                            </div>
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 min-w-[160px]">Remarque</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {etudiants.map((et, idx) => {
                      const currentRemarque = presencesState[et.id]?.remarque || "";
                      return (
                        <tr key={et.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">
                            {et.matricule}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {et.nom} {et.prenom}
                          </td>
                          {tranches.map((t) => {
                            const currentStatut = getStudentHourStatut(et.id, t.index);
                            return (
                              <td
                                key={t.index}
                                className="px-3 py-2 border-l border-slate-100 text-center"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  {/* Présent [Vert] */}
                                  <button
                                    type="button"
                                    onClick={() => setStudentHourStatut(et.id, t.index, "PRESENT")}
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center cursor-pointer ${
                                      currentStatut === "PRESENT"
                                        ? "bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-700/20"
                                        : "bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800"
                                    }`}
                                    title="Présent"
                                  >
                                    P
                                  </button>

                                  {/* Retard [Orange] */}
                                  <button
                                    type="button"
                                    onClick={() => setStudentHourStatut(et.id, t.index, "RETARD")}
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center cursor-pointer ${
                                      currentStatut === "RETARD"
                                        ? "bg-amber-500 text-white shadow-xs ring-1 ring-amber-600/20"
                                        : "bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800"
                                    }`}
                                    title="En retard"
                                  >
                                    R
                                  </button>

                                  {/* Absent [Rouge] */}
                                  <button
                                    type="button"
                                    onClick={() => setStudentHourStatut(et.id, t.index, "ABSENT")}
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center cursor-pointer ${
                                      currentStatut === "ABSENT"
                                        ? "bg-rose-600 text-white shadow-xs ring-1 ring-rose-700/20"
                                        : "bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-800"
                                    }`}
                                    title="Absent"
                                  >
                                    A
                                  </button>

                                  {/* Justifié [Bleu] */}
                                  <button
                                    type="button"
                                    onClick={() => setStudentHourStatut(et.id, t.index, "JUSTIFIE")}
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center cursor-pointer ${
                                      currentStatut === "JUSTIFIE"
                                        ? "bg-blue-600 text-white shadow-xs ring-1 ring-blue-700/20"
                                        : "bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-800"
                                    }`}
                                    title="Absence justifiée"
                                  >
                                    J
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="Remarque..."
                              value={currentRemarque}
                              onChange={(e) => setStudentRemarque(et.id, e.target.value)}
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                /* TABLEAU STANDARD (1 SEULE SÉANCE) */
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                      <th className="px-6 py-3.5 w-12">N°</th>
                      <th className="px-6 py-3.5 w-28">Matricule</th>
                      <th className="px-6 py-3.5 min-w-[180px]">Nom et Prénom</th>
                      <th className="px-6 py-3.5 text-center min-w-[370px]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-slate-700">Statut d&apos;émargement</span>
                          <button
                            type="button"
                            onClick={() => markAll("PRESENT")}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 active:scale-95 text-emerald-800 text-[11px] font-bold transition cursor-pointer"
                            title="Marquer tous les étudiants présents en un clic"
                          >
                            <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Tous Présents</span>
                          </button>
                        </div>
                      </th>
                      <th className="px-6 py-3.5 min-w-[200px]">Remarque / Motif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {etudiants.map((et, idx) => {
                      const currentStatut = presencesState[et.id]?.statut || "PRESENT";
                      const currentRemarque = presencesState[et.id]?.remarque || "";

                      return (
                        <tr key={et.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-6 py-3.5 text-xs text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="px-6 py-3.5 font-mono text-xs font-bold text-slate-700">
                            {et.matricule}
                          </td>
                          <td className="px-6 py-3.5 font-semibold text-slate-900">
                            {et.nom} {et.prenom}
                          </td>

                          {/* Boutons de statut ergonomiques */}
                          <td className="px-6 py-3.5">
                            <div className="flex items-center justify-center">
                              <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1 shadow-2xs">
                                {/* Présent [Vert] */}
                                <button
                                  type="button"
                                  onClick={() => setStudentStatut(et.id, "PRESENT")}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    currentStatut === "PRESENT"
                                      ? "bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-700/20"
                                      : "text-slate-600 hover:text-emerald-700 hover:bg-white/80"
                                  }`}
                                  title="Marquer Présent"
                                >
                                  <CheckCircle2
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      currentStatut === "PRESENT" ? "text-white" : "text-emerald-600"
                                    }`}
                                  />
                                  <span>Présent</span>
                                </button>

                                {/* Retard [Orange] */}
                                <button
                                  type="button"
                                  onClick={() => setStudentStatut(et.id, "RETARD")}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    currentStatut === "RETARD"
                                      ? "bg-amber-500 text-white shadow-xs ring-1 ring-amber-600/20"
                                      : "text-slate-600 hover:text-amber-700 hover:bg-white/80"
                                  }`}
                                  title="Marquer En Retard"
                                >
                                  <Clock
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      currentStatut === "RETARD" ? "text-white" : "text-amber-600"
                                    }`}
                                  />
                                  <span>Retard</span>
                                </button>

                                {/* Absent [Rouge] */}
                                <button
                                  type="button"
                                  onClick={() => setStudentStatut(et.id, "ABSENT")}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    currentStatut === "ABSENT"
                                      ? "bg-rose-600 text-white shadow-xs ring-1 ring-rose-700/20"
                                      : "text-slate-600 hover:text-rose-700 hover:bg-white/80"
                                  }`}
                                  title="Marquer Absent"
                                >
                                  <XCircle
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      currentStatut === "ABSENT" ? "text-white" : "text-rose-600"
                                    }`}
                                  />
                                  <span>Absent</span>
                                </button>

                                {/* Justifié [Bleu] */}
                                <button
                                  type="button"
                                  onClick={() => setStudentStatut(et.id, "JUSTIFIE")}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    currentStatut === "JUSTIFIE"
                                      ? "bg-blue-600 text-white shadow-xs ring-1 ring-blue-700/20"
                                      : "text-slate-600 hover:text-blue-700 hover:bg-white/80"
                                  }`}
                                  title="Marquer Absence Justifiée"
                                >
                                  <ShieldCheck
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      currentStatut === "JUSTIFIE" ? "text-white" : "text-blue-600"
                                    }`}
                                  />
                                  <span>Justifié</span>
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Remarque */}
                          <td className="px-6 py-3">
                            <input
                              type="text"
                              placeholder="Ex: retard 10 min, dispense..."
                              value={currentRemarque}
                              onChange={(e) => setStudentRemarque(et.id, e.target.value)}
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pied de page du formulaire */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {modeHeureParHeure
                  ? `Total : ${etudiants.length} auditeurs × ${tranches.length} heure(s) = ${etudiants.length * tranches.length} pointages horaires.`
                  : `Total : ${etudiants.length} auditeurs sur la feuille d'appel.`}
              </span>

              <div className="flex items-center gap-3">
                {editingSeanceId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSeanceId(null);
                      setDescription("");
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition"
                  >
                    Annuler modification
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving
                    ? "Enregistrement..."
                    : editingSeanceId
                    ? "Mettre à jour la feuille"
                    : modeHeureParHeure
                    ? `Valider les ${tranches.length} heures d'appel`
                    : "Valider l'émargement"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ONGLET 2 : HISTORIQUE DES SÉANCES */}
      {currentTab === "historique" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Séances enregistrées pour cette matière
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Consultez les feuilles de présence, les émargements détaillés et les progressions validées
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {historique.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleExpandAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  {expandedSeanceIds.length === historique.length ? "Tout replier" : "Déplier tous les émargements"}
                </button>
              )}
              <a
                href={`/api/export/presences-excel?classeId=${selectedClasseId}&matiereId=${selectedMatiereId}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Exporter feuille Excel (.xlsx)
              </a>
            </div>
          </div>

          {historique.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              Aucune séance passée trouvée pour cette matière.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historique.map((s) => {
                const total = s.presences.length;
                const pCount = s.presences.filter((p) => p.statut === "PRESENT").length;
                const rCount = s.presences.filter((p) => p.statut === "RETARD").length;
                const jCount = s.presences.filter((p) => p.statut === "JUSTIFIE").length;
                const absents = s.presences.filter((p) => p.statut === "ABSENT").length;
                const presentsTotal = pCount + rCount + jCount;
                const rate = total > 0 ? Math.round((presentsTotal / total) * 100) : 100;
                const isExpanded = expandedSeanceIds.includes(s.id);

                return (
                  <div
                    key={s.id}
                    className="p-5 flex flex-col gap-4 hover:bg-slate-50/40 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">
                            {new Date(s.date).toLocaleDateString("fr-FR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs">
                            {s.nombreHeures}h
                          </span>
                          {s.heureDebut && (
                            <span className="text-xs text-slate-400">
                              ({s.heureDebut} - {s.heureFin || ""})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 font-medium mt-1">
                          {s.description || "Séance de cours"}
                        </p>
                        {s.creePar && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Émargé par : {s.creePar.nom} ({s.creePar.role === "ENSEIGNANT" ? "Enseignant" : "Chef de classe"})
                          </p>
                        )}

                        {/* Chapitres et sous-chapitres traités */}
                        {((s.chapitresCouverts && s.chapitresCouverts.length > 0) ||
                          (s.sousChapitresCouverts && s.sousChapitresCouverts.length > 0)) && (
                          <div className="space-y-1.5 mt-2.5">
                            {s.chapitresCouverts && s.chapitresCouverts.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                  <ListChecks className="w-3 h-3 text-blue-600" />
                                  Chapitres traités :
                                </span>
                                {s.chapitresCouverts.map((ch) => (
                                  <span
                                    key={ch.id}
                                    className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md text-[10px] font-semibold border border-blue-200"
                                  >
                                    Ch. {ch.numero} &bull; {ch.titre}
                                  </span>
                                ))}
                              </div>
                            )}
                            {s.sousChapitresCouverts && s.sousChapitresCouverts.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1">
                                  &bull; Sous-chapitres :
                                </span>
                                {s.sousChapitresCouverts.map((sc) => (
                                  <span
                                    key={sc.id}
                                    className="px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded-md text-[10px] font-medium border border-indigo-200 flex items-center gap-1"
                                  >
                                    <Check className="w-2.5 h-2.5 text-indigo-600 stroke-[3]" />
                                    {sc.titre}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Bouton pour afficher / masquer l'émargement */}
                        <button
                          type="button"
                          onClick={() => toggleExpandSeance(s.id)}
                          className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              Masquer l&apos;émargement détaillé
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              Voir l&apos;émargement détaillé ({presentsTotal}/{total} présents)
                            </>
                          )}
                        </button>
                      </div>

                      {/* Indicateurs statistiques et boutons d'action */}
                      <div className="flex items-center gap-4 self-end sm:self-start">
                        <div className="text-right">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                              rate >= 80
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {rate}% présence
                          </span>
                          <span className="block text-[11px] text-slate-400 mt-0.5 font-medium">
                            {presentsTotal} présent(s) &bull; {absents} absent(s)
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleExpandSeance(s.id)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                            title={isExpanded ? "Replier" : "Déplier l'émargement"}
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditSeance(s)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                            title="Modifier les présences"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {userRole === "ENSEIGNANT" && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSeance(s.id)}
                              className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                              title="Supprimer la séance"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* DÉTAIL COMPLET DE L'ÉMARGEMENT DÉPLIABLE */}
                    {isExpanded && (
                      <div className="mt-2 pt-3 border-t border-slate-100 bg-slate-50/70 -mx-5 -mb-5 p-5 space-y-3 rounded-b-2xl">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                            <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs">
                              Total : {total} auditeurs
                            </span>
                            <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                              ✓ {pCount} Présent(s)
                            </span>
                            <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                              ✗ {absents} Absent(s)
                            </span>
                            {rCount > 0 && (
                              <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
                                ⏱ {rCount} Retard(s)
                              </span>
                            )}
                            {jCount > 0 && (
                              <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                                📄 {jCount} Justifié(s)
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleEditSeance(s)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Modifier cette feuille d&apos;appel
                          </button>
                        </div>

                        {/* Tableau complet des présences */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                <th className="px-4 py-2.5 w-10">N°</th>
                                <th className="px-4 py-2.5 w-24">Matricule</th>
                                <th className="px-4 py-2.5">Nom &amp; Prénom</th>
                                <th className="px-4 py-2.5 w-36 text-center">Statut d&apos;émargement</th>
                                <th className="px-4 py-2.5">Remarque / Motif</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {s.presences.map((p, pIdx) => {
                                const et = p.etudiant || etudiants.find((e) => e.id === p.etudiantId);
                                const matricule = et?.matricule || "—";
                                const nomComplet = et ? `${et.nom} ${et.prenom}` : "Auditeur";
                                return (
                                  <tr key={p.id || pIdx} className="hover:bg-slate-50/80 transition">
                                    <td className="px-4 py-2 text-slate-400 font-mono text-[11px]">
                                      {pIdx + 1}
                                    </td>
                                    <td className="px-4 py-2 font-mono font-bold text-slate-700">
                                      {matricule}
                                    </td>
                                    <td className="px-4 py-2 font-semibold text-slate-900">
                                      {nomComplet}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <PresenceBadge statut={p.statut} size="sm" />
                                    </td>
                                    <td className="px-4 py-2 text-slate-500 text-[11px] italic">
                                      {p.remarque || "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
