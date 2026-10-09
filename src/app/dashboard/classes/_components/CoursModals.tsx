"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Alert, Button, Form, Input, InputNumber, Modal, Segmented, Select } from "antd";
import { BookOpen, CalendarRange, Clock, Hash, Pencil, Plus, Type, User } from "lucide-react";
import { Enseignant, MatiereItem, UserRole, currentAcademicYear, labelClass } from "./types";

const NEW_CLASS = "__NEW__";
const HOUR_SHORTCUTS = [10, 20, 30, 40, 50, 60];

interface ClasseOption {
  id: string;
  code: string;
  nom: string;
  anneeScolaire: string;
  _count?: { etudiants: number };
}

interface CatalogMatiere {
  id: string;
  code: string;
  nom: string;
  enseignantId: string | null;
  enseignant?: { nom: string } | null;
}

function HoursShortcuts({
  value,
  onPick,
}: {
  value?: number;
  onPick: (h: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold text-slate-500 mr-1">Raccourcis :</span>
      {HOUR_SHORTCUTS.map((h) => (
        <Button
          key={h}
          size="small"
          type={value === h ? "primary" : "default"}
          onClick={() => onPick(h)}
          className="!text-xs !font-bold"
        >
          {h}h
        </Button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Programmer un cours (choix de la classe + matière + volume horaire) */
/* ------------------------------------------------------------------ */

interface AddValues {
  classeId?: string;
  newClassCode?: string;
  newClassNom?: string;
  newClassAnnee?: string;
  source: "EXISTING" | "NEW";
  catalogMatiereId?: string;
  newMatCode?: string;
  newMatNom?: string;
  enseignantId?: string;
  volumeHoraire: number;
}

interface AddProps {
  open: boolean;
  defaultClasseId: string;
  userRole: UserRole;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onSaved: (classeId: string) => void;
}

export function AddCoursModal({
  open,
  defaultClasseId,
  userRole,
  currentUserId,
  currentUserName,
  onClose,
  onSaved,
}: AddProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<AddValues>();
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState<ClasseOption[]>([]);
  const [catalog, setCatalog] = useState<CatalogMatiere[]>([]);
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);

  const isAdmin = userRole === "ADMINISTRATION";
  const classeId = Form.useWatch("classeId", form);
  const source = Form.useWatch("source", form);
  const volume = Form.useWatch("volumeHoraire", form);

  useEffect(() => {
    if (!open) return;

    form.resetFields();
    form.setFieldsValue({
      classeId: defaultClasseId || undefined,
      source: "EXISTING",
      volumeHoraire: 20,
      newClassAnnee: currentAcademicYear(),
      enseignantId: userRole === "ENSEIGNANT" ? currentUserId : undefined,
    });

    let cancelled = false;
    setLoadingData(true);
    Promise.all([
      fetch("/api/classes?all=true").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/matieres").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/enseignants").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([allCls, allMat, allEns]) => {
        if (cancelled) return;
        if (Array.isArray(allCls)) {
          setClasses(allCls);
          if (!defaultClasseId && allCls.length > 0) form.setFieldValue("classeId", allCls[0].id);
          if (allCls.length === 0) form.setFieldValue("classeId", NEW_CLASS);
        }
        if (Array.isArray(allMat)) {
          setCatalog(allMat);
          if (allMat.length > 0) {
            form.setFieldValue("catalogMatiereId", allMat[0].id);
            if (userRole === "ADMINISTRATION" && allMat[0].enseignantId) {
              form.setFieldValue("enseignantId", allMat[0].enseignantId);
            }
          } else {
            form.setFieldValue("source", "NEW");
          }
        }
        if (Array.isArray(allEns)) setEnseignants(allEns);
      })
      .catch((e) => console.error("Erreur chargement données programmation cours:", e))
      .finally(() => !cancelled && setLoadingData(false));

    return () => {
      cancelled = true;
    };
  }, [open, defaultClasseId, userRole, currentUserId, form]);

  const classOptions = useMemo(
    () => [
      ...classes.map((c) => ({
        value: c.id,
        label: `${c.code} — ${c.nom} (${c.anneeScolaire})${
          c._count?.etudiants !== undefined ? ` • ${c._count.etudiants} auditeur(s)` : ""
        }`,
      })),
      { value: NEW_CLASS, label: "+ Créer une nouvelle classe…" },
    ],
    [classes]
  );

  const catalogOptions = useMemo(
    () =>
      catalog.map((m) => ({
        value: m.id,
        label: `[${m.code}] ${m.nom}${m.enseignant ? ` (Resp : ${m.enseignant.nom})` : ""}`,
      })),
    [catalog]
  );

  const teacherOptions = useMemo(
    () =>
      enseignants.map((e) => ({
        value: e.id,
        label: `${e.nom} (${e.username})`,
      })),
    [enseignants]
  );

  const handleFinish = async (values: AddValues) => {
    try {
      setSubmitting(true);
      let finalClasseId = values.classeId || "";

      if (finalClasseId === NEW_CLASS) {
        const classRes = await fetch("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: (values.newClassCode ?? "").trim().toUpperCase(),
            nom: (values.newClassNom ?? "").trim(),
            anneeScolaire: (values.newClassAnnee ?? "").trim() || currentAcademicYear(),
          }),
        });
        if (!classRes.ok) {
          const err = await classRes.json();
          message.error(err.error || "Erreur création de la classe");
          return;
        }
        finalClasseId = (await classRes.json()).id;
      }

      if (!finalClasseId) {
        message.error("Veuillez sélectionner ou créer une classe.");
        return;
      }

      const payload: Record<string, unknown> = {
        coefficient: 1.0,
        volumeHoraire: values.volumeHoraire,
        enseignantId:
          userRole === "ENSEIGNANT" ? currentUserId : values.enseignantId || null,
      };

      if (values.source === "EXISTING") {
        payload.matiereId = values.catalogMatiereId;
      } else {
        payload.code = (values.newMatCode ?? "").trim().toUpperCase();
        payload.nom = (values.newMatNom ?? "").trim();
      }

      const res = await fetch(`/api/classes/${finalClasseId}/cours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        message.error(err.error || "Erreur lors de la programmation du cours");
        return;
      }

      message.success("Cours programmé avec succès dans la classe.");
      onSaved(finalClasseId);
    } catch {
      message.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      width={600}
      title={
        <div>
          <span className="flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Programmer un cours dans une classe
          </span>
          <p className="text-xs font-normal text-slate-500 mt-1">
            Associez une matière à une classe et fixez son volume horaire officiel.
          </p>
        </div>
      }
      okText="Programmer ce cours"
      okButtonProps={{ icon: <Plus className="w-4 h-4" /> }}
      cancelText="Annuler"
      confirmLoading={submitting}
      onOk={() => form.submit()}
      onCancel={onClose}
      forceRender
      styles={{ body: { maxHeight: "70vh", overflowY: "auto", paddingRight: 4 } }}
    >
      <Form<AddValues>
        form={form}
        name="add_cours_form"
        layout="vertical"
        requiredMark={false}
        onFinish={handleFinish}
        autoComplete="off"
        className="!mt-5"
      >
        <Form.Item
          label={<span className={labelClass}>1. Classe cible</span>}
          name="classeId"
          rules={[{ required: true, message: "Choisissez la classe." }]}
        >
          <Select
            showSearch
            loading={loadingData}
            options={classOptions}
            optionFilterProp="label"
            placeholder="Choisissez la classe dans la liste"
          />
        </Form.Item>

        {classeId === NEW_CLASS && (
          <div className="mb-4 p-4 bg-blue-50/70 rounded-xl border border-blue-200 space-y-0">
            <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5 mb-3">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              Création rapide de la nouvelle classe
            </p>
            <Form.Item
              label={<span className={labelClass}>Code de la classe</span>}
              name="newClassCode"
              normalize={(v?: string) => v?.toUpperCase()}
              rules={[
                { required: true, whitespace: true, message: "Le code est requis." },
                { pattern: /^[A-Z0-9][A-Z0-9._-]*$/, message: "Lettres, chiffres, point ou tiret." },
              ]}
            >
              <Input prefix={<Hash className="w-4 h-4 text-slate-400" />} placeholder="L3-INFO" className="!font-mono" />
            </Form.Item>
            <Form.Item
              label={<span className={labelClass}>Nom complet / filière</span>}
              name="newClassNom"
              rules={[{ required: true, whitespace: true, message: "Le nom est requis." }]}
            >
              <Input prefix={<Type className="w-4 h-4 text-slate-400" />} placeholder="Licence 3 Informatique" />
            </Form.Item>
            <Form.Item
              label={<span className={labelClass}>Année académique</span>}
              name="newClassAnnee"
              className="!mb-0"
              rules={[{ required: true, whitespace: true, message: "L'année est requise." }]}
            >
              <Input prefix={<CalendarRange className="w-4 h-4 text-slate-400" />} placeholder="2026-2027" />
            </Form.Item>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mb-2 pt-3 border-t border-slate-100">
          <span className={labelClass}>2. Matière à dispenser</span>
          <Form.Item name="source" noStyle>
            <Segmented
              size="small"
              options={[
                { value: "EXISTING", label: `Catalogue (${catalog.length})` },
                { value: "NEW", label: "+ Créer nouvelle" },
              ]}
            />
          </Form.Item>
        </div>

        {source === "NEW" ? (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4">
            <Form.Item
              className="sm:col-span-2 !mb-2 sm:!mb-0"
              label={<span className={labelClass}>Code matière</span>}
              name="newMatCode"
              normalize={(v?: string) => v?.toUpperCase()}
              rules={[
                { required: true, whitespace: true, message: "Le code est requis." },
                { pattern: /^[A-Z0-9][A-Z0-9._-]*$/, message: "Lettres, chiffres, point ou tiret." },
              ]}
            >
              <Input prefix={<Hash className="w-4 h-4 text-slate-400" />} placeholder="DEVWEB" className="!font-mono" />
            </Form.Item>
            <Form.Item
              className="sm:col-span-3 !mb-0"
              label={<span className={labelClass}>Intitulé complet</span>}
              name="newMatNom"
              rules={[{ required: true, whitespace: true, message: "L'intitulé est requis." }]}
            >
              <Input prefix={<Type className="w-4 h-4 text-slate-400" />} placeholder="Développement Web & Cloud" />
            </Form.Item>
          </div>
        ) : catalog.length === 0 && !loadingData ? (
          <Alert
            type="warning"
            showIcon
            className="!mb-4"
            title='Aucune matière dans le catalogue. Cliquez sur « + Créer nouvelle » pour en créer une.'
          />
        ) : (
          <Form.Item
            label={<span className={labelClass}>Matière du catalogue</span>}
            name="catalogMatiereId"
            rules={[{ required: true, message: "Sélectionnez une matière du catalogue." }]}
          >
            <Select
              showSearch
              loading={loadingData}
              options={catalogOptions}
              optionFilterProp="label"
              placeholder="Choisissez la matière"
              onChange={(id: string) => {
                if (isAdmin) {
                  const found = catalog.find((m) => m.id === id);
                  if (found?.enseignantId) form.setFieldValue("enseignantId", found.enseignantId);
                }
              }}
            />
          </Form.Item>
        )}

        {isAdmin ? (
          <Form.Item
            label={<span className={labelClass}>Enseignant en charge de ce cours dans cette classe</span>}
            name="enseignantId"
          >
            <Select
              allowClear
              showSearch
              options={teacherOptions}
              optionFilterProp="label"
              placeholder="Sélectionner un enseignant"
              suffixIcon={<User className="w-4 h-4 text-slate-400" />}
            />
          </Form.Item>
        ) : (
          <Form.Item label={<span className={labelClass}>Enseignant en charge de ce cours</span>}>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Vous-même ({currentUserName || "enseignant connecté"})</span>
              <span className="text-[10px] text-slate-400 ml-auto italic">Assignation automatique</span>
            </div>
          </Form.Item>
        )}

        <Form.Item
          label={<span className={labelClass}>Volume horaire prévu (en heures)</span>}
          name="volumeHoraire"
          className="!mb-0"
          rules={[
            { required: true, message: "Indiquez le volume horaire." },
            { type: "number", min: 1, max: 200, message: "Entre 1 et 200 heures." },
          ]}
          extra={
            <div className="mt-2">
              <HoursShortcuts value={volume} onPick={(h) => form.setFieldValue("volumeHoraire", h)} />
            </div>
          }
        >
          <InputNumber
            min={1}
            max={200}
            step={1}
            precision={0}
            suffix="h"
            prefix={<Clock className="w-4 h-4 text-slate-400" />}
            className="!w-full"
            placeholder="Ex : 20"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/* --------------------------------- */
/* Modifier un cours déjà programmé  */
/* --------------------------------- */

interface EditValues {
  code: string;
  nom: string;
  enseignantId?: string;
  volumeHoraire: number;
}

interface EditProps {
  cours: MatiereItem | null;
  classeNom?: string;
  userRole: UserRole;
  enseignants: Enseignant[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditCoursModal({ cours, classeNom, userRole, enseignants, onClose, onSaved }: EditProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<EditValues>();
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = userRole === "ADMINISTRATION";
  const volume = Form.useWatch("volumeHoraire", form);

  useEffect(() => {
    if (!cours) return;
    form.setFieldsValue({
      code: cours.code,
      nom: cours.nom,
      volumeHoraire: cours.volumeHoraire || 20,
      enseignantId: cours.enseignantId || cours.enseignant?.id || undefined,
    });
  }, [cours, form]);

  const teacherOptions = useMemo(
    () => enseignants.map((e) => ({ value: e.id, label: `${e.nom} (${e.username})` })),
    [enseignants]
  );

  const handleFinish = async (values: EditValues) => {
    if (!cours) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/cours/${cours.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: values.code.trim().toUpperCase(),
          nom: values.nom.trim(),
          coefficient: cours.coefficient || 1.0,
          volumeHoraire: values.volumeHoraire,
          enseignantId: isAdmin ? values.enseignantId || null : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        message.error(err.error || "Erreur modification cours");
        return;
      }

      message.success("Cours programmé mis à jour avec succès.");
      onSaved();
    } catch {
      message.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!cours}
      width={520}
      title={
        <div>
          <span className="flex items-center gap-2 text-sm">
            <Pencil className="w-4 h-4 text-blue-600" />
            Modifier le cours programmé
          </span>
          {classeNom && (
            <p className="text-xs font-normal text-slate-500 mt-1">
              Classe : <strong className="text-slate-700">{classeNom}</strong>
            </p>
          )}
        </div>
      }
      okText="Enregistrer les modifications"
      cancelText="Annuler"
      confirmLoading={submitting}
      onOk={() => form.submit()}
      onCancel={onClose}
      forceRender
    >
      <Form<EditValues>
        form={form}
        name="edit_cours_form"
        layout="vertical"
        requiredMark={false}
        onFinish={handleFinish}
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
              { pattern: /^[A-Z0-9][A-Z0-9._-]*$/, message: "Lettres, chiffres, point ou tiret." },
            ]}
          >
            <Input prefix={<Hash className="w-4 h-4 text-slate-400" />} className="!font-mono" />
          </Form.Item>
          <Form.Item
            className="sm:col-span-3"
            label={<span className={labelClass}>Intitulé complet</span>}
            name="nom"
            rules={[{ required: true, whitespace: true, message: "L'intitulé est requis." }]}
          >
            <Input prefix={<Type className="w-4 h-4 text-slate-400" />} />
          </Form.Item>
        </div>

        {isAdmin ? (
          <Form.Item
            label={<span className={labelClass}>Enseignant en charge de ce cours dans cette classe</span>}
            name="enseignantId"
            extra={
              <span className="text-[11px]">
                En tant que direction, vous pouvez réaffecter ce cours à un autre enseignant pour cette classe.
              </span>
            }
          >
            <Select
              allowClear
              showSearch
              options={teacherOptions}
              optionFilterProp="label"
              placeholder="Aucun enseignant assigné"
              suffixIcon={<User className="w-4 h-4 text-slate-400" />}
            />
          </Form.Item>
        ) : (
          <Form.Item label={<span className={labelClass}>Enseignant du cours</span>}>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              {cours?.enseignant?.nom || "Non assigné"}
            </div>
          </Form.Item>
        )}

        <Form.Item
          label={<span className={labelClass}>Volume horaire prévu (en heures)</span>}
          name="volumeHoraire"
          className="!mb-0"
          rules={[
            { required: true, message: "Indiquez le volume horaire." },
            { type: "number", min: 1, max: 200, message: "Entre 1 et 200 heures." },
          ]}
          extra={
            <div className="mt-2">
              <HoursShortcuts value={volume} onPick={(h) => form.setFieldValue("volumeHoraire", h)} />
            </div>
          }
        >
          <InputNumber
            min={1}
            max={200}
            step={1}
            precision={0}
            suffix="h"
            prefix={<Clock className="w-4 h-4 text-slate-400" />}
            className="!w-full"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
