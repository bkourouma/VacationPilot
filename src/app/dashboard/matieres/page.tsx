"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { App, Button, Form, Input, Modal, Popconfirm, Select, Tooltip } from "antd";
import {
  Library,
  Plus,
  Search,
  BookOpen,
  UserCheck,
  Pencil,
  Trash2,
  AlertCircle,
  GraduationCap,
  ListChecks,
  Hash,
  Type,
  User,
  Users,
  ArrowUpRight,
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

interface MatiereFormValues {
  code: string;
  nom: string;
  enseignantId?: string;
  description?: string;
}

interface CoursFormValues {
  enseignantId?: string;
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

const labelClass = "text-xs font-bold text-slate-700";

export default function MatieresPage() {
  const { message } = App.useApp();
  const [matiereForm] = Form.useForm<MatiereFormValues>();
  const [coursForm] = Form.useForm<CoursFormValues>();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEnseignant, setFilterEnseignant] = useState("TOUS");

  // Création / modification d'une matière
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMatiere, setEditingMatiere] = useState<Matiere | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Réaffectation de l'enseignant d'un cours programmé
  const [editingCours, setEditingCours] = useState<{
    id: string;
    matiereNom: string;
    classeCode: string;
    classeNom: string;
  } | null>(null);
  const [submittingCours, setSubmittingCours] = useState(false);

  const isAdmin = currentUser?.role === "ADMINISTRATION";
  const isTeacher = currentUser?.role === "ENSEIGNANT";

  const loadData = async () => {
    try {
      const [resUser, resMatieres, resEnseignants] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/matieres"),
        fetch("/api/enseignants"),
      ]);

      if (resUser.ok) {
        const dataUser = await resUser.json();
        setCurrentUser(dataUser.user);
      }
      if (resMatieres.ok) setMatieres(await resMatieres.json());
      if (resEnseignants.ok) setEnseignants(await resEnseignants.json());
    } catch (err) {
      console.error("Erreur chargement matières:", err);
      message.error("Erreur lors du chargement des matières.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const teacherOptions = useMemo(
    () =>
      enseignants.map((ens) => ({
        value: ens.id,
        label: `${ens.nom} (${ens.username})`,
        search: `${ens.nom} ${ens.username} ${ens.email ?? ""}`,
      })),
    [enseignants]
  );

  const openCreateModal = () => {
    setEditingMatiere(null);
    matiereForm.resetFields();
    matiereForm.setFieldsValue({ enseignantId: isTeacher ? currentUser?.id : undefined });
    setModalOpen(true);
  };

  const openEditModal = (m: Matiere) => {
    setEditingMatiere(m);
    matiereForm.setFieldsValue({
      code: m.code,
      nom: m.nom,
      description: m.description || "",
      enseignantId: m.enseignantId || undefined,
    });
    setModalOpen(true);
  };

  const handleSaveMatiere = async (values: MatiereFormValues) => {
    try {
      setSubmitting(true);
      const url = editingMatiere ? `/api/matieres/${editingMatiere.id}` : "/api/matieres";
      const method = editingMatiere ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: values.code.trim().toUpperCase(),
          nom: values.nom.trim(),
          description: values.description?.trim() || null,
          enseignantId: values.enseignantId || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "Erreur lors de l'enregistrement.");
        return;
      }

      message.success(
        editingMatiere
          ? "Matière mise à jour avec succès."
          : "Matière créée et enregistrée dans le catalogue."
      );
      setModalOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      message.error("Erreur réseau lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMatiere = async (m: Matiere) => {
    try {
      setDeletingId(m.id);
      const res = await fetch(`/api/matieres/${m.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "Erreur lors de la suppression.");
        return;
      }
      message.success("Matière supprimée du catalogue.");
      await loadData();
    } catch (err) {
      console.error(err);
      message.error("Erreur réseau lors de la suppression.");
    } finally {
      setDeletingId(null);
    }
  };

  const openCoursModal = (
    c: CoursInfo,
    matiereNom: string
  ) => {
    setEditingCours({
      id: c.id,
      matiereNom,
      classeCode: c.classe?.code,
      classeNom: c.classe?.nom,
    });
    coursForm.setFieldsValue({ enseignantId: c.enseignant?.id || undefined });
  };

  const handleUpdateCoursEnseignant = async (values: CoursFormValues) => {
    if (!editingCours) return;

    try {
      setSubmittingCours(true);
      const res = await fetch(`/api/cours/${editingCours.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enseignantId: values.enseignantId || null }),
      });

      if (!res.ok) {
        const err = await res.json();
        message.error(err.error || "Erreur lors de la réaffectation de l'enseignant.");
        return;
      }

      message.success(
        `L'enseignant du cours pour la classe ${editingCours.classeCode} a été mis à jour.`
      );
      setEditingCours(null);
      await loadData();
    } catch {
      message.error("Erreur réseau lors de la mise à jour.");
    } finally {
      setSubmittingCours(false);
    }
  };

  // Filtrage
  const filteredMatieres = useMemo(() => {
    const q = search.trim().toLowerCase();
    return matieres.filter((m) => {
      const matchesSearch =
        !q ||
        m.code.toLowerCase().includes(q) ||
        m.nom.toLowerCase().includes(q) ||
        (m.enseignant && m.enseignant.nom.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterEnseignant === "TOUS") return true;
      if (filterEnseignant === "NON_ASSIGNE") return !m.enseignantId;
      if (filterEnseignant === "MES_MATIERES") return m.enseignantId === currentUser?.id;
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

  // --- Fragments partagés entre le tableau (grand écran) et les cartes (mobile / tablette) ---
  const renderProgramme = (m: Matiere) => {
    const nbChapitres = m._count?.chapitres ?? 0;
    return (
      <Link
        href={`/dashboard/progression?matiereId=${m.id}`}
        title={
          nbChapitres > 0
            ? "Consulter ou modifier les chapitres de cette matière"
            : "Définir les chapitres (saisie manuelle ou import Word IA)"
        }
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition whitespace-nowrap ${
          nbChapitres > 0
            ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
            : "bg-white text-slate-500 border-dashed border-slate-300 hover:border-slate-400 hover:text-slate-700"
        }`}
      >
        {nbChapitres > 0 ? (
          <>
            <ListChecks className="w-3.5 h-3.5" />
            {nbChapitres} chapitre{nbChapitres > 1 ? "s" : ""}
          </>
        ) : (
          <>
            <Plus className="w-3 h-3" />
            Définir le programme
          </>
        )}
      </Link>
    );
  };

  const renderEnseignant = (m: Matiere) =>
    m.enseignant ? (
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${avatarTone(
            m.enseignant.nom
          )}`}
        >
          {m.enseignant.nom.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 truncate">{m.enseignant.nom}</p>
          {m.enseignant.email && (
            <p className="text-[10px] text-slate-400 truncate">{m.enseignant.email}</p>
          )}
        </div>
      </div>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
        <AlertCircle className="w-3 h-3" />
        Non affecté
      </span>
    );

  const renderClasses = (m: Matiere) => {
    const nbCours = m._count?.cours || m.cours?.length || 0;
    if (nbCours === 0) {
      return <span className="text-[11px] text-slate-400 italic">Non programmée</span>;
    }
    return (
      <div className="flex flex-wrap gap-1.5 items-center">
        {m.cours?.map((c) => {
          const tip = `${c.classe?.code} (${c.classe?.nom}) · ${
            c.enseignant?.nom || "Sans enseignant"
          }${isAdmin ? " — cliquer pour changer l'enseignant" : ""}`;
          return (
            <Tooltip key={c.id} title={tip}>
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => openCoursModal(c, m.nom)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition whitespace-nowrap ${
                  isAdmin
                    ? "bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 cursor-pointer text-slate-700 border-slate-200"
                    : "bg-slate-50 text-slate-700 border-slate-200 cursor-default"
                }`}
              >
                <span className="font-semibold">{c.classe?.code}</span>
                {c.enseignant ? (
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({c.enseignant.nom.split(" ")[0]})
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-600 font-normal">(sans prof)</span>
                )}
              </button>
            </Tooltip>
          );
        })}
      </div>
    );
  };

  const renderActions = (m: Matiere) => {
    const nbCours = m._count?.cours || m.cours?.length || 0;
    const canManage = isAdmin || m.enseignantId === currentUser?.id || !m.enseignantId;

    return (
      <div className="flex items-center justify-end gap-0.5">
        <Tooltip title="Gérer le programme / les chapitres">
          <Link
            href={`/dashboard/progression?matiereId=${m.id}`}
            aria-label="Gérer le programme"
            className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition inline-flex"
          >
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </Tooltip>

        {canManage && (
          <Tooltip title="Modifier la matière ou réaffecter l'enseignant">
            <Button
              type="text"
              aria-label={`Modifier ${m.nom}`}
              icon={<Pencil className="w-4 h-4 text-slate-500" />}
              onClick={() => openEditModal(m)}
            />
          </Tooltip>
        )}

        {canManage &&
          (nbCours > 0 ? (
            <Tooltip title="Suppression impossible : matière programmée dans des classes">
              <span>
                <Button
                  type="text"
                  disabled
                  aria-label="Suppression impossible"
                  icon={<Trash2 className="w-4 h-4" />}
                />
              </span>
            </Tooltip>
          ) : (
            <Popconfirm
              title={`Supprimer « ${m.nom} » ?`}
              description="Elle sera retirée définitivement du catalogue."
              okText="Supprimer"
              cancelText="Annuler"
              okButtonProps={{ danger: true, loading: deletingId === m.id }}
              onConfirm={() => handleDeleteMatiere(m)}
            >
              <Button
                type="text"
                danger
                aria-label={`Supprimer ${m.nom}`}
                icon={<Trash2 className="w-4 h-4" />}
              />
            </Popconfirm>
          ))}
      </div>
    );
  };

  // Intitulé et description : sur une ligne si possible, sinon sur deux lignes max (texte complet au survol)
  const renderIntitule = (m: Matiere) => (
    <p
      className="line-clamp-2 break-words min-w-[16rem] max-w-md text-sm leading-snug"
      title={m.description ? `${m.nom} — ${m.description}` : m.nom}
    >
      <span className="font-bold text-slate-900">{m.nom}</span>
      {m.description && (
        <span className="text-xs text-slate-500">
          {" "}
          — {m.description}
        </span>
      )}
    </p>
  );


  const filterOptions = [
    { value: "TOUS", label: "Tous les enseignants" },
    ...(isTeacher ? [{ value: "MES_MATIERES", label: "Mes matières affectées" }] : []),
    { value: "NON_ASSIGNE", label: "Matières sans enseignant" },
    { label: "Par enseignant", options: teacherOptions },
  ];

  const hasActiveFilter = !!search.trim() || filterEnseignant !== "TOUS";

  const kpis = [
    {
      label: "Total matières",
      value: stats.total,
      icon: <BookOpen className="w-4 h-4" />,
      tone: "bg-blue-50 text-blue-600",
      valueClass: "text-slate-900",
    },
    {
      label: "Avec enseignant",
      value: stats.assignees,
      icon: <UserCheck className="w-4 h-4" />,
      tone: "bg-emerald-50 text-emerald-600",
      valueClass: "text-emerald-600",
    },
    {
      label: "Non assignées",
      value: stats.orphelines,
      icon: <AlertCircle className="w-4 h-4" />,
      tone: "bg-amber-50 text-amber-600",
      valueClass: stats.orphelines > 0 ? "text-amber-600" : "text-slate-900",
    },
    {
      label: "Cours en classes",
      value: stats.totalCoursClasses,
      icon: <GraduationCap className="w-4 h-4" />,
      tone: "bg-indigo-50 text-indigo-600",
      valueClass: "text-indigo-600",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* En-tête */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 sm:p-8 text-white shadow-sm">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 backdrop-blur">
              <Library className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Catalogue des matières
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                Gérez le référentiel des matières de l&apos;établissement et affectez-les aux
                enseignants responsables.
              </p>
            </div>
          </div>

          {(isAdmin || isTeacher) && (
            <Button
              type="primary"
              size="large"
              icon={<Plus className="w-4 h-4" />}
              onClick={openCreateModal}
              className="!text-xs !font-bold shrink-0"
            >
              Nouvelle matière
            </Button>
          )}
        </div>
      </div>

      {/* Indicateurs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {k.label}
              </span>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.tone}`}>
                {k.icon}
              </span>
            </div>
            <p className={`mt-2 text-2xl font-extrabold tabular-nums ${k.valueClass}`}>
              {loading ? "–" : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-bold text-slate-900">Matières</h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {filteredMatieres.length}
              {hasActiveFilter ? ` / ${matieres.length}` : ""} résultat
              {filteredMatieres.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 md:items-center">
            <Input
              aria-label="Rechercher une matière"
              allowClear
              prefix={<Search className="w-4 h-4 text-slate-400" />}
              placeholder="Rechercher par code, nom, enseignant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:w-72"
            />
            <Select
              aria-label="Filtrer par enseignant"
              showSearch
              className="sm:w-64"
              value={filterEnseignant}
              onChange={setFilterEnseignant}
              options={filterOptions}
              optionFilterProp="label"
              suffixIcon={<Users className="w-4 h-4 text-slate-400" />}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : filteredMatieres.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Library className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Aucune matière trouvée</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              {hasActiveFilter
                ? "Aucun résultat ne correspond à vos filtres actuels."
                : "Commencez par ajouter votre première matière au catalogue de l'établissement."}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {hasActiveFilter && (
                <Button
                  onClick={() => {
                    setSearch("");
                    setFilterEnseignant("TOUS");
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              )}
              {(isAdmin || isTeacher) && (
                <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                  Créer une matière
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Grand écran : tableau */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-max table-auto text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-5 whitespace-nowrap">Code</th>
                    <th className="py-3 px-4 whitespace-nowrap">Intitulé &amp; description</th>
                    <th className="py-3 px-4 whitespace-nowrap">Programme</th>
                    <th className="py-3 px-4 whitespace-nowrap">Enseignant responsable</th>
                    <th className="py-3 px-4 whitespace-nowrap">Classes</th>
                    <th className="py-3 px-5 text-right whitespace-nowrap sticky right-0 bg-slate-50 shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.12)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 [&_.truncate:not(.intitule)]:!overflow-visible [&_.truncate:not(.intitule)]:!text-clip [&_.flex-wrap]:flex-nowrap">
                  {filteredMatieres.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition align-middle">
                      <td className="py-4 px-5">
                        <span
                          title={m.code}
                          className="intitule truncate max-w-[10rem] px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg font-mono font-bold inline-block align-middle"
                        >
                          {m.code}
                        </span>
                      </td>
                      <td className="py-4 px-4">{renderIntitule(m)}</td>
                      <td className="py-4 px-4">{renderProgramme(m)}</td>
                      <td className="py-4 px-4">{renderEnseignant(m)}</td>
                      <td className="py-4 px-4">{renderClasses(m)}</td>
                      <td className="py-4 px-5 text-right whitespace-nowrap sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.12)]">{renderActions(m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & petite tablette : cartes */}
            <ul className="lg:hidden divide-y divide-slate-100">
              {filteredMatieres.map((m) => (
                <li key={m.id} className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg font-mono font-bold text-xs shrink-0">
                      {m.code}
                    </span>
                    <div className="shrink-0 -mr-2">{renderActions(m)}</div>
                  </div>

                  {renderIntitule(m)}

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                    <div className="space-y-1.5">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Enseignant responsable
                      </dt>
                      <dd>{renderEnseignant(m)}</dd>
                    </div>
                    <div className="space-y-1.5">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Programme
                      </dt>
                      <dd>{renderProgramme(m)}</dd>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Classes
                      </dt>
                      <dd>{renderClasses(m)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Créer / modifier une matière */}
      <Modal
        open={modalOpen}
        width={560}
        title={
          <span className="flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-blue-600" />
            {editingMatiere ? "Modifier la matière" : "Créer une matière dans le catalogue"}
          </span>
        }
        okText={editingMatiere ? "Enregistrer les modifications" : "Créer la matière"}
        cancelText="Annuler"
        confirmLoading={submitting}
        onOk={() => matiereForm.submit()}
        onCancel={() => setModalOpen(false)}
        forceRender
      >
        <Form<MatiereFormValues>
          form={matiereForm}
          name="matiere_form"
          layout="vertical"
          requiredMark={false}
          onFinish={handleSaveMatiere}
          autoComplete="off"
          className="!mt-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-x-3">
            <Form.Item
              className="sm:col-span-2"
              label={<span className={labelClass}>Code</span>}
              name="code"
              normalize={(v?: string) => v?.toUpperCase()}
              rules={[
                { required: true, whitespace: true, message: "Le code est requis." },
                {
                  pattern: /^[A-Z0-9][A-Z0-9._-]*$/,
                  message: "Lettres, chiffres, point, tiret ou underscore (sans espace).",
                },
              ]}
            >
              <Input
                prefix={<Hash className="w-4 h-4 text-slate-400" />}
                placeholder="Ex : INFO-101"
                className="!font-mono"
              />
            </Form.Item>

            <Form.Item
              className="sm:col-span-3"
              label={<span className={labelClass}>Intitulé de la matière</span>}
              name="nom"
              rules={[
                { required: true, whitespace: true, message: "L'intitulé est requis." },
                { min: 3, message: "Au moins 3 caractères." },
              ]}
            >
              <Input
                prefix={<Type className="w-4 h-4 text-slate-400" />}
                placeholder="Ex : Architecture logicielle et DevOps"
              />
            </Form.Item>
          </div>

          <Form.Item
            label={<span className={labelClass}>Enseignant responsable (affectation)</span>}
            name="enseignantId"
            extra={
              <span className="text-[11px]">
                {editingMatiere && isTeacher
                  ? "Seule l'administration peut réaffecter une matière déjà attribuée."
                  : "Cet enseignant sera pré-sélectionné lors de la programmation de la matière dans une classe."}
              </span>
            }
          >
            <Select
              allowClear
              showSearch
              disabled={!!editingMatiere && isTeacher}
              placeholder="Aucun enseignant (non assignée)"
              options={teacherOptions}
              optionFilterProp="search"
              suffixIcon={<User className="w-4 h-4 text-slate-400" />}
            />
          </Form.Item>

          <Form.Item
            label={<span className={labelClass}>Description / objectifs pédagogiques (optionnel)</span>}
            name="description"
            className="!mb-0"
          >
            <Input.TextArea
              rows={3}
              maxLength={500}
              showCount
              placeholder="Objectifs du module, compétences visées, prérequis…"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Réaffecter l'enseignant d'un cours programmé */}
      <Modal
        open={!!editingCours}
        width={460}
        title={
          <span className="flex items-center gap-2 text-sm">
            <UserCheck className="w-4 h-4 text-blue-600" />
            Changer l&apos;enseignant du cours
          </span>
        }
        okText="Enregistrer la réaffectation"
        cancelText="Annuler"
        confirmLoading={submittingCours}
        onOk={() => coursForm.submit()}
        onCancel={() => setEditingCours(null)}
        forceRender
      >
        <div className="mt-4 mb-4 bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 space-y-0.5">
          <p>
            Matière : <strong>{editingCours?.matiereNom}</strong>
          </p>
          <p>
            Classe : <strong>{editingCours?.classeCode}</strong> &bull; {editingCours?.classeNom}
          </p>
          <p className="text-[11px] text-blue-700 pt-1">
            Cette modification s&apos;applique uniquement au cours dispensé dans cette classe.
          </p>
        </div>

        <Form<CoursFormValues>
          form={coursForm}
          name="cours_form"
          layout="vertical"
          requiredMark={false}
          onFinish={handleUpdateCoursEnseignant}
        >
          <Form.Item
            label={<span className={labelClass}>Nouvel enseignant pour ce cours</span>}
            name="enseignantId"
            className="!mb-0"
          >
            <Select
              allowClear
              showSearch
              placeholder="Aucun enseignant (non assigné)"
              options={teacherOptions}
              optionFilterProp="search"
              suffixIcon={<User className="w-4 h-4 text-slate-400" />}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
