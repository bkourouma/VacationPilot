"use client";

import { useMemo, useState } from "react";
import { Empty, Progress, Segmented, Select } from "antd";
import { ArrowDownRight, ArrowUpRight, BookOpen, ClipboardList, Minus } from "lucide-react";
import { MatiereData, EvaluationData, formatDate, moyenneColor } from "./types";

type NoteFilter = "all" | "notee" | "attente";

function NoteBadge({ ev }: { ev: EvaluationData }) {
  if (ev.valeur === null) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
        En attente
      </span>
    );
  }
  const reussi = ev.valeur >= ev.noteMax / 2;
  return (
    <span
      className={`inline-block px-3 py-1 rounded-lg font-bold text-sm tabular-nums border ${
        reussi
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-rose-50 text-rose-700 border-rose-200"
      }`}
    >
      {ev.valeur} <span className="font-medium opacity-60">/ {ev.noteMax}</span>
    </span>
  );
}

function Ecart({ ev }: { ev: EvaluationData }) {
  if (ev.valeur === null || ev.moyenneClasse === null) {
    return <span className="text-slate-300">—</span>;
  }
  const diff = Math.round((ev.valeur - ev.moyenneClasse) * 100) / 100;
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-500">
        <Minus className="w-3 h-3" /> égal
      </span>
    );
  }
  const up = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold tabular-nums ${
        up ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
      {up ? "+" : ""}
      {diff}
    </span>
  );
}

export default function NotesTab({ matieres }: { matieres: MatiereData[] }) {
  const [matiereId, setMatiereId] = useState<string>("all");
  const [filter, setFilter] = useState<NoteFilter>("all");

  const totals = useMemo(() => {
    const all = matieres.flatMap((m) => m.evaluations);
    return {
      all: all.length,
      notee: all.filter((e) => e.valeur !== null).length,
      attente: all.filter((e) => e.valeur === null).length,
    };
  }, [matieres]);

  const visibles = useMemo(
    () =>
      matieres
        .filter((m) => matiereId === "all" || m.id === matiereId)
        .map((m) => ({
          ...m,
          visibles: m.evaluations.filter((e) =>
            filter === "all" ? true : filter === "notee" ? e.valeur !== null : e.valeur === null
          ),
        }))
        .filter((m) => filter === "all" || m.visibles.length > 0),
    [matieres, matiereId, filter]
  );

  if (matieres.length === 0) {
    return (
      <div className="bg-white p-10 rounded-2xl border border-slate-200/80">
        <Empty description="Aucune matière enregistrée pour cette classe." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Synthèse par matière */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Moyennes par matière
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cliquez sur une matière pour afficher uniquement ses évaluations.
            </p>
          </div>
          {matiereId !== "all" && (
            <button
              type="button"
              onClick={() => setMatiereId("all")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Tout afficher
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {matieres.map((m) => {
            const active = matiereId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMatiereId(active ? "all" : m.id)}
                aria-pressed={active}
                className={`text-left p-3.5 rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/30"
                    : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-blue-700 tracking-wide">{m.code}</p>
                    <p className="text-sm font-semibold text-slate-900 line-clamp-1" title={m.nom}>
                      {m.nom}
                    </p>
                  </div>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums shrink-0">
                    {m.moyenne !== null ? m.moyenne.toFixed(2) : "—"}
                    {m.moyenne !== null && <span className="text-[10px] font-semibold text-slate-400"> /20</span>}
                  </span>
                </div>
                <Progress
                  percent={m.moyenne !== null ? Math.round((m.moyenne / 20) * 100) : 0}
                  showInfo={false}
                  size="small"
                  strokeColor={moyenneColor(m.moyenne)}
                  className="!mb-0 !mt-1"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Coef {m.coefficient} &bull; {m.evaluations.length} évaluation(s)
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 sm:p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <Segmented<NoteFilter>
          value={filter}
          onChange={setFilter}
          options={[
            { label: `Toutes (${totals.all})`, value: "all" },
            { label: `Notées (${totals.notee})`, value: "notee" },
            { label: `En attente (${totals.attente})`, value: "attente" },
          ]}
        />
        <Select
          value={matiereId}
          onChange={setMatiereId}
          className="w-full lg:w-72"
          aria-label="Filtrer par matière"
          options={[
            { value: "all", label: "Toutes les matières" },
            ...matieres.map((m) => ({ value: m.id, label: `${m.code} — ${m.nom}` })),
          ]}
        />
      </div>

      {/* Détail par matière */}
      {visibles.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200/80">
          <Empty description="Aucune évaluation ne correspond à ce filtre." />
        </div>
      ) : (
        visibles.map((m) => (
          <section
            key={m.id}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                  {m.code}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">{m.nom}</h3>
                  <p className="text-xs text-slate-500">
                    Coefficient <span className="font-semibold">{m.coefficient}</span> &bull;{" "}
                    {m.evaluations.length} évaluation(s)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Ma moyenne</span>
                <span
                  className="text-lg font-extrabold tabular-nums"
                  style={{ color: moyenneColor(m.moyenne) }}
                >
                  {m.moyenne !== null ? `${m.moyenne.toFixed(2)} / 20` : "Non noté"}
                </span>
              </div>
            </div>

            {m.visibles.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-400">
                <ClipboardList className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                Aucune évaluation programmée ou notée pour cette matière.
              </div>
            ) : (
              <>
                {/* Tableau ≥ md */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                        <th className="px-5 py-3 whitespace-nowrap">Évaluation</th>
                        <th className="px-3 py-3 whitespace-nowrap">Date</th>
                        <th className="px-3 py-3 text-center whitespace-nowrap">Coef.</th>
                        <th className="px-3 py-3 text-center whitespace-nowrap">Ma note</th>
                        <th className="px-3 py-3 text-center whitespace-nowrap">Moy. classe</th>
                        <th className="px-3 py-3 text-center whitespace-nowrap">Écart</th>
                        <th className="px-5 py-3 whitespace-nowrap">Observation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {m.visibles.map((ev) => (
                        <tr key={ev.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-5 py-3 font-semibold text-slate-800">{ev.titre}</td>
                          <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {formatDate(ev.date)}
                          </td>
                          <td className="px-3 py-3 text-center text-xs font-medium text-slate-600">
                            {ev.coefficient}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <NoteBadge ev={ev} />
                          </td>
                          <td className="px-3 py-3 text-center text-xs text-slate-500 font-medium tabular-nums">
                            {ev.moyenneClasse !== null ? `${ev.moyenneClasse} / ${ev.noteMax}` : "—"}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Ecart ev={ev} />
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500 max-w-xs">
                            {ev.commentaire || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cartes < md */}
                <ul className="md:hidden divide-y divide-slate-100">
                  {m.visibles.map((ev) => (
                    <li key={ev.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-900">{ev.titre}</p>
                          <p className="text-xs text-slate-500">
                            {formatDate(ev.date)} &bull; Coef {ev.coefficient}
                          </p>
                        </div>
                        <NoteBadge ev={ev} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          Moyenne classe :{" "}
                          <span className="font-semibold text-slate-700 tabular-nums">
                            {ev.moyenneClasse !== null ? `${ev.moyenneClasse} / ${ev.noteMax}` : "—"}
                          </span>
                        </span>
                        <Ecart ev={ev} />
                      </div>
                      {ev.commentaire && (
                        <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                          {ev.commentaire}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ))
      )}
    </div>
  );
}
