"use client";

import { CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";
import type { StatutPresence } from "./shared";

const STATUTS: {
  key: StatutPresence;
  label: string;
  short: string;
  title: string;
  Icon: typeof CheckCircle2;
  active: string;
  idle: string;
  iconIdle: string;
}[] = [
  {
    key: "PRESENT",
    label: "Présent",
    short: "P",
    title: "Marquer présent",
    Icon: CheckCircle2,
    active: "bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-700/20",
    idle: "text-slate-600 hover:text-emerald-700 hover:bg-white/80",
    iconIdle: "text-emerald-600",
  },
  {
    key: "RETARD",
    label: "Retard",
    short: "R",
    title: "Marquer en retard",
    Icon: Clock,
    active: "bg-amber-500 text-white shadow-xs ring-1 ring-amber-600/20",
    idle: "text-slate-600 hover:text-amber-700 hover:bg-white/80",
    iconIdle: "text-amber-600",
  },
  {
    key: "ABSENT",
    label: "Absent",
    short: "A",
    title: "Marquer absent",
    Icon: XCircle,
    active: "bg-rose-600 text-white shadow-xs ring-1 ring-rose-700/20",
    idle: "text-slate-600 hover:text-rose-700 hover:bg-white/80",
    iconIdle: "text-rose-600",
  },
  {
    key: "JUSTIFIE",
    label: "Justifié",
    short: "J",
    title: "Marquer absence justifiée",
    Icon: ShieldCheck,
    active: "bg-blue-600 text-white shadow-xs ring-1 ring-blue-700/20",
    idle: "text-slate-600 hover:text-blue-700 hover:bg-white/80",
    iconIdle: "text-blue-600",
  },
];

interface Props {
  value: StatutPresence;
  onChange: (statut: StatutPresence) => void;
  /** `full` : icône + libellé ; `compact` : initiales P / R / A / J */
  variant?: "full" | "compact";
  label?: string;
}

/** Sélecteur de statut de présence (un seul choix possible, accessible au clavier). */
export default function StatutPicker({ value, onChange, variant = "full", label }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label={label || "Statut d'émargement"}
      className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1"
    >
      {STATUTS.map(({ key, label: text, short, title, Icon, active, idle, iconIdle }) => {
        const isActive = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={text}
            title={title}
            onClick={() => onChange(key)}
            className={`rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              variant === "full" ? "px-3 py-1.5" : "w-8 h-8 font-extrabold"
            } ${isActive ? active : idle}`}
          >
            {variant === "full" ? (
              <>
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : iconIdle}`} />
                <span>{text}</span>
              </>
            ) : (
              short
            )}
          </button>
        );
      })}
    </div>
  );
}
