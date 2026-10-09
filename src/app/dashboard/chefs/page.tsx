"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { App, Button, Empty, Form, Input, Modal, Popconfirm, Select } from "antd";
import {
  Shield,
  UserPlus,
  Trash2,
  Lock,
  User,
  AtSign,
  AlertTriangle,
  Search,
  Pencil,
  Wand2,
  Copy,
  Check,
  Users,
  Building,
  KeyRound,
  X,
} from "lucide-react";

interface ChefItem {
  id: string;
  username: string;
  nom: string;
  classeId: string | null;
  classe: { id: string; code: string; nom: string } | null;
  createdAt: string;
}

interface ClasseItem {
  id: string;
  code: string;
  nom: string;
}

interface CreateValues {
  classeId: string;
  nom: string;
  username: string;
  password: string;
}

interface EditValues {
  classeId: string;
  nom: string;
  username: string;
  password?: string;
}

interface CreatedCredentials {
  nom: string;
  username: string;
  password: string;
  classe?: string;
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

function generatePassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

const usernameRules = [
  { required: true, whitespace: true, message: "L'identifiant est requis." },
  { min: 3, message: "Au moins 3 caractères." },
  {
    pattern: /^[a-z0-9._-]+$/,
    message: "Lettres minuscules, chiffres, point, tiret ou underscore uniquement.",
  },
];

export default function ChefsClassePage() {
  const { message, modal } = App.useApp();
  const [createForm] = Form.useForm<CreateValues>();
  const [editForm] = Form.useForm<EditValues>();

  const [chefs, setChefs] = useState<ChefItem[]>([]);
  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("ENSEIGNANT");

  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<CreatedCredentials | null>(null);
  const [copied, setCopied] = useState(false);

  const [search, setSearch] = useState("");
  const [classeFilter, setClasseFilter] = useState<string | undefined>(undefined);

  const [editing, setEditing] = useState<ChefItem | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [resAuth, resChefs, resClasses] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/chefs"),
        fetch("/api/classes"),
      ]);

      const auth = await resAuth.json();
      const role = auth.user?.role || "ENSEIGNANT";
      setUserRole(role);

      if (role !== "ENSEIGNANT" && role !== "ADMINISTRATION") return;

      const chefsData = await resChefs.json();
      const classesData = await resClasses.json();

      if (Array.isArray(chefsData)) setChefs(chefsData);
      if (Array.isArray(classesData)) setClasses(classesData);
    } catch (err) {
      console.error(err);
      message.error("Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c.id, label: `${c.code} — ${c.nom}`, code: c.code })),
    [classes]
  );

  const classesWithoutChef = useMemo(
    () => classes.filter((c) => !chefs.some((ch) => ch.classeId === c.id)).length,
    [classes, chefs]
  );

  const filteredChefs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chefs.filter((c) => {
      if (classeFilter && c.classeId !== classeFilter) return false;
      if (!q) return true;
      return [c.nom, c.username, c.classe?.code ?? "", c.classe?.nom ?? ""].some((t) =>
        t.toLowerCase().includes(q)
      );
    });
  }, [chefs, search, classeFilter]);

  const handleCreateChef = async (values: CreateValues) => {
    setSaving(true);
    setCreated(null);

    try {
      const res = await fetch("/api/chefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok) {
        message.error(data.error || "Erreur lors de la création.");
        return;
      }

      message.success(`Compte chef de classe « ${values.nom} » créé avec succès.`);
      setCreated({
        nom: values.nom,
        username: values.username,
        password: values.password,
        classe: classes.find((c) => c.id === values.classeId)?.code,
      });
      setCopied(false);
      createForm.resetFields(["nom", "username", "password"]);
      await loadData();
    } catch {
      message.error("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = async () => {
    if (!created) return;
    const text = `VacationPro — Compte chef de classe\nIdentifiant : ${created.username}\nMot de passe : ${created.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      message.error("Copie impossible depuis ce navigateur.");
    }
  };

  const openEdit = (chef: ChefItem) => {
    setEditing(chef);
    editForm.setFieldsValue({
      nom: chef.nom,
      username: chef.username,
      classeId: chef.classeId ?? undefined,
      password: "",
    });
  };

  const handleUpdateChef = async (values: EditValues) => {
    if (!editing) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/chefs/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: values.nom,
          username: values.username,
          classeId: values.classeId,
          password: values.password?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.error || "Erreur lors de la modification.");
        return;
      }
      message.success("Compte modifié avec succès.");
      const newPassword = values.password?.trim();
      if (newPassword) {
        modal.info({
          title: "Nouveau mot de passe défini",
          content: (
            <div className="text-xs space-y-1.5 pt-1">
              <p>Communiquez ces identifiants au chef de classe. Le mot de passe ne pourra plus être consulté.</p>
              <p>
                Identifiant : <strong className="font-mono">{values.username}</strong>
              </p>
              <p>
                Mot de passe : <strong className="font-mono">{newPassword}</strong>
              </p>
            </div>
          ),
          okText: "Compris",
        });
      }
      setEditing(null);
      await loadData();
    } catch {
      message.error("Erreur réseau.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteChef = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/chefs/${id}`, { method: "DELETE" });
      if (res.ok) {
        message.success("Compte chef de classe révoqué.");
        await loadData();
      } else {
        message.error("La révocation a échoué.");
      }
    } catch {
      message.error("Erreur réseau.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!loading && userRole !== "ENSEIGNANT" && userRole !== "ADMINISTRATION") {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12 shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Accès restreint</h2>
        <p className="text-sm text-slate-600">
          Seul le corps professoral ou la direction peut nommer et gérer les comptes des chefs de
          classe.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-32 rounded-2xl bg-slate-200" />
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 h-[28rem] rounded-2xl bg-white border border-slate-200" />
          <div className="lg:col-span-7 h-[28rem] rounded-2xl bg-white border border-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* En-tête */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 sm:p-8 text-white shadow-sm">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 backdrop-blur">
              <Shield className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Désignation des chefs de classe
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                Créez des accès pour vos délégués afin qu&apos;ils puissent pointer les présences. L&apos;accès
                aux notes reste strictement verrouillé.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-col md:items-end gap-2 shrink-0">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-blue-300" />
              {chefs.length} compte{chefs.length > 1 ? "s" : ""} actif{chefs.length > 1 ? "s" : ""}
            </span>
            {classes.length > 0 &&
              (classesWithoutChef > 0 ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 text-xs font-semibold">
                  <Building className="w-3.5 h-3.5" />
                  {classesWithoutChef} classe{classesWithoutChef > 1 ? "s" : ""} sans chef
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/15 border border-emerald-300/30 text-emerald-200 text-xs font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  Toutes les classes ont un chef
                </span>
              ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Formulaire de création */}
        <section className="lg:col-span-5 lg:sticky lg:top-24 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">Créer un compte chef de classe</h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Il pourra se connecter depuis son smartphone ou son PC pour faire l&apos;appel.
              </p>
            </div>
          </div>

          <div className="p-6">
            {created && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <Check className="w-4 h-4" />
                    Compte créé pour {created.nom}
                    {created.classe && <span className="font-mono">({created.classe})</span>}
                  </div>
                  <button
                    onClick={() => setCreated(null)}
                    aria-label="Fermer"
                    className="text-emerald-700/60 hover:text-emerald-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">Identifiant</dt>
                    <dd className="font-mono font-bold text-slate-900">{created.username}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">Mot de passe</dt>
                    <dd className="font-mono font-bold text-slate-900">{created.password}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-[11px] text-emerald-800/80 leading-relaxed">
                  Notez ou copiez ces identifiants maintenant : le mot de passe ne pourra plus être
                  consulté.
                </p>
                <Button
                  size="small"
                  className="!mt-3 !text-xs !font-semibold"
                  icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  onClick={copyCredentials}
                >
                  {copied ? "Copié !" : "Copier les identifiants"}
                </Button>
              </div>
            )}

            {classes.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="text-xs text-slate-500">
                    Aucune classe disponible. Créez d&apos;abord une classe pour y rattacher un chef.
                  </span>
                }
              >
                <Link
                  href="/dashboard/classes"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Aller aux classes &rarr;
                </Link>
              </Empty>
            ) : (
              <Form<CreateValues>
                form={createForm}
                name="create_chef"
                layout="vertical"
                requiredMark={false}
                onFinish={handleCreateChef}
                initialValues={{ classeId: classes[0]?.id }}
                autoComplete="off"
              >
                <Form.Item
                  label={<span className="text-xs font-bold text-slate-700">Classe rattachée</span>}
                  name="classeId"
                  rules={[{ required: true, message: "Choisissez une classe." }]}
                >
                  <Select
                    size="large"
                    showSearch
                    options={classOptions}
                    placeholder="Sélectionner une classe"
                    optionFilterProp="label"
                    suffixIcon={<Building className="w-4 h-4 text-slate-400" />}
                  />
                </Form.Item>

                <Form.Item
                  label={
                    <span className="text-xs font-bold text-slate-700">Nom complet du chef de classe</span>
                  }
                  name="nom"
                  rules={[
                    { required: true, whitespace: true, message: "Le nom est requis." },
                    { min: 3, message: "Au moins 3 caractères." },
                  ]}
                >
                  <Input
                    size="large"
                    prefix={<User className="w-4 h-4 text-slate-400" />}
                    placeholder="Ex : Kouamé Emmanuel"
                    allowClear
                  />
                </Form.Item>

                <Form.Item
                  label={
                    <span className="text-xs font-bold text-slate-700">
                      Identifiant de connexion (login)
                    </span>
                  }
                  name="username"
                  normalize={(v?: string) => v?.toLowerCase().trim()}
                  rules={usernameRules}
                  extra={<span className="text-[11px]">Utilisé pour se connecter. Pas d&apos;espaces.</span>}
                >
                  <Input
                    size="large"
                    prefix={<AtSign className="w-4 h-4 text-slate-400" />}
                    placeholder="Ex : chef-lprigl"
                    allowClear
                    autoComplete="off"
                  />
                </Form.Item>

                <Form.Item
                  label={<span className="text-xs font-bold text-slate-700">Mot de passe</span>}
                  required
                  className="!mb-4"
                >
                  <div className="flex items-start gap-2">
                    <Form.Item
                      name="password"
                      noStyle
                      rules={[
                        { required: true, message: "Le mot de passe est requis." },
                        { min: 6, message: "Au moins 6 caractères." },
                      ]}
                    >
                      <Input.Password
                        aria-label="Mot de passe"
                        size="large"
                        prefix={<Lock className="w-4 h-4 text-slate-400" />}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                    </Form.Item>
                    <Button
                      size="large"
                      title="Générer un mot de passe sécurisé"
                      aria-label="Générer un mot de passe sécurisé"
                      icon={<Wand2 className="w-4 h-4" />}
                      onClick={() =>
                        createForm.setFieldsValue({ password: generatePassword() })
                      }
                    />
                  </div>
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={saving}
                  icon={!saving ? <UserPlus className="w-4 h-4" /> : undefined}
                  className="!text-xs !font-bold"
                >
                  {saving ? "Création en cours..." : "Créer le compte chef de classe"}
                </Button>
              </Form>
            )}
          </div>
        </section>

        {/* Liste des chefs désignés */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-sm text-slate-900">
                  Comptes chefs de classe actifs
                  <span className="ml-2 inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold tabular-nums">
                    {chefs.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assistants autorisés à effectuer l&apos;appel
                </p>
              </div>
            </div>

            {chefs.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Input
                  aria-label="Rechercher un chef de classe"
                  allowClear
                  prefix={<Search className="w-4 h-4 text-slate-400" />}
                  placeholder="Rechercher un nom, un login…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select
                  aria-label="Filtrer par classe"
                  allowClear
                  showSearch
                  className="sm:w-60"
                  placeholder="Toutes les classes"
                  options={classOptions}
                  optionFilterProp="label"
                  value={classeFilter}
                  onChange={(v) => setClasseFilter(v)}
                />
              </div>
            )}
          </div>

          {chefs.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Aucun chef de classe désigné</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Créez un premier compte avec le formulaire pour déléguer l&apos;appel à un étudiant.
              </p>
            </div>
          ) : filteredChefs.length === 0 ? (
            <div className="px-6 py-12 text-center text-xs text-slate-500">
              Aucun compte ne correspond à votre recherche.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredChefs.map((c) => (
                <li
                  key={c.id}
                  className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm shrink-0 ${avatarTone(
                        c.nom
                      )}`}
                    >
                      {c.nom.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 truncate">{c.nom}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="inline-flex items-center gap-1 font-mono text-slate-700">
                          <AtSign className="w-3 h-3 text-slate-400" />
                          {c.username}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span>
                          Créé le {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {c.classe ? (
                      <span
                        title={c.classe.nom}
                        className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-700 font-mono text-[11px] font-bold"
                      >
                        {c.classe.code}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-semibold">
                        Non assignée
                      </span>
                    )}

                    <Button
                      type="text"
                      aria-label={`Modifier ${c.nom}`}
                      title="Modifier le compte"
                      icon={<Pencil className="w-4 h-4 text-slate-500" />}
                      onClick={() => openEdit(c)}
                    />
                    <Popconfirm
                      title="Révoquer ce compte ?"
                      description="Le chef de classe ne pourra plus se connecter."
                      okText="Révoquer"
                      cancelText="Annuler"
                      okButtonProps={{ danger: true, loading: deletingId === c.id }}
                      onConfirm={() => handleDeleteChef(c.id)}
                    >
                      <Button
                        type="text"
                        danger
                        aria-label={`Révoquer ${c.nom}`}
                        title="Révoquer le compte"
                        icon={<Trash2 className="w-4 h-4" />}
                      />
                    </Popconfirm>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Modification d'un compte */}
      <Modal
        open={!!editing}
        title={
          <span className="flex items-center gap-2 text-sm">
            <Pencil className="w-4 h-4 text-blue-600" />
            Modifier le compte de {editing?.nom}
          </span>
        }
        okText="Enregistrer"
        cancelText="Annuler"
        confirmLoading={updating}
        onOk={() => editForm.submit()}
        onCancel={() => setEditing(null)}
        forceRender
      >
        <Form<EditValues>
          form={editForm}
          name="edit_chef"
          layout="vertical"
          requiredMark={false}
          onFinish={handleUpdateChef}
          autoComplete="off"
          className="!mt-4"
        >
          <Form.Item
            label={<span className="text-xs font-bold text-slate-700">Classe rattachée</span>}
            name="classeId"
            rules={[{ required: true, message: "Choisissez une classe." }]}
          >
            <Select showSearch options={classOptions} optionFilterProp="label" />
          </Form.Item>
          <Form.Item
            label={<span className="text-xs font-bold text-slate-700">Nom complet</span>}
            name="nom"
            rules={[
              { required: true, whitespace: true, message: "Le nom est requis." },
              { min: 3, message: "Au moins 3 caractères." },
            ]}
          >
            <Input prefix={<User className="w-4 h-4 text-slate-400" />} />
          </Form.Item>
          <Form.Item
            label={<span className="text-xs font-bold text-slate-700">Identifiant de connexion</span>}
            name="username"
            normalize={(v?: string) => v?.toLowerCase().trim()}
            rules={usernameRules}
          >
            <Input prefix={<AtSign className="w-4 h-4 text-slate-400" />} />
          </Form.Item>
          <Form.Item
            label={<span className="text-xs font-bold text-slate-700">Nouveau mot de passe</span>}
            required={false}
            className="!mb-0"
          >
            <div className="flex items-start gap-2">
              <Form.Item
                name="password"
                noStyle
                rules={[{ min: 6, message: "Au moins 6 caractères." }]}
              >
                <Input.Password
                  aria-label="Nouveau mot de passe"
                  prefix={<Lock className="w-4 h-4 text-slate-400" />}
                  placeholder="Laisser vide pour conserver l'actuel"
                  autoComplete="new-password"
                />
              </Form.Item>
              <Button
                title="Générer un mot de passe sécurisé"
                aria-label="Générer un mot de passe sécurisé"
                icon={<Wand2 className="w-4 h-4" />}
                onClick={() => editForm.setFieldsValue({ password: generatePassword() })}
              />
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
