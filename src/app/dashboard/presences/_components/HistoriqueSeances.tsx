"use client";

import { useState } from "react";
import { Button, Popconfirm, Tooltip } from "antd";
import {
  Check,
  ChevronDown,
  Download,
  Eye,
  History,
  ListChecks,
  Pencil,
  Trash2,
} from "lucide-react";
import { PresenceBadge } from "@/components/ui/Badge";
import type { EtudiantItem, SeanceHistorique } from "./shared";

interface Props {
  historique: SeanceHistorique[];
  etudiants: EtudiantItem[];
  canDelete: boolean;
  exportHref: string;
  onEdit: (s: SeanceHistorique) => void;
  onDelete: (id: string) => void;
}

export default function HistoriqueSeances({
  historique,
  etudiants,
  canDelete,
  exportHref,
  onEdit,
  onDelete,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const allExpanded = historique.length > 0 && expandedIds.length === historique.length;

  const toggle = (id: string) =>
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Séances enregistrées pour cette matière</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Consultez les feuilles de présence, les émargements détaillés et les progressions validées.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {historique.length > 0 && (
            <Button
              icon={<Eye className="w-3.5 h-3.5" />}
              onClick={() => setExpandedIds(allExpanded ? [] : historique.map((s) => s.id))}
              className="!text-xs !font-semibold"
            >
              {allExpanded ? "Tout replier" : "Déplier tous les émargements"}
            </Button>
          )}
          <Button
            href={exportHref}
            icon={<Download className="w-3.5 h-3.5" />}
            className="!text-xs !font-semibold"
          >
            Exporter la feuille Excel
          </Button>
        </div>
      </div>

      {historique.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <History className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-slate-800">Aucune séance enregistrée</p>
          <p className="text-xs text-slate-500 mt-1">
            Les feuilles d&apos;appel validées pour cette matière apparaîtront ici.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {historique.map((s) => {
            const total = s.presences.length;
            const pCount = s.presences.filter((p) => p.statut === "PRESENT").length;
            const rCount = s.presences.filter((p) => p.statut === "RETARD").length;
            const jCount = s.presences.filter((p) => p.statut === "JUSTIFIE").length;
            const absents = s.presences.filter((p) => p.statut === "ABSENT").length;
            const presentsTotal = pCount + rCount + jCount;
            const rate = total > 0 ? Math.round((presentsTotal / total) * 100) : 100;
            const isExpanded = expandedIds.includes(s.id);

            return (
              <li key={s.id} className="p-5 hover:bg-slate-50/40 transition">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 capitalize">
                        {new Date(s.date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-bold text-xs">
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
                        Émargé par : {s.creePar.nom} (
                        {s.creePar.role === "ENSEIGNANT" ? "Enseignant" : "Chef de classe"})
                      </p>
                    )}

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
                            <span className="text-[10px] font-bold text-indigo-500">&bull; Sous-chapitres :</span>
                            {s.sousChapitresCouverts.map((sc) => (
                              <span
                                key={sc.id}
                                className="px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded-md text-[10px] font-medium border border-indigo-200 inline-flex items-center gap-1"
                              >
                                <Check className="w-2.5 h-2.5 text-indigo-600 stroke-[3]" />
                                {sc.titre}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => toggle(s.id)}
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      />
                      {isExpanded
                        ? "Masquer l'émargement détaillé"
                        : `Voir l'émargement détaillé (${presentsTotal}/${total} présents)`}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-start">
                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          rate >= 80 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {rate}% présence
                      </span>
                      <span className="block text-[11px] text-slate-400 mt-0.5 font-medium">
                        {presentsTotal} présent(s) &bull; {absents} absent(s)
                      </span>
                    </div>

                    <div className="flex items-center">
                      <Tooltip title="Modifier les présences">
                        <Button
                          type="text"
                          aria-label="Modifier la séance"
                          icon={<Pencil className="w-4 h-4 text-blue-600" />}
                          onClick={() => onEdit(s)}
                        />
                      </Tooltip>
                      {canDelete && (
                        <Popconfirm
                          title="Supprimer cette feuille d'appel ?"
                          description="Les présences enregistrées pour cette séance seront perdues."
                          okText="Supprimer"
                          cancelText="Annuler"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => onDelete(s.id)}
                        >
                          <Button
                            type="text"
                            danger
                            aria-label="Supprimer la séance"
                            icon={<Trash2 className="w-4 h-4" />}
                          />
                        </Popconfirm>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 -mx-5 -mb-5 p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700">
                          Total : {total} auditeurs
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {pCount} présent(s)
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                          {absents} absent(s)
                        </span>
                        {rCount > 0 && (
                          <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            {rCount} retard(s)
                          </span>
                        )}
                        {jCount > 0 && (
                          <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {jCount} justifié(s)
                          </span>
                        )}
                      </div>
                      <Button
                        type="primary"
                        size="small"
                        icon={<Pencil className="w-3.5 h-3.5" />}
                        onClick={() => onEdit(s)}
                        className="!text-xs !font-bold"
                      >
                        Modifier cette feuille d&apos;appel
                      </Button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                      <table className="w-full min-w-max text-left text-xs">
                        <thead>
                          <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                            <th className="px-4 py-2.5">N°</th>
                            <th className="px-4 py-2.5">Matricule</th>
                            <th className="px-4 py-2.5">Nom &amp; prénom</th>
                            <th className="px-4 py-2.5 text-center">Statut</th>
                            <th className="px-4 py-2.5">Remarque / motif</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {s.presences.map((p, pIdx) => {
                            const et = p.etudiant || etudiants.find((e) => e.id === p.etudiantId);
                            return (
                              <tr key={p.id || pIdx} className="hover:bg-slate-50/80 transition">
                                <td className="px-4 py-2 text-slate-400 font-mono text-[11px]">{pIdx + 1}</td>
                                <td className="px-4 py-2 font-mono font-bold text-slate-700">
                                  {et?.matricule || "—"}
                                </td>
                                <td className="px-4 py-2 font-semibold text-slate-900 whitespace-nowrap">
                                  {et ? `${et.nom} ${et.prenom}` : "Auditeur"}
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
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
