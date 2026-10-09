"use client";

import { Button, Popconfirm, Tooltip } from "antd";
import { Award, Download, Pencil, Trash2 } from "lucide-react";
import { EvaluationItem, computeStats } from "./types";

interface Props {
  evaluations: EvaluationItem[];
  totalEtudiants: number;
  exportHref: string;
  onEdit: (ev: EvaluationItem) => void;
  onDelete: (id: string) => void;
}

export default function EvaluationsRecap({
  evaluations,
  totalEtudiants,
  exportHref,
  onEdit,
  onDelete,
}: Props) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Évaluations de la matière</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Devoirs et examens enregistrés, avec moyennes et taux de réussite de la classe.
          </p>
        </div>
        <Button href={exportHref} icon={<Download className="w-3.5 h-3.5" />} className="!text-xs !font-semibold">
          Exporter le relevé Excel
        </Button>
      </div>

      {evaluations.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Award className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-slate-800">Aucune évaluation enregistrée</p>
          <p className="text-xs text-slate-500 mt-1">
            Les devoirs et examens de cette matière apparaîtront ici.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {evaluations.map((ev) => {
            const stats = computeStats(
              ev.notes.map((n) => n.valeur),
              ev.noteMax
            );
            const pct = stats ? Math.round((stats.moyenne / ev.noteMax) * 100) : 0;
            const tone = stats && stats.moyenne >= ev.noteMax / 2 ? "bg-emerald-500" : "bg-rose-500";

            return (
              <li key={ev.id} className="p-5 hover:bg-slate-50/50 transition">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-900">{ev.titre}</h4>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-bold text-xs">
                        Coef {ev.coefficient}
                      </span>
                      <span className="text-xs text-slate-400">(sur {ev.noteMax})</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(ev.date).toLocaleDateString("fr-FR")} &bull; {ev.notes.length}
                      {totalEtudiants > 0 ? `/${totalEtudiants}` : ""} copie(s) notée(s)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-end">
                    {stats ? (
                      <>
                        <div className="w-40">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[11px] text-slate-400">Moyenne</span>
                            <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                              {stats.moyenne} / {ev.noteMax}
                            </span>
                          </div>
                          <div className="h-1.5 mt-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${tone}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-center">
                          <span className="text-[11px] text-slate-400 block">Min / Max</span>
                          <span className="text-xs font-bold text-slate-700 tabular-nums">
                            {stats.min} / {stats.max}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-[11px] text-slate-400 block">Réussite</span>
                          <span
                            className={`text-xs font-bold tabular-nums ${
                              stats.reussite >= 50 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {stats.reussite}%
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Moyenne non calculée</span>
                    )}

                    <div className="flex items-center">
                      <Tooltip title="Modifier les notes">
                        <Button
                          type="text"
                          aria-label={`Modifier ${ev.titre}`}
                          icon={<Pencil className="w-4 h-4 text-blue-600" />}
                          onClick={() => onEdit(ev)}
                        />
                      </Tooltip>
                      <Popconfirm
                        title={`Supprimer « ${ev.titre} » ?`}
                        description="L'évaluation et toutes ses notes seront supprimées."
                        okText="Supprimer"
                        cancelText="Annuler"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => onDelete(ev.id)}
                      >
                        <Button
                          type="text"
                          danger
                          aria-label={`Supprimer ${ev.titre}`}
                          icon={<Trash2 className="w-4 h-4" />}
                        />
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
