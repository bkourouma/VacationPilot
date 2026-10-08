import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "present"
  | "absent"
  | "retard"
  | "justifie"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "neutral"
  | "admin"
  | "enseignant"
  | "chef";

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { badge: string; dot: string }> = {
  default: {
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-500",
  },
  present: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/10",
    dot: "bg-emerald-500",
  },
  absent: {
    badge: "bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/10",
    dot: "bg-rose-500",
  },
  retard: {
    badge: "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/10",
    dot: "bg-amber-500",
  },
  justifie: {
    badge: "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/10",
    dot: "bg-blue-500",
  },
  success: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/10",
    dot: "bg-emerald-500",
  },
  danger: {
    badge: "bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/10",
    dot: "bg-rose-500",
  },
  warning: {
    badge: "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/10",
    dot: "bg-amber-500",
  },
  info: {
    badge: "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/10",
    dot: "bg-blue-500",
  },
  neutral: {
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  admin: {
    badge: "bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/10",
    dot: "bg-purple-500",
  },
  enseignant: {
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/10",
    dot: "bg-indigo-500",
  },
  chef: {
    badge: "bg-cyan-50 text-cyan-700 border-cyan-200 ring-1 ring-cyan-500/10",
    dot: "bg-cyan-500",
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-[10px] px-2 py-0.5 gap-1",
  md: "text-xs px-2.5 py-1 gap-1.5",
  lg: "text-sm px-3 py-1.5 gap-2",
};

export function Badge({
  variant = "default",
  size = "md",
  dot = false,
  icon,
  children,
  className,
  ...props
}: BadgeProps) {
  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold rounded-full border transition-colors",
        styles.badge,
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full shrink-0", styles.dot)}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

/**
 * Helper to display standardized status badge based on presence status
 */
export function PresenceBadge({
  statut,
  size = "sm",
  dot = true,
  className,
}: {
  statut: "PRESENT" | "ABSENT" | "RETARD" | "JUSTIFIE" | string;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}) {
  switch (statut) {
    case "PRESENT":
      return (
        <Badge variant="present" size={size} dot={dot} className={className}>
          Présent
        </Badge>
      );
    case "ABSENT":
      return (
        <Badge variant="absent" size={size} dot={dot} className={className}>
          Absent
        </Badge>
      );
    case "RETARD":
      return (
        <Badge variant="retard" size={size} dot={dot} className={className}>
          Retard
        </Badge>
      );
    case "JUSTIFIE":
      return (
        <Badge variant="justifie" size={size} dot={dot} className={className}>
          Justifié
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size={size} dot={dot} className={className}>
          {statut}
        </Badge>
      );
  }
}
