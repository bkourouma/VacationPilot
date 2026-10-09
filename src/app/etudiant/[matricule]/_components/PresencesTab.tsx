"use client";

import { useMemo, useState } from "react";
import { Empty, Pagination, Progress, Segmented, Select } from "antd";
import { BookOpen, CalendarDays } from "lucide-react";
import {
  MatiereData,
  SeancePresence,
  StatsAssiduite,
  STATUT_META,
  StatutPresence,
  tauxColor,
} from "./types";

const PAGE_SIZE = 10;

type StatutFilter = "all" | StatutPresence;

function StatutBadge({ statut }: { statut: string }) {
  const meta = STATUT_META[statut as StatutPresence];
  if (!meta) return <span className="text-xs text-slate-400">{statut}</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export default function PresencesTab({
  matieres,
  historique,
  stats,
}: {
  matieres: MatiereData[];
  historique: SeancePresence[];
  stats: StatsAssiduite;
}) {
  const [statut, setStatut] = useState<StatutFilter>("all");
  const [matiereCode, setMatiereCode] = useState<string>("all");
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const c: Record<StatutFilter, number> = {
      all: historique.length,
      PRESENT: 0,
      RETARD: 0,
      JUSTIFIE: 0,
      ABSENT: 0,
    };
    historique.forEach((h) => {
      if (h.statut in c) c[h.statut as StatutPresence] += 1;
    });
    return c;
  }, [historique]);

  const filtered = useMemo(
    () =>
      historique.filter(
        (h) =>
          (statut === "all" || h.statut === statut) &&
          (matiereCode === "all" || h.seance.matiereCode === matiereCode)
      ),
    [historique, statut, matiereCode]
  );

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Répartition des heures (barre empilée)
  const total = stats.totalHeuresDispensées;
  const segments = [
    { key: "PRESENT" as const, heures: stats.totalHeuresPrésent },
    { key: "RETARD" as const, heures: stats.totalHeuresRetard },
    { key: "JUSTIFIE" as const, heures: stats.totalHeuresJustifie },
    { key: "ABSENT" as const, heures: stats.totalHeuresAbsent },
  ];
  const nonMarque = stats.totalHeuresNonMarque ?? 0;

  const formatLong = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-5">
      {/* Répartition globale */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-600" />
          Répartition de mes heures de cours
        </h3>
        {total === 0 ? (
          <p className="text-xs text-slate-400 mt-3">Aucune heure dispensée pour le moment.</p>
        ) : (
          <>
            <div
              className="mt-4 h-3 rounded-full bg-slate-100 overflow-hidden flex"
              role="img"
              aria-label="Répartition des heures par statut de présence"
            >
              {segments.map((s) =>
                s.heures > 0 ? (
                  <div
                    key={s.key}
                    className={`${STATUT_META[s.key].bar} h-full`}
                    style={{ width: `${(s.heures / total) * 100}%` }}
                    title={`${STATUT_META[s.key].label} : ${s.heures}h`}
                  />
                ) : null
              )}
              {nonMarque > 0 && (
                <div
                  className="bg-slate-300 h-full"
                  style={{ width: `${(nonMarque / total) * 100}%` }}
                  title={`En attente de pointage : ${nonMarque}h`}
                />
              )}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {segments.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className={`w-2 h-2 rounded-full ${STATUT_META[s.key].dot}`} />
                  {STATUT_META[s.key].label}
                  <span className="font-bold text-slate-900 tabular-nums">{s.heures}h</span>
                </li>
              ))}
              {nonMarque > 0 && (
                <li className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  En attente
                  <span className="font-bold text-slate-900 tabular-nums">{nonMarque}h</span>
                </li>
              )}
            </ul>
          </>
        )}
      </section>

      {/* Assiduité par matière */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-blue-600" />
          Assiduité par matière
        </h3>
        {matieres.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune matière." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matieres.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-blue-700 tracking-wide">{m.code}</p>
                    <p className="text-sm font-semibold text-slate-900 line-clamp-1" title={m.nom}>
                      {m.nom}
                    </p>
                  </div>
                  <span
                    className="text-sm font-extrabold tabular-nums shrink-0"
                    style={{ color: tauxColor(m.tauxPresence) }}
                  >
                    {m.tauxPresence !== null ? `${m.tauxPresence}%` : "—"}
                  </span>
                </div>
                <Progress
                  percent={m.tauxPresence ?? 0}
                  showInfo={false}
                  size="small"
                  strokeColor={tauxColor(m.tauxPresence)}
                  className="!mb-0 !mt-1"
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  {m.heuresDispensées > 0 ? (
                    <>
                      <span>Suivies : {m.heuresPrésent}h</span>
                      <span>Manquées : {m.heuresAbsent}h</span>
                    </>
                  ) : (
                    <span>Aucune heure dispensée</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Historique */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 space-y-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Historique des séances d&apos;émargement</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {filtered.length} séance(s) affichée(s) sur {historique.length}.
            </p>
          </div>
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="overflow-x-auto -mx-1 px-1">
              <Segmented<StatutFilter>
                value={statut}
                onChange={(v) => {
                  setStatut(v);
                  setPage(1);
                }}
                options={[
                  { label: `Toutes (${counts.all})`, value: "all" },
                  { label: `Présent (${counts.PRESENT})`, value: "PRESENT" },
                  { label: `Retard (${counts.RETARD})`, value: "RETARD" },
                  { label: `Justifié (${counts.JUSTIFIE})`, value: "JUSTIFIE" },
                  { label: `Absent (${counts.ABSENT})`, value: "ABSENT" },
                ]}
              />
            </div>
            <Select
              value={matiereCode}
              onChange={(v) => {
                setMatiereCode(v);
                setPage(1);
              }}
              className="w-full lg:w-72"
              aria-label="Filtrer par matière"
              options={[
                { value: "all", label: "Toutes les matières" },
                ...matieres.map((m) => ({ value: m.code, label: `${m.code} — ${m.nom}` })),
              ]}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                historique.length === 0
                  ? "Aucune séance émargée pour le moment."
                  : "Aucune séance ne correspond à ces filtres."
              }
            />
          </div>
        ) : (
          <>
            {/* Tableau ≥ md */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="px-5 py-3 whitespace-nowrap">Date</th>
                    <th className="px-3 py-3 whitespace-nowrap">Matière</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Durée</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Statut</th>
                    <th className="px-5 py-3 whitespace-nowrap">Remarque / justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((hp) => (
                    <tr key={hp.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3 font-medium text-slate-800 whitespace-nowrap">
                        {formatLong(hp.seance.date)}
                        {hp.seance.heureDebut && (
                          <span className="block text-[11px] text-slate-400">
                            {hp.seance.heureDebut} - {hp.seance.heureFin || ""}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-semibold text-slate-800">{hp.seance.matiereNom}</span>
                        <span className="block text-xs text-slate-500 line-clamp-1">
                          {hp.seance.description || hp.seance.matiereCode}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-700 text-xs">
                        {hp.seance.nombreHeures}h
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatutBadge statut={hp.statut} />
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 max-w-xs">
                        {hp.remarque || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cartes < md */}
            <ul className="md:hidden divide-y divide-slate-100">
              {pageItems.map((hp) => (
                <li key={hp.id} className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900">{hp.seance.matiereNom}</p>
                      <p className="text-xs text-slate-500">
                        {formatLong(hp.seance.date)} &bull; {hp.seance.nombreHeures}h
                        {hp.seance.heureDebut && ` • ${hp.seance.heureDebut}-${hp.seance.heureFin || ""}`}
                      </p>
                    </div>
                    <StatutBadge statut={hp.statut} />
                  </div>
                  {hp.remarque && (
                    <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{hp.remarque}</p>
                  )}
                </li>
              ))}
            </ul>

            {filtered.length > PAGE_SIZE && (
              <div className="px-5 py-4 border-t border-slate-100 flex justify-center sm:justify-end">
                <Pagination
                  current={page}
                  pageSize={PAGE_SIZE}
                  total={filtered.length}
                  onChange={setPage}
                  showSizeChanger={false}
                  size="small"
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
