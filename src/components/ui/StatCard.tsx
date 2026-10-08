import React from "react";
import { cn } from "@/lib/utils";

export type StatCardColor =
  | "blue"
  | "emerald"
  | "rose"
  | "amber"
  | "indigo"
  | "purple"
  | "slate";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  color?: StatCardColor;
  description?: string;
  trend?: {
    value: string | number;
    label?: string;
    isPositive?: boolean;
  };
  badge?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const colorStyles: Record<
  StatCardColor,
  {
    iconBg: string;
    iconText: string;
    borderAccent?: string;
  }
> = {
  blue: {
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    borderAccent: "group-hover:border-blue-300",
  },
  emerald: {
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    borderAccent: "group-hover:border-emerald-300",
  },
  rose: {
    iconBg: "bg-rose-50",
    iconText: "text-rose-600",
    borderAccent: "group-hover:border-rose-300",
  },
  amber: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    borderAccent: "group-hover:border-amber-300",
  },
  indigo: {
    iconBg: "bg-indigo-50",
    iconText: "text-indigo-600",
    borderAccent: "group-hover:border-indigo-300",
  },
  purple: {
    iconBg: "bg-purple-50",
    iconText: "text-purple-600",
    borderAccent: "group-hover:border-purple-300",
  },
  slate: {
    iconBg: "bg-slate-100",
    iconText: "text-slate-600",
    borderAccent: "group-hover:border-slate-300",
  },
};

export function StatCard({
  label,
  value,
  icon,
  color = "blue",
  description,
  trend,
  badge,
  className,
  onClick,
}: StatCardProps) {
  const styles = colorStyles[color] || colorStyles.blue;
  const isClickable = Boolean(onClick);

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = icon as React.ComponentType<{ className?: string }>;
    return <IconComponent className={cn("w-5 h-5", styles.iconText)} />;
  };

  return (
    <div
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "group relative bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs transition-all duration-200",
        isClickable && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        styles.borderAccent,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {value}
            </span>
            {badge && <div>{badge}</div>}
          </div>
        </div>

        {icon && (
          <div
            className={cn(
              "p-3 rounded-xl border border-slate-100/80 shadow-2xs shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105",
              styles.iconBg
            )}
          >
            {renderIcon()}
          </div>
        )}
      </div>

      {(description || trend) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          {description && <span>{description}</span>}
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-bold ml-auto",
                trend.isPositive !== undefined
                  ? trend.isPositive
                    ? "text-emerald-600"
                    : "text-rose-600"
                  : "text-slate-600"
              )}
            >
              {trend.isPositive !== undefined && (trend.isPositive ? "↑" : "↓")}
              {trend.value}
              {trend.label && (
                <span className="text-slate-400 font-normal ml-0.5">
                  {trend.label}
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
