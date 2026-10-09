"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, App, Button, Form, Input, Modal, Tabs, Upload } from "antd";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  FileText,
  ListPlus,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { DraftChapitre, labelClass } from "./types";

interface FormValues {
  chapitres: { titre: string; description?: string; sousChapitres?: string[] }[];
}

interface Props {
  open: boolean;
  matiere: { id: string; nom: string; code: string } | null;
  initialChapitres: DraftChapitre[];
  activeAiModel: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProgramEditorModal({
  open,
  matiere,
  initialChapitres,
  activeAiModel,
  onClose,
  onSaved,
}: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  const [tab, setTab] = useState<"MANUAL" | "WORD_AI">("MANUAL");
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const chapitres = Form.useWatch("chapitres", form);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      chapitres: initialChapitres.map((c) => ({
        titre: c.titre,
        description: c.description,
        sousChapitres: c.sousChapitres,
      })),
    });
    setTab("MANUAL");
    setWordFile(null);
    setAiMessage(null);
  }, [open, initialChapitres, form]);

  const handleSave = async (values: FormValues) => {
    if (!matiere?.id) {
      message.error("Matière introuvable.");
      return;
    }

    const validList = (values.chapitres ?? []).filter((c) => c.titre?.trim().length > 0);
    if (validList.length === 0) {
      message.error("Veuillez saisir au moins un chapitre valide.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/matieres/${matiere.id}/chapitres`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapitres: validList.map((c, idx) => ({
            numero: idx + 1,
            titre: c.titre.trim(),
            description: c.description?.trim() || null,
            ordre: idx + 1,
            sousChapitres: (c.sousChapitres || [])
              .map((s) => (s ?? "").trim())
              .filter((s) => s.length > 0)
              .map((titre, scIdx) => ({ titre, ordre: scIdx + 1 })),
          })),
          replaceAll: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        message.error(err.error || "Erreur enregistrement programme");
        return;
      }

      message.success("Programme et sous-chapitres enregistrés avec succès pour cette matière.");
      onSaved();
    } catch {
      message.error("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!wordFile) {
      message.error("Veuillez sélectionner un fichier Word .docx.");
      return;
    }

    try {
      setAnalyzing(true);
      setAiMessage(null);

      const formData = new FormData();
      formData.append("file", wordFile);
      if (activeAiModel) formData.append("model", activeAiModel);

      const res = await fetch("/api/ai/extract-chapitres", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "Échec de l'analyse du document.");
        return;
      }

      if (Array.isArray(data.chapitres) && data.chapitres.length > 0) {
        form.setFieldsValue({
          chapitres: data.chapitres.map(
            (c: { titre: string; description: string | null; sousChapitres?: string[] }) => ({
              titre: c.titre,
              description: c.description || "",
              sousChapitres: Array.isArray(c.sousChapitres) ? c.sousChapitres : [],
            })
          ),
        });
        setAiMessage(data.message || `${data.chapitres.length} chapitres extraits.`);
        setTab("MANUAL");
      } else {
        message.error("Aucun chapitre n'a pu être identifié dans le document.");
      }
    } catch (err) {
      console.error(err);
      message.error("Erreur réseau lors de l'appel IA.");
    } finally {
      setAnalyzing(false);
    }
  };

  const count = chapitres?.length ?? 0;

  return (
    <Modal
      open={open}
      width={820}
      onCancel={onClose}
      forceRender
      title={
        <div>
          <span className="flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Programme &amp; syllabus{matiere ? ` : ${matiere.nom}` : ""}
          </span>
          {matiere && (
            <p className="text-xs font-normal text-slate-500 mt-1">
              Matière : <span className="font-mono font-bold text-blue-700">[{matiere.code}]</span> — ce
              programme est partagé par toutes les classes où cette matière est enseignée.
            </p>
          )}
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button onClick={onClose}>Annuler</Button>
          {tab === "MANUAL" && (
            <Button
              type="primary"
              icon={<Check className="w-4 h-4" />}
              loading={saving}
              disabled={count === 0}
              onClick={() => form.submit()}
            >
              Valider et enregistrer le programme
            </Button>
          )}
        </div>
      }
      styles={{ body: { maxHeight: "68vh", overflowY: "auto", paddingRight: 4 } }}
    >
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as "MANUAL" | "WORD_AI")}
        items={[
          {
            key: "MANUAL",
            forceRender: true,
            label: (
              <span className="text-xs font-bold flex items-center gap-1.5">
                <ListPlus className="w-4 h-4" /> Saisie des chapitres ({count})
              </span>
            ),
            children: (
              <Form<FormValues>
                form={form}
                name="programme_form"
                layout="vertical"
                requiredMark={false}
                autoComplete="off"
                onFinish={handleSave}
                onKeyDown={(e) => {
                  // Entrée dans un champ ne doit pas enregistrer tout le programme par erreur
                  if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
                }}
              >
                {aiMessage && (
                  <Alert
                    className="!mb-4"
                    type="success"
                    showIcon
                    icon={<Sparkles className="w-4 h-4" />}
                    closable
                    onClose={() => setAiMessage(null)}
                    title="Extraction IA réussie"
                    description={`${aiMessage} Vérifiez les chapitres ci-dessous, ajustez si nécessaire, puis cliquez sur « Valider et enregistrer le programme ».`}
                  />
                )}

                <Form.List name="chapitres">
                  {(fields, { add, remove, move }) => (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-700">
                          Liste ordonnée des chapitres (20 et plus acceptés)
                        </p>
                        <Button
                          size="small"
                          type="primary"
                          ghost
                          icon={<Plus className="w-3.5 h-3.5" />}
                          onClick={() =>
                            add({
                              titre: `Chapitre ${fields.length + 1} : `,
                              description: "",
                              sousChapitres: [],
                            })
                          }
                          className="!text-xs !font-bold"
                        >
                          Ajouter un chapitre
                        </Button>
                      </div>

                      {fields.map((field, idx) => (
                        <div
                          key={field.key}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                        >
                          <div className="flex items-start gap-2">
                            <span className="w-7 h-7 mt-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <Form.Item
                              name={[field.name, "titre"]}
                              className="!mb-0 flex-1"
                              rules={[{ required: true, whitespace: true, message: "Le titre du chapitre est requis." }]}
                            >
                              <Input placeholder={`Chapitre ${idx + 1} : titre complet`} className="!font-semibold" />
                            </Form.Item>
                            <div className="flex items-center shrink-0">
                              <Button
                                type="text"
                                size="small"
                                aria-label="Monter"
                                title="Monter"
                                disabled={idx === 0}
                                icon={<ArrowUp className="w-3.5 h-3.5" />}
                                onClick={() => move(idx, idx - 1)}
                              />
                              <Button
                                type="text"
                                size="small"
                                aria-label="Descendre"
                                title="Descendre"
                                disabled={idx === fields.length - 1}
                                icon={<ArrowDown className="w-3.5 h-3.5" />}
                                onClick={() => move(idx, idx + 1)}
                              />
                              <Button
                                type="text"
                                size="small"
                                danger
                                aria-label="Supprimer ce chapitre"
                                title="Supprimer ce chapitre"
                                disabled={fields.length <= 1}
                                icon={<Trash2 className="w-3.5 h-3.5" />}
                                onClick={() => remove(field.name)}
                              />
                            </div>
                          </div>

                          <Form.Item name={[field.name, "description"]} className="!mb-0">
                            <Input
                              size="small"
                              placeholder="Description / objectifs globaux du chapitre (optionnel)"
                              prefix={<FileText className="w-3.5 h-3.5 text-slate-400" />}
                            />
                          </Form.Item>

                          <Form.List name={[field.name, "sousChapitres"]}>
                            {(subFields, { add: addSub, remove: removeSub }) => (
                              <div className="bg-white rounded-lg p-2.5 border border-slate-200/90 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className={`${labelClass} flex items-center gap-1.5`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    Sous-chapitres ({subFields.length})
                                  </span>
                                  <Button
                                    type="link"
                                    size="small"
                                    icon={<Plus className="w-3 h-3" />}
                                    onClick={() => addSub("")}
                                    className="!text-[11px] !font-bold !p-0 !h-auto"
                                  >
                                    Ajouter un sous-chapitre
                                  </Button>
                                </div>

                                {subFields.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 italic">
                                    Aucun sous-chapitre défini (ex : « Découvrir NumPy », « Les bases de l&apos;algèbre
                                    linéaire »).
                                  </p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {subFields.map((sub, subIdx) => (
                                      <div key={sub.key} className="flex items-center gap-2">
                                        <span className="text-[11px] font-mono font-bold text-slate-400 w-9 shrink-0">
                                          {idx + 1}.{subIdx + 1}
                                        </span>
                                        <Form.Item name={sub.name} className="!mb-0 flex-1">
                                          <Input
                                            size="small"
                                            placeholder={`Sous-chapitre ${subIdx + 1} (ex : Découvrir NumPy)`}
                                          />
                                        </Form.Item>
                                        <Button
                                          type="text"
                                          size="small"
                                          danger
                                          aria-label="Supprimer ce sous-chapitre"
                                          title="Supprimer ce sous-chapitre"
                                          icon={<X className="w-3.5 h-3.5" />}
                                          onClick={() => removeSub(sub.name)}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </Form.List>
                        </div>
                      ))}

                      <Button
                        block
                        type="dashed"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={() =>
                          add({
                            titre: `Chapitre ${fields.length + 1} : `,
                            description: "",
                            sousChapitres: [],
                          })
                        }
                        className="!text-xs !font-bold"
                      >
                        Ajouter un chapitre supplémentaire
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form>
            ),
          },
          {
            key: "WORD_AI",
            label: (
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> Importer un document Word (IA)
              </span>
            ),
            children: (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Extraction automatique par IA (OpenRouter)
                    </span>
                    <Link
                      href="/dashboard/config"
                      target="_blank"
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline shrink-0"
                    >
                      Changer de modèle &rarr;
                    </Link>
                  </div>
                  <p className="text-xs text-blue-800/80 leading-relaxed">
                    Téléversez votre document Word (syllabus, plan de cours .docx). L&apos;IA repère la section
                    contenant le découpage des chapitres et les extrait pour que vous puissiez les valider.
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600">
                    <span className="font-semibold">Modèle actif :</span>
                    <code className="px-2 py-0.5 bg-blue-100/70 text-blue-900 font-mono rounded-md font-bold text-[10px]">
                      {activeAiModel}
                    </code>
                  </div>
                </div>

                <div>
                  <span className={`${labelClass} block mb-1.5`}>Fichier Word du cours (.docx)</span>
                  <Upload.Dragger
                    accept=".docx"
                    multiple={false}
                    maxCount={1}
                    showUploadList={false}
                    beforeUpload={(f) => {
                      setWordFile(f);
                      return false;
                    }}
                  >
                    <div className="py-2">
                      <p className="mb-2 flex justify-center">
                        <FileText className="w-9 h-9 text-blue-600" />
                      </p>
                      {wordFile ? (
                        <>
                          <p className="text-sm font-semibold text-emerald-700">{wordFile.name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {(wordFile.size / 1024).toFixed(1)} Ko — cliquez pour le remplacer
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-slate-700">
                            Cliquez ou glissez votre fichier .docx ici
                          </p>
                          <p className="text-xs text-slate-500 mt-1">Un seul fichier, au format Word (.docx)</p>
                        </>
                      )}
                    </div>
                  </Upload.Dragger>
                </div>

                <Button
                  type="primary"
                  block
                  size="large"
                  loading={analyzing}
                  disabled={!wordFile}
                  icon={!analyzing ? <Sparkles className="w-4 h-4" /> : undefined}
                  onClick={handleAnalyze}
                  className="!text-xs !font-bold"
                >
                  {analyzing
                    ? `L'IA analyse votre document (${activeAiModel})…`
                    : "Analyser le document et extraire les chapitres"}
                </Button>
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
}
