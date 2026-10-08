"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Library,
  Plus,
  Search,
  BookOpen,
  UserCheck,
  Building,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
  Users,
  GraduationCap,
  ListChecks,
} from "lucide-react";

interface Enseignant {
  id: string;
  nom: string;
  email: string | null;
  username: string;
}

interface CoursInfo {
  id: string;
  classe: {
    id: string;
    code: string;
    nom: string;
  };
  enseignant?: Enseignant | null;
  volumeHoraire: number;
  coefficient: number;
}

interface Matiere {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  enseignantId: string | null;
  enseignant: Enseignant | null;
  cours: CoursInfo[];
  _count?: {
    cours: number;
    chapitres?: number;
  };
}

interface CurrentUser {
  id: string;
  nom: string;
  role: "ADMINISTRATION" | "ENSEIGNANT" | "CHEF_CLASSE";
}

export default function MatieresPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEnseignant, setFilterEnseignant] = useState("TOUS");

  // Notification state
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal create/edit state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMatiere, setEditingMatiere] = useState<Matiere | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formNom, setFormNom] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEnseignantId, setFormEnseignantId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modal changer enseignant d'un cours programmé
  const [editingCours, setEditingCours] = useState<{
    id: string;
    matiereNom: string;
    classeCode: string;
    classeNom: string;
    enseignantId: string | null;
  } | null>(null);
  const [coursEnseignantId, setCoursEnseignantId] = useState("");
  const [submittingCours, setSubmittingCours] = useState(false);

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resUser, resMatieres, resEnseignants] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/matieres"),
        fetch("/api/enseignants"),
      ]);

      if (resUser.ok) {
        const dataUser = await resUser.json();
        setCurrentUser(dataUser.user);
      }

      if (resMatieres.ok) {
        const dataMat = await resMatieres.json();
        setMatieres(dataMat);
      }

      if (resEnseignants.ok) {
        const dataEns = await resEnseignants.json();
        setEnseignants(dataEns);
      }
    } catch (err) {
      console.error("Erreur chargement matières:", err);
      setNotification({
        type: "error",
        message: "Erreur lors du chargement des matières.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingMatiere(null);
    setFormCode("");
    setFormNom("");
    setFormDescription("");
    setFormEnseignantId(currentUser?.role === "ENSEIGNANT" ? currentUser.id : "");
    setModalOpen(true);
  };

  const openEditModal = (m: Matiere) => {
    setEditingMatiere(m);
    setFormCode(m.code);
    setFormNom(m.nom);
    setFormDescription(m.description || "");
    setFormEnseignantId(m.enseignantId || "");
    setModalOpen(true);
  };

  const handleSaveMatiere = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formNom.trim()) {
      setNotification({
        type: "error",
        message: "Le code et l'intitulé de la matière sont obligatoires.",
      });
      return;
    }

    try {
      setSubmitting(true);
      const url = editingMatiere
        ? `/api/matieres/${editingMatiere.id}`
        : "/api/matieres";
      const method = editingMatiere ? "PUT" : "POST";

      const payload = {
        code: formCode.trim().toUpperCase(),
        nom: formNom.trim(),
        description: formDescription.trim() || null,
        enseignantId: formEnseignantId || null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setNotification({
          type: "error",
          message: data.error || "Erreur lors de l'enregistrement.",
        });
        return;
      }

      setNotification({
        type: "success",
        message: editingMatiere
          ? "Matière mise à jour avec succès !"
          : "Matière créée et enregistrée dans le catalogue !",
      });

      setModalOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: "Erreur réseau lors de l'enregistrement.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMatiere = async (m: Matiere) => {
    if (m._count && m._count.cours > 0) {
      alert(
        `Impossible de supprimer "${m.nom}" car elle est actuellement programmée dans ${m._count.cours} classe(s). Veuillez d'abord retirer les cours associés dans les classes correspondantes.`
      );
      return;
    }

    if (
      !confirm(
        `Voulez-vous vraiment supprimer la matière "${m.nom}" (${m.code}) du catalogue ?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/matieres/${m.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setNotification({
          type: "error",
          message: data.error || "Erreur lors de la suppression.",
        });
        return;
      }

      setNotification({
        type: "success",
        message: "Matière supprimée du catalogue.",
      });
      await loadData();
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: "Erreur réseau lors de la suppression.",
      });
    }
  };

  const handleUpdateCoursEnseignant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCours) return;

    try {
      setSubmittingCours(true);
      const res = await fetch(`/api/cours/${editingCours.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enseignantId: coursEnseignantId || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setNotification({
          type: "error",
          message: err.error || "Erreur lors de la réaffectation de l'enseignant.",
        });
        return;
      }

      setNotification({
        type: "success",
        message: `L'enseignant du cours pour la classe ${editingCours.classeCode} a été mis à jour avec succès.`,
      });
      setEditingCours(null);
      await loadData();
    } catch {
      setNotification({
        type: "error",
        message: "Erreur réseau lors de la mise à jour.",
      });
    } finally {
      setSubmittingCours(false);
    }
  };

  // Filtrage
  const filteredMatieres = useMemo(() => {
    return matieres.filter((m) => {
      const matchesSearch =
        m.code.toLowerCase().includes(search.toLowerCase()) ||
        m.nom.toLowerCase().includes(search.toLowerCase()) ||
        (m.enseignant &&
          m.enseignant.nom.toLowerCase().includes(search.toLowerCase())) ||
        (m.description &&
          m.description.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterEnseignant === "TOUS") return true;
      if (filterEnseignant === "NON_ASSIGNE") return !m.enseignantId;
      if (filterEnseignant === "MES_MATIERES")
        return m.enseignantId === currentUser?.id;
      return m.enseignantId === filterEnseignant;
    });
  }, [matieres, search, filterEnseignant, currentUser]);

  // Statistiques
  const stats = useMemo(() => {
    const total = matieres.length;
    const assignees = matieres.filter((m) => !!m.enseignantId).length;
    const orphelines = total - assignees;
    const totalCoursClasses = matieres.reduce(
      (acc, m) => acc + (m._count?.cours || m.cours?.length || 0),
      0
    );
    return { total, assignees, orphelines, totalCoursClasses };
  }, [matieres]);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notification && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl shadow-sm border text-sm font-medium transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Library className="w-7 h-7 text-blue-600" />
            Catalogue des Matières
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez le référentiel des matières de l&apos;établissement et affectez-les aux enseignants responsables.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Matière
        </button>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-500 mb-1">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold">Total Matières</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-500 mb-1">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold">Avec Enseignant</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">{stats.assignees}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-500 mb-1">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold">Non assignées</span>
          </div>
          <p className="text-2xl font-extrabold text-amber-600">{stats.orphelines}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-500 mb-1">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold">Cours en Classes</span>
          </div>
          <p className="text-2xl font-extrabold text-indigo-600">
            {stats.totalCoursClasses}
          </p>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par code, nom, prof..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Filtrer :
          </span>
          <select
            value={filterEnseignant}
            onChange={(e) => setFilterEnseignant(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto font-medium"
          >
            <option value="TOUS">Tous les enseignants</option>
            {currentUser?.role === "ENSEIGNANT" && (
              <option value="MES_MATIERES">Mes matières affectées</option>
            )}
            <option value="NON_ASSIGNE">Matières sans enseignant</option>
            <optgroup label="Par enseignant">
              {enseignants.map((ens) => (
                <option key={ens.id} value={ens.id}>
                  {ens.nom} ({ens.username})
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Tableau des Matières */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Chargement du catalogue des matières...</p>
          </div>
        ) : filteredMatieres.length === 0 ? (
          <div className="p-12 text-center">
            <Library className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              Aucune matière trouvée
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {search || filterEnseignant !== "TOUS"
                ? "Aucun résultat ne correspond à vos filtres actuels."
                : "Commencez par ajouter votre première matière au catalogue de l'établissement."}
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              Créer une matière
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Intitulé & Description</th>
                  <th className="py-3.5 px-4">Syllabus / Chapitres</th>
                  <th className="py-3.5 px-4">Enseignant Responsable</th>
                  <th className="py-3.5 px-4">Classes où elle est enseignée</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMatieres.map((m) => {
                  const nbCours = m._count?.cours || m.cours?.length || 0;
                  const isOwnerOrAdmin =
                    currentUser?.role === "ADMINISTRATION" ||
                    m.enseignantId === currentUser?.id ||
                    !m.enseignantId;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                        <span className="px-2.5 py-1 bg-blue-50 border border-blue-200/60 rounded-lg inline-block">
                          {m.code}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 text-sm">{m.nom}</p>
                        {m.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 max-w-md line-clamp-1">
                            {m.description}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {m._count?.chapitres && m._count.chapitres > 0 ? (
                          <Link
                            href={`/dashboard/progression?matiereId=${m.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition"
                            title="Consulter ou modifier les chapitres de cette matière"
                          >
                            <ListChecks className="w-3.5 h-3.5 text-indigo-600" />
                            <span>
                              {m._count.chapitres} chapitre{m._count.chapitres > 1 ? "s" : ""}
                            </span>
                          </Link>
                        ) : (
                          <Link
                            href={`/dashboard/progression?matiereId=${m.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 transition"
                            title="Définir les chapitres (saisie manuelle ou import Word IA)"
                          >
                            <Plus className="w-3 h-3 text-slate-400" />
                            <span>Définir programme</span>
                          </Link>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {m.enseignant ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                              {m.enseignant.nom.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {m.enseignant.nom}
                              </p>
                              {m.enseignant.email && (
                                <p className="text-[10px] text-slate-400">
                                  {m.enseignant.email}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3 h-3" />
                            Non affecté
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {nbCours > 0 ? (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {m.cours?.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  if (currentUser?.role === "ADMINISTRATION") {
                                    setEditingCours({
                                      id: c.id,
                                      matiereNom: m.nom,
                                      classeCode: c.classe?.code,
                                      classeNom: c.classe?.nom,
                                      enseignantId: c.enseignant?.id || null,
                                    });
                                    setCoursEnseignantId(c.enseignant?.id || "");
                                  }
                                }}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition ${
                                  currentUser?.role === "ADMINISTRATION"
                                    ? "bg-slate-100 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 cursor-pointer text-slate-700 border-slate-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200 cursor-default"
                                }`}
                                title={
                                  currentUser?.role === "ADMINISTRATION"
                                    ? `Classe: ${c.classe?.code} (${c.classe?.nom}) | Enseignant: ${c.enseignant?.nom || "Non assigné"} - Cliquer pour changer l'enseignant de ce cours`
                                    : `Classe: ${c.classe?.code} | Enseignant: ${c.enseignant?.nom || "Non assigné"}`
                                }
                              >
                                <span className="font-semibold">{c.classe?.code}</span>
                                {c.enseignant ? (
                                  <span className="text-[10px] text-slate-500 font-normal">
                                    ({c.enseignant.nom.split(" ")[0]})
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-600 font-normal">
                                    (Sans prof)
                                  </span>
                                )}
                              </button>
                            ))}
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({nbCours} classe{nbCours > 1 ? "s" : ""})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Non programmée
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/progression?matiereId=${m.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="Gérer le programme / chapitres de la matière"
                          >
                            <ListChecks className="w-4 h-4" />
                          </Link>

                          {isOwnerOrAdmin && (
                            <button
                              onClick={() => openEditModal(m)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="Modifier la matière ou réaffecter l'enseignant"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {isOwnerOrAdmin && (
                            <button
                              onClick={() => handleDeleteMatiere(m)}
                              disabled={nbCours > 0}
                              className={`p-1.5 rounded-lg transition ${
                                nbCours > 0
                                  ? "text-slate-300 cursor-not-allowed"
                                  : "text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                              }`}
                              title={
                                nbCours > 0
                                  ? "Impossible de supprimer : matière en cours dans des classes"
                                  : "Supprimer du catalogue"
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Créer / Modifier Matière */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                {editingMatiere
                  ? "Modifier la matière"
                  : "Créer une matière dans le catalogue"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMatiere} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: INFO-101"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Intitulé de la matière <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Architecture Logicielle et DevOps"
                    value={formNom}
                    onChange={(e) => setFormNom(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enseignant Responsable (Affectation)
                </label>
                <select
                  value={formEnseignantId}
                  onChange={(e) => setFormEnseignantId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                >
                  <option value="">-- Aucun enseignant (Non assigné) --</option>
                  {enseignants.map((ens) => (
                    <option key={ens.id} value={ens.id}>
                      {ens.nom} ({ens.username}) {ens.email ? `- ${ens.email}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Cet enseignant sera pré-sélectionné lors de la programmation de cette matière dans une classe.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Objectifs pédagogiques (Optionnel)
                </label>
                <textarea
                  rows={3}
                  placeholder="Objectifs du module, compétences visées, prérequis..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {submitting
                    ? "Enregistrement..."
                    : editingMatiere
                    ? "Enregistrer les modifications"
                    : "Créer la matière"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Réaffecter l'enseignant d'un cours programmé */}
      {editingCours && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  Changer l&apos;enseignant du cours
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Matière : <strong className="text-slate-700">{editingCours.matiereNom}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCours(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCoursEnseignant} className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900">
                <p>
                  Classe concernée : <strong>{editingCours.classeCode}</strong> &bull; {editingCours.classeNom}
                </p>
                <p className="text-[11px] text-blue-700 mt-1">
                  Cette modification s&apos;applique spécifiquement au cours dispensé dans cette classe.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nouvel enseignant pour ce cours *
                </label>
                <select
                  value={coursEnseignantId}
                  onChange={(e) => setCoursEnseignantId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-900"
                >
                  <option value="">-- Aucun enseignant (Non assigné) --</option>
                  {enseignants.map((ens) => (
                    <option key={ens.id} value={ens.id}>
                      {ens.nom} ({ens.username}) {ens.email ? `- ${ens.email}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCours(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingCours}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {submittingCours ? "Enregistrement..." : "Enregistrer la réaffectation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
