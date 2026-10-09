"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dayjs, { type Dayjs } from "dayjs";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Form,
  Input,
  Select,
  Switch,
  TimePicker,
} from "antd";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  Clock,
  HelpCircle,
  History,
  Pencil,
  Plus,
  Save,
  Search,
  School,
  BookOpen,
  Users,
  XCircle,
} from "lucide-react";
import StatutPicker from "./_components/StatutPicker";
import ChapitresPicker from "./_components/ChapitresPicker";
import HistoriqueSeances from "./_components/HistoriqueSeances";
import {
  ChapitreSeance,
  ClasseItem,
  EtudiantItem,
  PresenceEntry,
  SeanceHistorique,
  StatutPresence,
  computeHeureFin,
  getTranchesHoraires,
  labelClass,
} from "./_components/shared";

interface SeanceFormValues {
  date: Dayjs;
  heureDebut: Dayjs;
  heureFin: Dayjs;
  nombreHeures: number;
  description?: string;
}

const HOUR_OPTIONS = [
  { value: 1, label: "1 heure" },
  { value: 2, label: "2 heures (standard)" },
  { value: 3, label: "3 heures" },
  { value: 4, label: "4 heures (demi-journée)" },
  { value: 6, label: "6 heures" },
];

const TIME_FORMAT = "HH:mm";

function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-32 rounded-2xl bg-slate-200" />
      <div className="h-24 rounded-2xl bg-white border border-slate-200" />
      <div className="h-64 rounded-2xl bg-white border border-slate-200" />
    </div>
  );
}

export default function PresencesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PresencesContent />
    </Suspense>
  );
}

