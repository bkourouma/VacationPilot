"use client";

import Link from "next/link";
import { Button, Checkbox } from "antd";
import { BookOpen, ListChecks } from "lucide-react";
import type { ChapitreSeance } from "./shared";

interface Props {
  chapitres: ChapitreSeance[];
  selectedChapitreIds: string[];
  selectedSousChapitreIds: string[];
  onToggleChapitre: (ch: ChapitreSeance) => void;
  onToggleSous: (ch: ChapitreSeance, scId: string) => void;
  onSelectAllSous: (ch: ChapitreSeance) => void;
  definitionHref: string;
}

/** Choix des chapitres et sous-chapitres abordés pendant la séance. */
export default function ChapitresPicker({
  chapitres,
  selectedChapitreIds,
  selectedSousChapitreIds,
  onToggleChapitre,
  onToggleSous,
  onSelectAllSous,
  definitionHref,
}: Props) {
  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-blue-600" />
            Progression pédagogique
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Cochez les chapitres ou sous-chapitres traités pendant cette séance pour actualiser la
            progression du cours.
          </p>
        </div>
        {chapitres.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedSousChapitreIds.length > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {selectedSousChapitreIds.length} sous-chapitre{selectedSousChapitreIds.length > 1 ? "s" : ""}
              </span>
            )}
            {selectedChapitreIds.length > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {selectedChapitreIds.length} chapitre{selectedChapitreIds.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {chapitres.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" />
            Aucun syllabus ni chapitre n&apos;est encore défini pour ce cours.
          </span>
          <Link
            href={definitionHref}
            className="font-bold text-blue-600 hover:text-blue-800 shrink-0 inline-flex items-center gap-1"
          >
            Définir le programme (saisie manuelle ou Word IA) &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {chapitres.map((ch) => {
            const sousList = ch.sousChapitres || [];
            const hasSous = sousList.length > 0;
            const selectedSousCount = sousList.filter((s) => selectedSousChapitreIds.includes(s.id)).length;
            const isAllSousSelected = hasSous && selectedSousCount === sousList.length;
            const isChecked = selectedChapitreIds.includes(ch.id) || isAllSousSelected;
            const alreadyValidated = !!ch.valide;

            return (
              <div
                key={ch.id}
                className={`flex flex-col p-3.5 rounded-xl border text-xs transition ${
                  isChecked
                    ? "bg-blue-50/80 border-blue-400 ring-1 ring-blue-400"
                    : selectedSousCount > 0
                    ? "bg-indigo-50/50 border-indigo-300"
                    : alreadyValidated
                    ? "bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50/70"
                    : "bg-slate-50/60 border-slate-200 hover:bg-slate-100/60"
                }`}
              >
                <Checkbox checked={isChecked} onChange={() => onToggleChapitre(ch)} className="!items-start">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900">Ch. {ch.numero}</span>
                      {alreadyValidated && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 rounded">
                          Déjà vu
                        </span>
                      )}
                      {hasSous && (
                        <span className="text-[10px] font-medium text-slate-500 bg-white/80 px-1.5 rounded border border-slate-200">
                          {selectedSousCount}/{sousList.length} sous-ch.
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-slate-800 mt-0.5 leading-snug whitespace-normal">
                      {ch.titre}
                    </p>
                  </div>
                </Checkbox>

                {hasSous && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold px-0.5">
                      <span>Sous-chapitres traités :</span>
                      <Button type="link" size="small" onClick={() => onSelectAllSous(ch)} className="!text-[10px] !font-bold !p-0 !h-auto">
                        {selectedSousCount === sousList.length ? "Tout décocher" : "Tout cocher"}
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {sousList.map((sc) => {
                        const isSousChecked = selectedSousChapitreIds.includes(sc.id);
                        return (
                          <div
                            key={sc.id}
                            className={`flex items-start gap-2 p-1.5 rounded-lg text-[11px] transition ${
                              isSousChecked
                                ? "bg-blue-100/80 text-blue-900 font-semibold"
                                : sc.valide
                                ? "bg-emerald-50/60 text-slate-700"
                                : "bg-white/80 text-slate-700 border border-slate-100"
                            }`}
                          >
                            <Checkbox
                              checked={isSousChecked}
                              onChange={() => onToggleSous(ch, sc.id)}
                              className="!items-start !text-[11px] flex-1"
                            >
                              <span className="leading-tight whitespace-normal">{sc.titre}</span>
                            </Checkbox>
                            {sc.valide && !isSousChecked && (
                              <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100/70 px-1 rounded shrink-0">
                                Vu
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
