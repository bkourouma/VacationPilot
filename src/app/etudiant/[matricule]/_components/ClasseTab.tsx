"use client";

import { useMemo, useState } from "react";
import { Alert, Empty, Input, Pagination, Progress } from "antd";
import { Search, Trophy, Users } from "lucide-react";
import { CamaradeData, tauxColor } from "./types";

const PAGE_SIZE = 15;

interface Props {
  camarades: CamaradeData[];
  classeCode: string;
  monMatricule: string;
}

export default function ClasseTab({ camarades, classeCode, monMatricule }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Classement par taux d'assiduité (égalités = même rang)
  const ranked = useMemo(() => {
    const sorted = [...camarades].sort((a, b) => (b.taux ?? -1) - (a.taux ?? -1));
    return sorted.map((c) => ({
      ...c,
      rang: c.taux === null ? null : 1 + camarades.filter((o) => (o.taux ?? -1) > (c.taux as number)).length,
      isMoi: !!c.isMe || c.matricule === monMatricule,
    }));
  }, [camarades, monMatricule]);

  const masque = camarades.some((c) => !c.isMe && c.matricule.startsWith("AUD-"));
  const moi = ranked.find((c) => c.isMoi);
  const avecTaux = ranked.filter((c) => c.taux !== null);
  const moyenneClasse =
    avecTaux.length > 0
      ? Math.round(avecTaux.reduce((s, c) => s + (c.taux as number), 0) / avecTaux.length)
      : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ranked;
    return ranked.filter((c) => `${c.matricule} ${c.nom} ${c.prenom}`.toLowerCase().includes(q));
  }, [ranked, search]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Mon rang (assiduité)</p>
            <p className="text-lg font-extrabold text-slate-900 tabular-nums">
              {moi?.rang ? `${moi.rang}${moi.rang === 1 ? "er" : "e"}` : "—"}
              <span className="text-xs font-semibold text-slate-400"> / {camarades.length}</span>
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Moyenne de la classe</p>
            <p className="text-lg font-extrabold text-slate-900 tabular-nums">
              {moyenneClasse !== null ? `${moyenneClasse}%` : "—"}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Mon assiduité</p>
          <p
            className="text-lg font-extrabold tabular-nums"
            style={{ color: tauxColor(moi?.taux ?? null) }}
          >
            {moi?.taux != null ? `${moi.taux}%` : "—"}
            {moi?.taux != null && moyenneClasse !== null && (
              <span className="ml-2 text-xs font-semibold text-slate-500">
                ({moi.taux - moyenneClasse >= 0 ? "+" : ""}
                {moi.taux - moyenneClasse} pt vs classe)
              </span>
            )}
          </p>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Assiduité de la promotion ({classeCode})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {camarades.length} auditeur(s) inscrit(s), classés par taux de présence.
              </p>
            </div>
            <Input
              allowClear
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              prefix={<Search className="w-3.5 h-3.5 text-slate-400" />}
              placeholder="Rechercher un auditeur…"
              className="sm:!w-64"
              aria-label="Rechercher un auditeur"
            />
          </div>
          {masque && (
            <Alert
              type="info"
              showIcon
              title="Les identités de vos camarades sont masquées. Seule votre ligne est nominative."
              className="!text-xs"
            />
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="p-10">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucun auditeur trouvé." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="px-5 py-3 w-16 whitespace-nowrap">Rang</th>
                    <th className="px-3 py-3 whitespace-nowrap">Matricule</th>
                    <th className="px-3 py-3 whitespace-nowrap">Nom &amp; prénom</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Heures présentes</th>
                    <th className="px-5 py-3 w-56 whitespace-nowrap">Assiduité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((c) => (
                    <tr
                      key={c.matricule}
                      className={c.isMoi ? "bg-blue-50/70" : "hover:bg-slate-50/60 transition"}
                    >
                      <td className="px-5 py-3 text-xs font-bold text-slate-500 tabular-nums">
                        {c.rang ?? "—"}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">
                        {c.matricule}
                        {c.isMoi && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-sans font-bold">
                            Moi
                          </span>
                        )}
                      </td>
                      <td className={`px-3 py-3 ${c.isMoi ? "font-bold text-slate-900" : "text-slate-700"}`}>
                        {c.nom} {c.prenom}
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-slate-600 font-medium tabular-nums">
                        {c.heuresPresentes}h
                      </td>
                      <td className="px-5 py-3">
                        {c.taux !== null ? (
                          <div className="flex items-center gap-2">
                            <Progress
                              percent={c.taux}
                              showInfo={false}
                              size="small"
                              strokeColor={tauxColor(c.taux)}
                              className="!mb-0 flex-1"
                            />
                            <span
                              className="w-10 text-right text-xs font-bold tabular-nums"
                              style={{ color: tauxColor(c.taux) }}
                            >
                              {c.taux}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