function PresencesContent() {
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const preselectedClasse = searchParams.get("classeId");
  const [form] = Form.useForm<SeanceFormValues>();

  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [selectedMatiereId, setSelectedMatiereId] = useState<string>("");

  const [etudiants, setEtudiants] = useState<EtudiantItem[]>([]);
  const [presencesState, setPresencesState] = useState<Record<string, PresenceEntry>>({});
  const [studentSearch, setStudentSearch] = useState("");

  // Mode heure par heure
  const [modeHeureParHeure, setModeHeureParHeure] = useState(false);
  const [hourlyPresencesState, setHourlyPresencesState] = useState<
    Record<string, Record<number, PresenceEntry>>
  >({});

  // Progression pédagogique
  const [courseChapitres, setCourseChapitres] = useState<ChapitreSeance[]>([]);
  const [selectedChapitreIds, setSelectedChapitreIds] = useState<string[]>([]);
  const [selectedSousChapitreIds, setSelectedSousChapitreIds] = useState<string[]>([]);

  const [editingSeanceId, setEditingSeanceId] = useState<string | null>(null);
  const [historique, setHistorique] = useState<SeanceHistorique[]>([]);
  const [currentTab, setCurrentTab] = useState<"nouveau" | "historique">("nouveau");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>("ENSEIGNANT");

  // Valeurs du formulaire de séance (réactives)
  const heureDebutV = Form.useWatch("heureDebut", form);
  const heureFinV = Form.useWatch("heureFin", form);
  const dateV = Form.useWatch("date", form);
  const nombreHeuresV = Form.useWatch("nombreHeures", form);
  const heureDebut = heureDebutV ? heureDebutV.format(TIME_FORMAT) : "08:00";
  const heureFin = heureFinV ? heureFinV.format(TIME_FORMAT) : "10:00";
  const nombreHeures = nombreHeuresV ?? 2;

  const tranches = useMemo(() => getTranchesHoraires(heureDebut, nombreHeures), [heureDebut, nombreHeures]);

  const hourOptions = useMemo(
    () =>
      HOUR_OPTIONS.some((o) => o.value === nombreHeures)
        ? HOUR_OPTIONS
        : [...HOUR_OPTIONS, { value: nombreHeures, label: `${nombreHeures} heure(s)` }].sort(
            (a, b) => a.value - b.value
          ),
    [nombreHeures]
  );

  const reloadSeanceData = async (matiereId: string) => {
    const [resSeances, resProg] = await Promise.all([
      fetch(`/api/seances?matiereId=${matiereId}`),
      fetch(`/api/cours/${matiereId}/progression`),
    ]);
    if (resSeances.ok) {
      const dataSeances = await resSeances.json();
      if (Array.isArray(dataSeances)) setHistorique(dataSeances);
    }
    if (resProg.ok) {
      const dataProg = await resProg.json();
      if (Array.isArray(dataProg.chapitres)) setCourseChapitres(dataProg.chapitres);
    }
  };

  // 1. Charger classes et profil utilisateur
  useEffect(() => {
    async function loadInitial() {
      try {
        const [resAuth, resClasses] = await Promise.all([fetch("/api/auth/me"), fetch("/api/classes")]);

        const auth = await resAuth.json();
        setUserRole(auth.user?.role || "ENSEIGNANT");

        const cls = await resClasses.json();
        if (Array.isArray(cls)) {
          setClasses(cls);
          const defaultClass =
            (preselectedClasse && cls.find((c) => c.id === preselectedClasse)?.id) || cls[0]?.id || "";
          setSelectedClasseId(defaultClass);
          setSelectedMatiereId(cls.find((c) => c.id === defaultClass)?.matieres[0]?.id || "");
        }
      } catch (err) {
        console.error(err);
        message.error("Impossible de charger les classes.");
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedClasse]);

  // 2. Charger les étudiants et l'historique quand la classe ou la matière change
  useEffect(() => {
    if (!selectedClasseId) return;

    async function loadClasseData() {
      try {
        const resEtudiants = await fetch(`/api/etudiants?classeId=${selectedClasseId}`);
        const dataEtudiants = await resEtudiants.json();
        if (Array.isArray(dataEtudiants)) {
          setEtudiants(dataEtudiants);

          // Tous les étudiants sont "présents" par défaut
          const initialPres: Record<string, PresenceEntry> = {};
          const initialHourly: Record<string, Record<number, PresenceEntry>> = {};
          const currentTranches = getTranchesHoraires(heureDebut, nombreHeures);

          dataEtudiants.forEach((et: EtudiantItem) => {
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
            if (Array.isArray(dataSeances)) setHistorique(dataSeances);
          }
          if (resProg.ok) {
            const dataProg = await resProg.json();
            setCourseChapitres(Array.isArray(dataProg.chapitres) ? dataProg.chapitres : []);
          } else {
            setCourseChapitres([]);
          }
        } else {
          setCourseChapitres([]);
          setHistorique([]);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadClasseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClasseId, selectedMatiereId]);

  const currentClasse = classes.find((c) => c.id === selectedClasseId);

  const handleClasseChange = (clsId: string) => {
    setSelectedClasseId(clsId);
    setEditingSeanceId(null);
    setSelectedChapitreIds([]);
    setSelectedSousChapitreIds([]);
    setStudentSearch("");
    const cls = classes.find((c) => c.id === clsId);
    setSelectedMatiereId(cls?.matieres[0]?.id || "");
  };

  const handleMatiereChange = (matId: string) => {
    setSelectedMatiereId(matId);
    if (!editingSeanceId) {
      setSelectedChapitreIds([]);
      setSelectedSousChapitreIds([]);
    }
  };

  const resetEditing = () => {
    setEditingSeanceId(null);
    form.setFieldValue("description", "");
    setSelectedChapitreIds([]);
    setSelectedSousChapitreIds([]);
  };

  // --- Marquage ---

  const markAll = (statut: StatutPresence) => {
    setPresencesState((prev) => {
      const updated = { ...prev };
      etudiants.forEach((et) => {
        updated[et.id] = { ...updated[et.id], remarque: updated[et.id]?.remarque ?? "", statut };
      });
      return updated;
    });

    if (modeHeureParHeure) {
      setHourlyPresencesState((prev) => {
        const hUpdated = { ...prev };
        etudiants.forEach((et) => {
          const studentSlots = hUpdated[et.id] ? { ...hUpdated[et.id] } : {};
          tranches.forEach((t) => {
            studentSlots[t.index] = { statut, remarque: studentSlots[t.index]?.remarque || "" };
          });
          hUpdated[et.id] = studentSlots;
        });
        return hUpdated;
      });
    }
  };

  const handleToggleModeHeureParHeure = (next: boolean) => {
    setModeHeureParHeure(next);

    if (next) {
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

  const getStudentHourStatut = (etudiantId: string, slotIndex: number): StatutPresence =>
    hourlyPresencesState[etudiantId]?.[slotIndex]?.statut || presencesState[etudiantId]?.statut || "PRESENT";

  const setStudentHourStatut = (etudiantId: string, slotIndex: number, statut: StatutPresence) => {
    setHourlyPresencesState((prev) => {
      const studentSlots = prev[etudiantId] ? { ...prev[etudiantId] } : {};
      studentSlots[slotIndex] = { statut, remarque: studentSlots[slotIndex]?.remarque || "" };
      return { ...prev, [etudiantId]: studentSlots };
    });
  };

  const markAllHour = (slotIndex: number, statut: StatutPresence) => {
    setHourlyPresencesState((prev) => {
      const updated = { ...prev };
      etudiants.forEach((et) => {
        const studentSlots = updated[et.id] ? { ...updated[et.id] } : {};
        studentSlots[slotIndex] = { statut, remarque: studentSlots[slotIndex]?.remarque || "" };
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

  const setStudentStatut = (etudiantId: string, statut: StatutPresence) => {
    setPresencesState((prev) => ({
      ...prev,
      [etudiantId]: { remarque: prev[etudiantId]?.remarque ?? "", statut },
    }));
  };

  const setStudentRemarque = (etudiantId: string, remarque: string) => {
    setPresencesState((prev) => ({
      ...prev,
      [etudiantId]: { statut: prev[etudiantId]?.statut ?? "PRESENT", remarque },
    }));
  };

  // --- Chapitres et sous-chapitres ---

  const handleToggleSousChapitre = (ch: ChapitreSeance, scId: string) => {
    setSelectedSousChapitreIds((prev) => {
      const isChecked = prev.includes(scId);
      const nextSous = isChecked ? prev.filter((id) => id !== scId) : [...prev, scId];

      const allSousIds = (ch.sousChapitres || []).map((s) => s.id);
      const allSelected = allSousIds.length > 0 && allSousIds.every((id) => nextSous.includes(id));

      setSelectedChapitreIds((prevCh) =>
        allSelected
          ? prevCh.includes(ch.id)
            ? prevCh
            : [...prevCh, ch.id]
          : prevCh.filter((id) => id !== ch.id)
      );

      return nextSous;
    });
  };

  const handleToggleChapitre = (ch: ChapitreSeance) => {
    const sousList = ch.sousChapitres || [];
    const sousIds = sousList.map((s) => s.id);
    const isAllSous = sousList.length > 0 && sousIds.every((id) => selectedSousChapitreIds.includes(id));
    const isChecked = selectedChapitreIds.includes(ch.id) || isAllSous;

    if (isChecked) {
      setSelectedChapitreIds((prev) => prev.filter((id) => id !== ch.id));
      if (sousList.length > 0) {
        setSelectedSousChapitreIds((prev) => prev.filter((id) => !sousIds.includes(id)));
      }
    } else {
      setSelectedChapitreIds((prev) => (prev.includes(ch.id) ? prev : [...prev, ch.id]));
      if (sousList.length > 0) {
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

  // --- Enregistrement ---

  const handleSaveSeance = async (values: SeanceFormValues) => {
    if (!selectedMatiereId) {
      message.error("Veuillez sélectionner une matière.");
      return;
    }

    const dateSeance = values.date.format("YYYY-MM-DD");
    const debut = values.heureDebut.format(TIME_FORMAT);
    const fin = values.heureFin.format(TIME_FORMAT);
    const description = values.description?.trim() ?? "";

    setSaving(true);

    // MODE HEURE PAR HEURE : enregistrement par lot
    if (modeHeureParHeure && !editingSeanceId) {
      const seancesPayload = getTranchesHoraires(debut, values.nombreHeures).map((tranche) => ({
        matiereId: selectedMatiereId,
        date: dateSeance,
        heureDebut: tranche.heureDebut,
        heureFin: tranche.heureFin,
        nombreHeures: 1.0,
        description: description ? `${description} (${tranche.shortLabel})` : `Cours - ${tranche.label}`,
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
          body: JSON.stringify({ batch: true, seances: seancesPayload }),
        });

        if (!res.ok) {
          const data = await res.json();
          message.error(data.error || "Erreur lors de l'enregistrement de l'appel.");
          return;
        }

        message.success(`${seancesPayload.length} feuilles d'appel horaires enregistrées avec succès.`);
        await reloadSeanceData(selectedMatiereId);
        form.setFieldValue("description", "");
        setSelectedChapitreIds([]);
        setSelectedSousChapitreIds([]);
      } catch {
        message.error("Erreur réseau.");
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
      const res = await fetch(editingSeanceId ? `/api/seances/${editingSeanceId}` : "/api/seances", {
        method: editingSeanceId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matiereId: selectedMatiereId,
          date: dateSeance,
          heureDebut: debut,
          heureFin: fin,
          nombreHeures: values.nombreHeures,
          description,
          chapitreIds: selectedChapitreIds,
          sousChapitreIds: selectedSousChapitreIds,
          presences: presencesPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Erreur lors de l'enregistrement.");
        return;
      }

      message.success(
        editingSeanceId
          ? "Feuille de présence modifiée avec succès."
          : "Feuille de présence enregistrée avec succès."
      );

      await reloadSeanceData(selectedMatiereId);
      setSelectedChapitreIds([]);
      setSelectedSousChapitreIds([]);
      form.setFieldValue("description", "");

      if (editingSeanceId) {
        setEditingSeanceId(null);
        setCurrentTab("historique");
      }
    } catch {
      message.error("Erreur réseau.");
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

    form.setFieldsValue({
      date: dayjs(dateStr),
      heureDebut: dayjs(seance.heureDebut || "08:00", TIME_FORMAT),
      heureFin: dayjs(seance.heureFin || "10:00", TIME_FORMAT),
      nombreHeures: seance.nombreHeures,
      description: seance.description || "",
    });

    setSelectedChapitreIds(
      Array.isArray(seance.chapitresCouverts) ? seance.chapitresCouverts.map((c) => c.id) : []
    );
    setSelectedSousChapitreIds(
      Array.isArray(seance.sousChapitresCouverts) ? seance.sousChapitresCouverts.map((sc) => sc.id) : []
    );

    const newPresState: Record<string, PresenceEntry> = {};

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

    etudiants.forEach((et) => {
      const p = seance.presences.find(
        (pres) =>
          pres.etudiantId === et.id || pres.etudiant?.id === et.id || pres.etudiant?.matricule === et.matricule
      );
      if (p) {
        newPresState[et.id] = {
          statut: (p.statut as StatutPresence) || "PRESENT",
          remarque: p.remarque || "",
        };
      } else if (!newPresState[et.id]) {
        newPresState[et.id] = { statut: "PRESENT", remarque: "" };
      }
    });

    setPresencesState(newPresState);
    setCurrentTab("nouveau");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Supprimer une séance (enseignant uniquement)
  const handleDeleteSeance = async (seanceId: string) => {
    try {
      const res = await fetch(`/api/seances/${seanceId}`, { method: "DELETE" });
      if (res.ok) {
        setHistorique((prev) => prev.filter((s) => s.id !== seanceId));
        if (editingSeanceId === seanceId) setEditingSeanceId(null);
        message.success("Séance supprimée.");
      } else {
        const data = await res.json().catch(() => ({}));
        message.error(data.error || "La suppression a échoué.");
      }
    } catch (err) {
      console.error(err);
      message.error("Erreur réseau.");
    }
  };

  // --- Compteurs ---
  const counts = useMemo(() => {
    const values = Object.values(presencesState);
    const p = values.filter((x) => x.statut === "PRESENT").length;
    const a = values.filter((x) => x.statut === "ABSENT").length;
    const r = values.filter((x) => x.statut === "RETARD").length;
    const j = values.filter((x) => x.statut === "JUSTIFIE").length;
    const total = etudiants.length;
    return { p, a, r, j, total, rate: total > 0 ? Math.round(((p + r + j) / total) * 100) : 100 };
  }, [presencesState, etudiants.length]);

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
    return { ...t, p, a, r, j };
  });
  const totalSlotStudent = tranches.length * etudiants.length;
  const totalPresentsHourly = hourlyStats.reduce((sum, h) => sum + h.p + h.r + h.j, 0);
  const globalHourlyRate =
    totalSlotStudent > 0 ? Math.round((totalPresentsHourly / totalSlotStudent) * 100) : 100;

  const visibleEtudiants = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return etudiants;
    return etudiants.filter(
      (e) =>
        e.nom.toLowerCase().includes(q) ||
        e.prenom.toLowerCase().includes(q) ||
        e.matricule.toLowerCase().includes(q)
    );
  }, [etudiants, studentSearch]);

  const classOptions = classes.map((c) => ({ value: c.id, label: `${c.code} — ${c.nom}` }));
  const matiereOptions = (currentClasse?.matieres ?? []).map((m) => ({
    value: m.id,
    label: `${m.code} (${m.nom})`,
  }));

  if (loading) return <PageSkeleton />;

  const isEditing = !!editingSeanceId;
  const submitLabel = saving
    ? "Enregistrement..."
    : isEditing
    ? "Mettre à jour la feuille"
    : modeHeureParHeure
    ? `Valider les ${tranches.length} heures d'appel`
    : "Valider l'émargement";

  const remarqueInput = (et: EtudiantItem, placeholder: string) => (
    <Input
      aria-label={`Remarque pour ${et.nom} ${et.prenom}`}
      size="small"
      allowClear
      placeholder={placeholder}
      value={presencesState[et.id]?.remarque || ""}
      onChange={(e) => setStudentRemarque(et.id, e.target.value)}
    />
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* En-tête */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 sm:p-8 text-white shadow-sm">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 backdrop-blur">
            <CalendarCheck className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Émargement &amp; feuille de présences
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              Pointage rapide par séance, calcul de l&apos;assiduité et historique des cours.
            </p>
          </div>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200/80 text-center shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <School className="w-7 h-7" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Aucune classe disponible</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Choisissez d&apos;abord votre classe et programmez votre matière pour pouvoir faire l&apos;appel.
          </p>
          <Link
            href="/dashboard/classes?action=add-matiere"
            className="inline-flex items-center gap-2 px-4 h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Choisir ma classe &amp; ajouter une matière
          </Link>
        </div>
      ) : (
        <>
          {/* Contexte : classe & matière */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className={`${labelClass} block mb-1.5`}>Classe</span>
                <Select
                  aria-label="Classe"
                  className="w-full"
                  size="large"
                  showSearch
                  value={selectedClasseId || undefined}
                  onChange={handleClasseChange}
                  options={classOptions}
                  optionFilterProp="label"
                  suffixIcon={<School className="w-4 h-4 text-slate-400" />}
                />
              </div>
              <div>
                <span className={`${labelClass} block mb-1.5`}>Matière</span>
                <Select
                  aria-label="Matière"
                  className="w-full"
                  size="large"
                  showSearch
                  value={selectedMatiereId || undefined}
                  onChange={handleMatiereChange}
                  options={matiereOptions}
                  optionFilterProp="label"
                  placeholder="Aucune matière dans cette classe"
                  suffixIcon={<BookOpen className="w-4 h-4 text-slate-400" />}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-semibold">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                {etudiants.length} auditeur{etudiants.length > 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-semibold">
                <History className="w-3.5 h-3.5 text-indigo-600" />
                {historique.length} séance{historique.length > 1 ? "s" : ""} enregistrée
                {historique.length > 1 ? "s" : ""}
              </span>
            </div>
            {!selectedMatiereId && (
              <Alert
                className="!mt-4"
                type="warning"
                showIcon
                title="Aucune matière programmée dans cette classe."
                description={
                  <Link
                    href={`/dashboard/classes?action=add-matiere`}
                    className="font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Programmer un cours &rarr;
                  </Link>
                }
              />
            )}
          </section>

          {/* Onglets */}
          <div className="flex items-center gap-1 border-b border-slate-200" role="tablist">
            {(
              [
                {
                  key: "nouveau" as const,
                  label: isEditing ? "Modification en cours" : "Nouvelle séance",
                  icon: isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />,
                },
                {
                  key: "historique" as const,
                  label: `Historique (${historique.length})`,
                  icon: <History className="w-4 h-4" />,
                },
              ] as const
            ).map((t) => {
              const active = currentTab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCurrentTab(t.key)}
                  className={`-mb-px pb-3 pt-1 px-4 text-xs font-bold border-b-2 inline-flex items-center gap-2 transition cursor-pointer ${
                    active
                      ? t.key === "nouveau" && isEditing
                        ? "border-amber-500 text-amber-700"
                        : "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Formulaire d'émargement (toujours monté pour conserver les valeurs) */}
          <Form<SeanceFormValues>
            form={form}
            name="seance_form"
            layout="vertical"
            requiredMark={false}
            autoComplete="off"
            onFinish={handleSaveSeance}
            onValuesChange={(changed) => {
              if (changed.heureDebut || changed.nombreHeures !== undefined) {
                const start = (form.getFieldValue("heureDebut") as Dayjs | undefined)?.format(TIME_FORMAT) ?? "08:00";
                const hours = (form.getFieldValue("nombreHeures") as number | undefined) ?? 2;
                form.setFieldValue("heureFin", dayjs(computeHeureFin(start, hours), TIME_FORMAT));
              }
            }}
            initialValues={{
              date: dayjs(),
              heureDebut: dayjs("08:00", TIME_FORMAT),
              heureFin: dayjs("10:00", TIME_FORMAT),
              nombreHeures: 2,
              description: "",
            }}
            className={currentTab === "nouveau" ? "space-y-6" : "hidden"}
          >
            {isEditing && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-600 text-white rounded-xl shrink-0">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">
                      Modification de la feuille d&apos;appel du{" "}
                      {dateV
                        ? dateV.toDate().toLocaleDateString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : ""}{" "}
                      ({heureDebut} - {heureFin})
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Les présences et la progression de cette séance passée sont chargées ci-dessous.
                      Ajustez-les puis enregistrez.
                    </p>
                  </div>
                </div>
                <Button onClick={resetEditing} className="!text-xs !font-bold self-end sm:self-center">
                  Annuler la modification
                </Button>
              </div>
            )}

            {/* Métadonnées de la séance */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4">
                <Form.Item
                  label={<span className={labelClass}>Date de la séance</span>}
                  name="date"
                  rules={[{ required: true, message: "Indiquez la date." }]}
                >
                  <DatePicker
                    className="!w-full"
                    format="DD/MM/YYYY"
                    allowClear={false}
                    suffixIcon={<CalendarDays className="w-4 h-4 text-slate-400" />}
                  />
                </Form.Item>

                <Form.Item label={<span className={labelClass}>Horaires (début – fin)</span>} required={false}>
                  <div className="flex items-center gap-2">
                    <Form.Item name="heureDebut" noStyle rules={[{ required: true, message: "Heure requise." }]}>
                      <TimePicker
                        aria-label="Heure de début"
                        className="!w-full"
                        format={TIME_FORMAT}
                        minuteStep={5}
                        allowClear={false}
                        needConfirm={false}
                        showNow={false}
                      />
                    </Form.Item>
                    <span className="text-xs text-slate-400">à</span>
                    <Form.Item name="heureFin" noStyle rules={[{ required: true, message: "Heure requise." }]}>
                      <TimePicker
                        aria-label="Heure de fin"
                        className="!w-full"
                        format={TIME_FORMAT}
                        minuteStep={5}
                        allowClear={false}
                        needConfirm={false}
                        showNow={false}
                      />
                    </Form.Item>
                  </div>
                </Form.Item>

                <Form.Item
                  label={<span className={labelClass}>Nombre d&apos;heures (volume)</span>}
                  name="nombreHeures"
                  rules={[{ required: true, message: "Indiquez le volume." }]}
                >
                  <Select options={hourOptions} />
                </Form.Item>

                <Form.Item
                  label={<span className={labelClass}>Intitulé / thème du cours</span>}
                  name="description"
                >
                  <Input allowClear maxLength={200} placeholder="Ex : TP Modélisation, cours magistral…" />
                </Form.Item>
              </div>
            </section>

            <ChapitresPicker
              chapitres={courseChapitres}
              selectedChapitreIds={selectedChapitreIds}
              selectedSousChapitreIds={selectedSousChapitreIds}
              onToggleChapitre={handleToggleChapitre}
              onToggleSous={handleToggleSousChapitre}
              onSelectAllSous={handleSelectAllSous}
              definitionHref={`/dashboard/progression?classeId=${selectedClasseId}&coursId=${selectedMatiereId}`}
            />

            {/* Émargement heure par heure */}
            {!isEditing && (
              <section className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">Émargement heure par heure</h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          modeHeureParHeure ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {modeHeureParHeure ? "Activé" : "Désactivé"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {modeHeureParHeure
                        ? `Pointage distinct pour chaque heure (${tranches
                            .map((t) => t.shortLabel)
                            .join(", ")}) — enregistrera ${tranches.length} séance(s) d'1h distinctes.`
                        : `Faire l'appel séparément pour chacune des ${nombreHeures}h du cours.`}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={modeHeureParHeure}
                  onChange={handleToggleModeHeureParHeure}
                  aria-label="Activer l'émargement heure par heure"
                />
              </section>
            )}

            {/* Feuille d'appel */}
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              {/* Barre d'actions + compteurs */}
              <div className="p-4 sm:p-5 border-b border-slate-100 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                      {modeHeureParHeure ? "Actions globales" : "Actions rapides"}
                    </span>
                    <Button
                      type="primary"
                      icon={<CheckCheck className="w-4 h-4" />}
                      onClick={() => markAll("PRESENT")}
                      className="!text-xs !font-bold !bg-emerald-600 hover:!bg-emerald-700"
                    >
                      {modeHeureParHeure ? "Tous présents (toutes les heures)" : "Marquer tous présents"}
                    </Button>
                    <Button
                      danger
                      icon={<XCircle className="w-4 h-4" />}
                      onClick={() => markAll("ABSENT")}
                      className="!text-xs !font-bold"
                    >
                      Marquer tous absents
                    </Button>
                  </div>

                  {modeHeureParHeure ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      {hourlyStats.map((h) => (
                        <span
                          key={h.index}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 inline-flex items-center gap-1.5"
                        >
                          <span className="font-extrabold text-blue-700">{h.shortLabel}:</span>
                          <span className="text-emerald-700">{h.p}P</span>/
                          <span className="text-rose-700">{h.a}A</span>
                        </span>
                      ))}
                      <span className="text-blue-900 font-extrabold bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                        {globalHourlyRate}% assiduité globale
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {counts.p} Présent{counts.p > 1 ? "s" : ""}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        {counts.r} Retard{counts.r > 1 ? "s" : ""}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {counts.a} Absent{counts.a > 1 ? "s" : ""}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                        <HelpCircle className="w-3.5 h-3.5" />
                        {counts.j} Justifié{counts.j > 1 ? "s" : ""}
                      </span>
                      <span className="text-slate-900 font-extrabold bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                        {counts.rate}% d&apos;assiduité
                      </span>
                    </div>
                  )}
                </div>

                {etudiants.length > 8 && (
                  <Input
                    aria-label="Rechercher un auditeur dans la feuille"
                    allowClear
                    prefix={<Search className="w-4 h-4 text-slate-400" />}
                    placeholder="Rechercher un auditeur dans la feuille…"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="sm:max-w-sm"
                  />
                )}
              </div>

              {etudiants.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Aucun auditeur dans cette classe</p>
                  <Link
                    href="/dashboard/classes?action=add-etudiant"
                    className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Inscrire des auditeurs &rarr;
                  </Link>
                </div>
              ) : visibleEtudiants.length === 0 ? (
                <div className="px-6 py-10 text-center text-xs text-slate-500">
                  Aucun auditeur ne correspond à votre recherche.
                </div>
              ) : (
                <>
                  {/* Grand écran : tableau */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full min-w-max text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="px-5 py-3">N°</th>
                          <th className="px-4 py-3">Matricule</th>
                          <th className="px-4 py-3 min-w-[200px] whitespace-nowrap">Nom et prénom</th>
                          {modeHeureParHeure ? (
                            tranches.map((t) => (
                              <th key={t.index} className="px-3 py-3 text-center border-l border-slate-200 normal-case">
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className="flex items-center gap-1 text-slate-800 font-bold whitespace-nowrap">
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    {t.label}
                                  </span>
                                  <div className="flex items-center gap-1 text-[10px]">
                                    <button
                                      type="button"
                                      onClick={() => markAllHour(t.index, "PRESENT")}
                                      className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold transition cursor-pointer"
                                      title="Tous présents pour cette heure"
                                    >
                                      Tous P
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => markAllHour(t.index, "ABSENT")}
                                      className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 hover:bg-rose-200 font-bold transition cursor-pointer"
                                      title="Tous absents pour cette heure"
                                    >
                                      Tous A
                                    </button>
                                    {t.index > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => copyHourToNext(t.index - 1, t.index)}
                                        className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 font-bold transition cursor-pointer"
                                        title={`Copier l'appel de H${t.index} vers H${t.index + 1}`}
                                      >
                                        = H{t.index}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </th>
                            ))
                          ) : (
                            <th className="px-4 py-3 text-center">Statut d&apos;émargement</th>
                          )}
                          <th className="px-4 py-3 min-w-[200px]">Remarque / motif</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visibleEtudiants.map((et) => {
                          const idx = etudiants.findIndex((e) => e.id === et.id);
                          return (
                            <tr key={et.id} className="hover:bg-slate-50/60 transition">
                              <td className="px-5 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="px-4 py-2.5">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-bold text-slate-700">
                                  {et.matricule}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-semibold text-slate-900 text-sm whitespace-nowrap">
                                {et.nom} {et.prenom}
                              </td>
                              {modeHeureParHeure ? (
                                tranches.map((t) => (
                                  <td key={t.index} className="px-3 py-2 border-l border-slate-100 text-center">
                                    <StatutPicker
                                      variant="compact"
                                      label={`${et.nom} — ${t.shortLabel}`}
                                      value={getStudentHourStatut(et.id, t.index)}
                                      onChange={(s) => setStudentHourStatut(et.id, t.index, s)}
                                    />
                                  </td>
                                ))
                              ) : (
                                <td className="px-4 py-2.5 text-center">
                                  <StatutPicker
                                    label={`${et.nom} ${et.prenom}`}
                                    value={presencesState[et.id]?.statut || "PRESENT"}
                                    onChange={(s) => setStudentStatut(et.id, s)}
                                  />
                                </td>
                              )}
                              <td className="px-4 py-2.5">
                                {remarqueInput(et, modeHeureParHeure ? "Remarque…" : "Ex : retard 10 min, dispense…")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile & tablette : cartes */}
                  <ul className="lg:hidden divide-y divide-slate-100">
                    {visibleEtudiants.map((et) => {
                      const idx = etudiants.findIndex((e) => e.id === et.id);
                      return (
                        <li key={et.id} className="p-4 space-y-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 text-[11px] font-mono text-slate-400">{idx + 1}</span>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-slate-900 truncate">
                                {et.nom} {et.prenom}
                              </p>
                              <p className="font-mono text-[11px] font-bold text-slate-500">{et.matricule}</p>
                            </div>
                          </div>

                          {modeHeureParHeure ? (
                            <div className="space-y-2">
                              {tranches.map((t) => (
                                <div key={t.index} className="flex items-center justify-between gap-3">
                                  <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
                                    {t.shortLabel}{" "}
                                    <span className="font-normal text-slate-400">
                                      {t.heureDebut}–{t.heureFin}
                                    </span>
                                  </span>
                                  <StatutPicker
                                    variant="compact"
                                    label={`${et.nom} — ${t.shortLabel}`}
                                    value={getStudentHourStatut(et.id, t.index)}
                                    onChange={(s) => setStudentHourStatut(et.id, t.index, s)}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <StatutPicker
                                label={`${et.nom} ${et.prenom}`}
                                value={presencesState[et.id]?.statut || "PRESENT"}
                                onChange={(s) => setStudentStatut(et.id, s)}
                              />
                            </div>
                          )}

                          {remarqueInput(et, "Remarque / motif…")}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {/* Pied de page : reste visible pendant le défilement */}
              <div className="sticky bottom-0 z-20 p-4 bg-white/95 backdrop-blur border-t border-slate-200 rounded-b-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  {modeHeureParHeure
                    ? `Total : ${etudiants.length} auditeurs × ${tranches.length} heure(s) = ${
                        etudiants.length * tranches.length
                      } pointages horaires.`
                    : `Total : ${etudiants.length} auditeurs sur la feuille d'appel.`}
                </span>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {isEditing && (
                    <Button onClick={resetEditing} className="!text-xs !font-semibold">
                      Annuler la modification
                    </Button>
                  )}
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={saving}
                    disabled={!selectedMatiereId || etudiants.length === 0}
                    icon={!saving ? <Save className="w-4 h-4" /> : undefined}
                    className="!text-xs !font-bold"
                  >
                    {submitLabel}
                  </Button>
                </div>
              </div>
            </section>
          </Form>

          {/* Historique */}
          {currentTab === "historique" && (
            <HistoriqueSeances
              historique={historique}
              etudiants={etudiants}
              canDelete={userRole === "ENSEIGNANT"}
              exportHref={`/api/export/presences-excel?classeId=${selectedClasseId}&matiereId=${selectedMatiereId}`}
              onEdit={handleEditSeance}
              onDelete={handleDeleteSeance}
            />
          )}
        </>
      )}
    </div>
  );
}
