"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InputRef } from "antd";
import { Alert, App, Button, Form, Input, Modal, Select, Tabs, Upload } from "antd";
import {
  AtSign,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Hash,
  Mail,
  Pencil,
  Phone,
  Plus,
  School,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { ClasseLite, EtudiantItem, countEtudiants, labelClass } from "./types";
import { downloadStudentTemplate } from "./downloadTemplate";

export type AddEtudiantTab = "saisie" | "coller" | "excel";

interface BulkRow {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  contact: string;
  email: string;
}

/** Découpage intelligent d'une liste collée (WhatsApp, Word, Excel…). */
function parseBulkText(text: string): BulkRow[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines
    .map((line, idx) => {
      let parts: string[];
      if (line.includes("\t")) parts = line.split("\t");
      else if (line.includes(";")) parts = line.split(";");
      else if (line.includes(",")) parts = line.split(",");
      else parts = line.split(/\s+/);
      parts = parts.map((p) => p.trim()).filter(Boolean);

      let matricule = "";
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

      let nom = "";
      let prenom = "";
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
}

/* -------------------------------------------------------------- */
/* Inscrire des auditeurs : saisie rapide / liste collée / Excel   */
/* -------------------------------------------------------------- */

interface SingleValues {
  nom: string;
  prenom?: string;
  matricule?: string;
  contact?: string;
  email?: string;
}

interface AddProps {
  open: boolean;
  initialTab: AddEtudiantTab;
  classes: ClasseLite[];
  selectedClasseId: string;
  onSelectClasse: (id: string) => void;
  onClose: () => void;
  /** Demande au parent de recharger les classes (sans écran de chargement). */
  onChanged: () => void;
}

export function AddEtudiantModal({
  open,
  initialTab,
  classes,
  selectedClasseId,
  onSelectClasse,
  onClose,
  onChanged,
}: AddProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<SingleValues>();
  const nomRef = useRef<InputRef>(null);

  const [tab, setTab] = useState<AddEtudiantTab>(initialTab);
  const [sessionCount, setSessionCount] = useState(0);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [bulkText, setBulkText] = useState("");
  const [bulkParsed, setBulkParsed] = useState<BulkRow[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const classe = classes.find((c) => c.id === selectedClasseId);
  const nomValue = Form.useWatch("nom", form);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setSessionCount(0);
    setNotice(null);
    setBulkText("");
    setBulkParsed([]);
    setExcelFile(null);
    setImportResult(null);
    form.resetFields();
    setTimeout(() => nomRef.current?.focus(), 150);
  }, [open, initialTab, form]);

  const classOptions = useMemo(
    () =>
      classes.map((c) => ({
        value: c.id,
        label: `${c.code} — ${c.nom} (${c.anneeScolaire}) • ${countEtudiants(c)} auditeur(s)`,
      })),
    [classes]
  );

  const closeModal = () => {
    if (sessionCount > 0) onChanged();
    onClose();
  };

  const saveSingle = async (values: SingleValues, keepOpen: boolean) => {
    if (!selectedClasseId) return;
    setSaving(true);
    setNotice(null);

    try {
      const nom = values.nom.trim().toUpperCase();
      const prenom = (values.prenom ?? "").trim();
      const res = await fetch("/api/etudiants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricule: values.matricule?.trim() || undefined,
          nom,
          prenom,
          contact: (values.contact ?? "").trim(),
          email: (values.email ?? "").trim(),
          classeId: selectedClasseId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setNotice({ type: "error", text: err.error || "Erreur lors de l'enregistrement" });
        return;
      }

      const created = await res.json();
      setSessionCount((n) => n + 1);

      if (keepOpen) {
        setNotice({
          type: "success",
          text: `${nom} ${prenom} enregistré(e) avec succès (matricule : ${
            created.matricule || "attribué"
          }).`,
        });
        const currNum = parseInt(created.matricule || values.matricule || "", 10);
        form.setFieldsValue({
          nom: "",
          prenom: "",
          contact: "",
          email: "",
          matricule: Number.isNaN(currNum) ? "" : String(currNum + 1),
        });
        form.setFields([
          { name: "nom", errors: [] },
          { name: "email", errors: [] },
        ]);
        onChanged();
        setTimeout(() => nomRef.current?.focus(), 50);
      } else {
        message.success(`Auditeur ${nom} ${prenom} inscrit avec succès.`);
        onChanged();
        onClose();
      }
    } catch {
      setNotice({ type: "error", text: "Erreur réseau lors de l'inscription." });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!selectedClasseId || bulkParsed.length === 0) return;
    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/etudiants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classeId: selectedClasseId, etudiants: bulkParsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.error || "Erreur lors de l'enregistrement en masse.");
        return;
      }
      message.success(data.message || `${bulkParsed.length} auditeurs inscrits avec succès.`);
      onChanged();
      onClose();
    } catch {
      message.error("Erreur réseau lors de l'inscription en masse.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleImportExcel = async () => {
    if (!excelFile || !selectedClasseId) return;
    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", excelFile);
    formData.append("classeId", selectedClasseId);

    try {
      const res = await fetch("/api/etudiants/import-excel", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error || "Erreur lors de l'importation.");
        return;
      }
      setImportResult(json.message);
      message.success(json.message);
      setExcelFile(null);
      onChanged();
    } catch {
      message.error("Erreur réseau lors de l'import.");
    } finally {
      setImporting(false);
    }
  };

  const canSaveSingle = !!nomValue?.trim() && !!selectedClasseId;

  return (
    <Modal
      open={open}
      width={720}
      footer={null}
      onCancel={closeModal}
      forceRender
      title={
        <div>
          <span className="flex items-center gap-2 text-base">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            Inscrire des auditeurs
          </span>
          <p className="text-xs font-normal text-slate-500 mt-1">
            Ajoutez vos étudiants par saisie rapide, copier-coller ou import Excel.
          </p>
        </div>
      }
    >
      <div className="mt-4 mb-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className={labelClass}>Classe de destination</span>
          {classe && (
            <span className="text-[11px] text-slate-500">
              {countEtudiants(classe)} auditeur(s) déjà inscrit(s)
            </span>
          )}
        </div>
        {classes.length === 0 ? (
          <Alert
            type="warning"
            showIcon
            title="Aucune classe disponible dans l'établissement. Veuillez d'abord créer une classe."
          />
        ) : (
          <Select
            aria-label="Classe"
            className="w-full"
            showSearch
            value={selectedClasseId || undefined}
            onChange={onSelectClasse}
            options={classOptions}
            optionFilterProp="label"
            placeholder="Sélectionnez la classe cible"
            status={!selectedClasseId ? "error" : undefined}
            suffixIcon={<School className="w-4 h-4 text-slate-400" />}
          />
        )}
        {!selectedClasseId && classes.length > 0 && (
          <p className="text-[11px] font-semibold text-rose-600">
            Veuillez d&apos;abord sélectionner une classe cible avant d&apos;inscrire des auditeurs.
          </p>
        )}
      </div>

      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as AddEtudiantTab)}
        items={[
          {
            key: "saisie",
            forceRender: true,
            label: (
              <span className="flex items-center gap-1.5 text-xs font-bold">
                <Plus className="w-4 h-4" /> Saisie rapide
              </span>
            ),
            children: (
              <div className="space-y-4">
                <Alert
                  type="info"
                  showIcon
                  icon={<Sparkles className="w-4 h-4" />}
                  title="Saisie ultra-rapide au clavier"
                  description="Remplissez les champs et tapez Entrée pour enregistrer et passer à l'étudiant suivant. Le matricule est généré automatiquement s'il est laissé vide."
                />

                {notice && (
                  <Alert
                    type={notice.type}
                    showIcon
                    closable
                    onClose={() => setNotice(null)}
                    title={notice.text}
                  />
                )}

                <Form<SingleValues>
                  form={form}
                  name="add_etudiant_form"
                  layout="vertical"
                  requiredMark={false}
                  autoComplete="off"
                  onFinish={(v) => saveSingle(v, true)}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                    <Form.Item
                      label={<span className={labelClass}>Nom de famille</span>}
                      name="nom"
                      normalize={(v?: string) => v?.toUpperCase()}
                      rules={[{ required: true, whitespace: true, message: "Le nom est obligatoire." }]}
                    >
                      <Input
                        ref={nomRef}
                        prefix={<User className="w-4 h-4 text-slate-400" />}
                        placeholder="Ex : KOUAME"
                      />
                    </Form.Item>
                    <Form.Item label={<span className={labelClass}>Prénom(s)</span>} name="prenom">
                      <Input prefix={<User className="w-4 h-4 text-slate-400" />} placeholder="Ex : Jean-Marc" />
                    </Form.Item>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
                    <Form.Item
                      label={
                        <span className={labelClass}>
                          Matricule <span className="font-normal text-slate-400">(optionnel)</span>
                        </span>
                      }
                      name="matricule"
                      normalize={(v?: string) => v?.toUpperCase()}
                    >
                      <Input prefix={<Hash className="w-4 h-4 text-slate-400" />} placeholder="Auto si vide" />
                    </Form.Item>
                    <Form.Item label={<span className={labelClass}>Contact / téléphone</span>} name="contact">
                      <Input prefix={<Phone className="w-4 h-4 text-slate-400" />} placeholder="07 00 00 00 00" />
                    </Form.Item>
                    <Form.Item
                      label={<span className={labelClass}>Email</span>}
                      name="email"
                      rules={[{ type: "email", message: "Adresse email invalide." }]}
                    >
                      <Input prefix={<Mail className="w-4 h-4 text-slate-400" />} placeholder="etudiant@ecole.ci" />
                    </Form.Item>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <span className="text-xs">
                      {sessionCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <Check className="w-3.5 h-3.5" />
                          {sessionCount} auditeur(s) inscrit(s) dans cette session
                        </span>
                      ) : (
                        <span className="text-slate-400">Aucun auditeur ajouté pour l&apos;instant</span>
                      )}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button onClick={closeModal}>{sessionCount > 0 ? "Terminer" : "Annuler"}</Button>
                      <Button
                        disabled={!canSaveSingle}
                        loading={saving}
                        onClick={async () => {
                          try {
                            const v = await form.validateFields();
                            await saveSingle(v, false);
                          } catch {
                            /* validation affichée par le formulaire */
                          }
                        }}
                      >
                        Enregistrer et fermer
                      </Button>
                      <Button type="primary" htmlType="submit" disabled={!canSaveSingle} loading={saving}>
                        Enregistrer et suivant ↵
                      </Button>
                    </div>
                  </div>
                </Form>
              </div>
            ),
          },
          {
            key: "coller",
            forceRender: true,
            label: (
              <span className="flex items-center gap-1.5 text-xs font-bold">
                <ClipboardPaste className="w-4 h-4" /> Coller une liste
              </span>
            ),
            children: (
              <div className="space-y-4">
                <Alert
                  type="info"
                  showIcon
                  icon={<ClipboardPaste className="w-4 h-4" />}
                  title="Collez votre liste depuis WhatsApp, Word ou Excel"
                  description="Un auditeur par ligne. Le système extrait automatiquement les noms, prénoms, téléphones et emails. Les matricules sont générés automatiquement si omis."
                />

                <div>
                  <label className={`${labelClass} block mb-1.5`}>Liste brute des étudiants</label>
                  <Input.TextArea
                    aria-label="Liste brute des étudiants"
                    rows={5}
                    value={bulkText}
                    onChange={(e) => {
                      setBulkText(e.target.value);
                      setBulkParsed(parseBulkText(e.target.value));
                    }}
                    className="!font-mono !text-xs"
                    placeholder={`Collez ici votre liste...\nExemple :\nKOUAME Jean-Marc 0701020304\nKONE Aminata aminata@gmail.com\nTRAORE Bakary 0511223344\n34005; N'GUESSAN; Ange`}
                  />
                </div>

                {bulkParsed.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        {bulkParsed.length} auditeur(s) détecté(s)
                      </span>
                      <span className="text-slate-400 font-normal text-[11px]">
                        Vérifiez l&apos;aperçu avant de valider
                      </span>
                    </div>

                    <div className="max-h-56 overflow-auto border border-slate-200 rounded-xl">
                      <table className="w-full min-w-max text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                          <tr>
                            <th className="px-3 py-2">N°</th>
                            <th className="px-3 py-2">Matricule</th>
                            <th className="px-3 py-2">Nom</th>
                            <th className="px-3 py-2">Prénoms</th>
                            <th className="px-3 py-2">Contact</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-2 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {bulkParsed.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="px-3 py-2 font-mono text-[11px] text-blue-700">
                                {item.matricule || <span className="text-slate-400 italic">Auto</span>}
                              </td>
                              <td className="px-3 py-2 font-bold text-slate-900">{item.nom}</td>
                              <td className="px-3 py-2 text-slate-700">{item.prenom || "-"}</td>
                              <td className="px-3 py-2 text-slate-600 text-[11px]">{item.contact || "-"}</td>
                              <td className="px-3 py-2 text-slate-600 text-[11px]">{item.email || "-"}</td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setBulkParsed((prev) => prev.filter((r) => r.id !== item.id))}
                                  className="text-slate-300 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                                  title="Retirer cette ligne"
                                  aria-label="Retirer cette ligne"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : bulkText.trim().length > 0 ? (
                  <Alert
                    type="warning"
                    showIcon
                    title="Aucun nom n'a pu être extrait. Vérifiez que chaque ligne contient au moins un nom d'étudiant."
                  />
                ) : null}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button onClick={closeModal}>Annuler</Button>
                  <Button
                    type="primary"
                    icon={<ClipboardPaste className="w-4 h-4" />}
                    disabled={bulkParsed.length === 0 || !selectedClasseId}
                    loading={bulkSubmitting}
                    onClick={handleBulkSubmit}
                  >
                    {bulkSubmitting
                      ? "Inscription en cours..."
                      : `Valider et inscrire ces ${bulkParsed.length} auditeurs`}
                  </Button>
                </div>
              </div>
            ),
          },
          {
            key: "excel",
            forceRender: true,
            label: (
              <span className="flex items-center gap-1.5 text-xs font-bold">
                <FileSpreadsheet className="w-4 h-4" /> Fichier Excel
              </span>
            ),
            children: (
              <div className="space-y-4">
                <Alert
                  type="success"
                  showIcon
                  icon={<FileSpreadsheet className="w-4 h-4" />}
                  title="Importation automatique depuis votre fichier Excel"
                  description="Format flexible : avec ou sans ligne d'en-tête, listes brutes de noms ou feuilles de présence. Les matricules sont générés automatiquement si omis."
                  action={
                    <Button
                      size="small"
                      icon={<Download className="w-3.5 h-3.5" />}
                      onClick={() => downloadStudentTemplate(classe?.code)}
                    >
                      Modèle Excel
                    </Button>
                  }
                />

                <ExcelDropzone file={excelFile} onChange={setExcelFile} />

                {importResult && <Alert type="success" showIcon title={importResult} />}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button onClick={closeModal}>Fermer</Button>
                  <Button
                    type="primary"
                    icon={<FileSpreadsheet className="w-4 h-4" />}
                    disabled={!excelFile || !selectedClasseId}
                    loading={importing}
                    onClick={handleImportExcel}
                    className="!bg-emerald-600 hover:!bg-emerald-700"
                  >
                    {importing ? "Importation en cours..." : "Lancer l'importation vers cette classe"}
                  </Button>
                </div>
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
}

/* Zone de dépôt de fichier Excel réutilisée par la modale et par la page. */
export function ExcelDropzone({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <Upload.Dragger
      accept=".xlsx,.xls,.csv"
      multiple={false}
      maxCount={1}
      showUploadList={false}
      beforeUpload={(f) => {
        onChange(f);
        return false;
      }}
    >
      <div className="py-2">
        <p className="mb-2 flex justify-center">
          <FileSpreadsheet className="w-9 h-9 text-emerald-600" />
        </p>
        {file ? (
          <>
            <p className="text-sm font-semibold text-emerald-700 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {file.name}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {(file.size / 1024).toFixed(1)} Ko — cliquez ou déposez un autre fichier pour le remplacer
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-700">
              Cliquez ou glissez votre fichier ici
            </p>
            <p className="text-xs text-slate-500 mt-1">Formats acceptés : .xlsx, .xls, .csv</p>
          </>
        )}
      </div>
    </Upload.Dragger>
  );
}

/* ---------------------------- */
/* Modifier un auditeur inscrit  */
/* ---------------------------- */

interface EditValues {
  matricule: string;
  nom: string;
  prenom?: string;
  contact?: string;
  email?: string;
  classeId: string;
}

interface EditProps {
  etudiant: EtudiantItem | null;
  classes: ClasseLite[];
  currentClasseId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EditEtudiantModal({ etudiant, classes, currentClasseId, onClose, onSaved }: EditProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<EditValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!etudiant) return;
    form.setFieldsValue({
      matricule: etudiant.matricule,
      nom: etudiant.nom,
      prenom: etudiant.prenom,
      contact: etudiant.contact || "",
      email: etudiant.email || "",
      classeId: currentClasseId,
    });
  }, [etudiant, currentClasseId, form]);

  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c.id, label: `${c.code} — ${c.nom}` })),
    [classes]
  );

  const handleFinish = async (values: EditValues) => {
    if (!etudiant) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/etudiants/${etudiant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricule: values.matricule.trim(),
          nom: values.nom.trim(),
          prenom: (values.prenom ?? "").trim(),
          contact: (values.contact ?? "").trim(),
          email: (values.email ?? "").trim(),
          classeId: values.classeId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        message.error(err.error || "Erreur modification");
        return;
      }

      message.success("Auditeur mis à jour avec succès.");
      onSaved();
    } catch {
      message.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!etudiant}
      width={520}
      title={
        <span className="flex items-center gap-2 text-sm">
          <Pencil className="w-4 h-4 text-blue-600" />
          Modifier l&apos;auditeur
        </span>
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
        name="edit_etudiant_form"
        layout="vertical"
        requiredMark={false}
        onFinish={handleFinish}
        autoComplete="off"
        className="!mt-5"
      >
        <Form.Item
          label={<span className={labelClass}>Numéro de matricule</span>}
          name="matricule"
          normalize={(v?: string) => v?.toUpperCase()}
          rules={[{ required: true, whitespace: true, message: "Le matricule est requis." }]}
        >
          <Input prefix={<Hash className="w-4 h-4 text-slate-400" />} className="!font-mono" />
        </Form.Item>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Form.Item
            label={<span className={labelClass}>Nom de famille</span>}
            name="nom"
            normalize={(v?: string) => v?.toUpperCase()}
            rules={[{ required: true, whitespace: true, message: "Le nom est requis." }]}
          >
            <Input prefix={<User className="w-4 h-4 text-slate-400" />} />
          </Form.Item>
          <Form.Item label={<span className={labelClass}>Prénom(s)</span>} name="prenom">
            <Input prefix={<User className="w-4 h-4 text-slate-400" />} />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Form.Item label={<span className={labelClass}>Contact téléphonique</span>} name="contact">
            <Input prefix={<Phone className="w-4 h-4 text-slate-400" />} placeholder="07 00 00 00 00" />
          </Form.Item>
          <Form.Item
            label={<span className={labelClass}>Adresse email</span>}
            name="email"
            rules={[{ type: "email", message: "Adresse email invalide." }]}
          >
            <Input prefix={<AtSign className="w-4 h-4 text-slate-400" />} placeholder="etudiant@ecole.ci" />
          </Form.Item>
        </div>

        <Form.Item
          label={<span className={labelClass}>Classe de rattachement</span>}
          name="classeId"
          className="!mb-0"
          rules={[{ required: true, message: "Choisissez une classe." }]}
        >
          <Select
            showSearch
            options={classOptions}
            optionFilterProp="label"
            suffixIcon={<School className="w-4 h-4 text-slate-400" />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
