"use client";

import { useEffect, useState } from "react";
import { App, Form, Input, Modal } from "antd";
import { CalendarRange, Hash, Pencil, School, Type } from "lucide-react";
import { ClasseFull, currentAcademicYear, labelClass } from "./types";

interface FormValues {
  code: string;
  nom: string;
  anneeScolaire: string;
}

interface Props {
  open: boolean;
  /** `null` = création, sinon modification de la classe donnée */
  classe: ClasseFull | null;
  onClose: () => void;
  onSaved: (classeId: string, created: boolean, code: string) => void;
}

export default function ClasseFormModal({ open, classe, onClose, onSaved }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!classe;

  useEffect(() => {
    if (!open) return;
    if (classe) {
      form.setFieldsValue({
        code: classe.code,
        nom: classe.nom,
        anneeScolaire: classe.anneeScolaire,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ anneeScolaire: currentAcademicYear() });
    }
  }, [open, classe, form]);

  const handleFinish = async (values: FormValues) => {
    try {
      setSubmitting(true);
      const res = await fetch(isEdit ? `/api/classes/${classe!.id}` : "/api/classes", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: values.code.trim().toUpperCase(),
          nom: values.nom.trim(),
          anneeScolaire: values.anneeScolaire.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || (isEdit ? "Erreur modification" : "Erreur création"));
        return;
      }

      message.success(
        isEdit
          ? "Classe modifiée avec succès."
          : `Classe « ${data.code} » créée avec succès. Vous pouvez maintenant inscrire vos étudiants.`
      );
      onSaved(isEdit ? classe!.id : data.id, !isEdit, values.code.trim().toUpperCase());
    } catch {
      message.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      width={480}
      title={
        <span className="flex items-center gap-2 text-sm">
          {isEdit ? (
            <Pencil className="w-4 h-4 text-blue-600" />
          ) : (
            <School className="w-4 h-4 text-blue-600" />
          )}
          {isEdit ? "Modifier la classe" : "Créer une nouvelle classe"}
        </span>
      }
      okText={isEdit ? "Enregistrer les modifications" : "Créer la classe"}
      cancelText="Annuler"
      confirmLoading={submitting}
      onOk={() => form.submit()}
      onCancel={onClose}
      forceRender
    >
      <Form<FormValues>
        form={form}
        name="classe_form"
        layout="vertical"
        requiredMark={false}
        onFinish={handleFinish}
        autoComplete="off"
        className="!mt-5"
      >
        <Form.Item
          label={<span className={labelClass}>Code de la classe</span>}
          name="code"
          normalize={(v?: string) => v?.toUpperCase()}
          extra={<span className="text-[11px]">Ex : LPRIGL-B, MASTER-1</span>}
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
            placeholder="LPRIGL-B"
            className="!font-mono"
          />
        </Form.Item>

        <Form.Item
          label={<span className={labelClass}>Nom complet / filière</span>}
          name="nom"
          rules={[
            { required: true, whitespace: true, message: "Le nom est requis." },
            { min: 3, message: "Au moins 3 caractères." },
          ]}
        >
          <Input
            prefix={<Type className="w-4 h-4 text-slate-400" />}
            placeholder="Licence Pro RGL - Groupe B"
          />
        </Form.Item>

        <Form.Item
          label={<span className={labelClass}>Année académique</span>}
          name="anneeScolaire"
          className="!mb-0"
          rules={[
            { required: true, whitespace: true, message: "L'année académique est requise." },
            { min: 4, message: "Format attendu : 2026-2027" },
          ]}
        >
          <Input
            prefix={<CalendarRange className="w-4 h-4 text-slate-400" />}
            placeholder="2026-2027"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
