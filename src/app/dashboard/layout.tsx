"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  CalendarCheck,
  BookOpen,
  Users,
  Shield,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  UserCheck,
  TrendingUp,
  Building,
  Library,
  ListChecks,
  Clock,
  Sliders,
} from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  email?: string | null;
  image?: string | null;
  nom: string;
  role: "ADMINISTRATION" | "ENSEIGNANT" | "CHEF_CLASSE";
  classeId?: string | null;
  classe?: {
    id: string;
    nom: string;
    code: string;
  } | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/");
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = user.role === "ADMINISTRATION";
  const isTeacher = user.role === "ENSEIGNANT";
  const isStaff = isAdmin || isTeacher;

  const navigationSections = [
    {
      title: "Vue d'ensemble",
      items: [
        {
          name: isAdmin ? "Console Administration" : "Tableau de bord",
          href: "/dashboard",
          icon: LayoutDashboard,
          allowed: true,
        },
      ],
    },
    {
      title: "1. Paramétrage & Accès",
      items: [
        {
          name: "Configuration & IA",
          href: "/dashboard/config",
          icon: Sliders,
          allowed: isStaff,
        },
        {
          name: isAdmin ? "Gestion des Accès" : "Chefs de classe",
          href: "/dashboard/chefs",
          icon: Shield,
          allowed: isStaff,
        },
      ],
    },
    {
      title: "2. Structure Pédagogique",
      items: [
        {
          name: "Catalogue Matières",
          href: "/dashboard/matieres",
          icon: Library,
          allowed: isStaff,
        },
        {
          name: "Classes & Cours",
          href: "/dashboard/classes",
          icon: Building,
          allowed: true,
        },
        {
          name: "Étudiants",
          href: "/dashboard/etudiants",
          icon: Users,
          allowed: true,
        },
      ],
    },
    {
      title: "3. Déroulement des Cours",
      items: [
        {
          name: "Émargement & Présences",
          href: "/dashboard/presences",
          icon: CalendarCheck,
          allowed: true,
        },
        {
          name: "Progression des Cours",
          href: "/dashboard/progression",
          icon: ListChecks,
          allowed: isStaff,
        },
        {
          name: isAdmin ? "Consultation des Notes" : "Saisie des Notes",
          href: "/dashboard/notes",
          icon: BookOpen,
          allowed: isStaff,
          badge: isStaff ? undefined : "Réservé Enseignant",
        },
      ],
    },
    {
      title: "4. Pilotage & Clôture",
      items: [
        {
          name: "Suivi Global & Retards",
          href: "/dashboard/admin/progression",
          icon: TrendingUp,
          allowed: isStaff,
          badge: isAdmin ? "Consolidé" : undefined,
        },
        {
          name: "Exports & Rapports",
          href: "/dashboard/exports",
          icon: FileSpreadsheet,
          allowed: true,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Barre supérieure mobile */}
      <div className="md:hidden no-print bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-900 text-base">VacationPro</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Barre latérale desktop & mobile */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* En-tête Sidebar */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 text-white ${
            isAdmin ? "bg-amber-600 shadow-amber-500/20" : "bg-blue-600 shadow-blue-500/20"
          }`}>
            {isAdmin ? <Building className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="font-bold text-base tracking-tight text-white">
              VacationPro
            </h2>
            <span className="text-[11px] text-slate-400 block">
              {isAdmin ? "Direction Pédagogique" : "Espace Gestion"}
            </span>
          </div>
        </div>

        {/* Profil utilisateur connecté */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            {user.image ? (
              <img
                src={user.image}
                alt={user.nom}
                className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-700 ring-2 ring-blue-500/30"
              />
            ) : (
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white ${
                  isAdmin
                    ? "bg-amber-600"
                    : isTeacher
                    ? "bg-blue-600"
                    : "bg-indigo-600"
                }`}
              >
                {user.nom.charAt(0)}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-200 truncate">{user.nom}</p>
              {user.email && (
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              )}
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                  isAdmin
                    ? "bg-amber-900/60 text-amber-300 border border-amber-700/50"
                    : isTeacher
                    ? "bg-blue-900/60 text-blue-300 border border-blue-700/50"
                    : "bg-indigo-900/60 text-indigo-300 border border-indigo-700/50"
                }`}
              >
                {isAdmin ? (
                  <Building className="w-2.5 h-2.5" />
                ) : isTeacher ? (
                  <Shield className="w-2.5 h-2.5" />
                ) : (
                  <UserCheck className="w-2.5 h-2.5" />
                )}
                {isAdmin ? "Administration" : isTeacher ? "Enseignant" : "Chef de classe"}
              </span>
            </div>
          </div>
          {user.classe && (
            <p className="mt-2 text-[11px] text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded">
              Classe : <strong className="text-slate-300">{user.classe.code}</strong>
            </p>
          )}
        </div>

        {/* Liens de navigation par ordre d'exécution */}
        <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
          {navigationSections.map((section, sIdx) => {
            const visibleItems = section.items.filter((item) => item.allowed);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title || sIdx} className="space-y-1">
                {section.title && (
                  <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </div>
                )}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm font-semibold"
                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Pied de sidebar : déconnexion */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
