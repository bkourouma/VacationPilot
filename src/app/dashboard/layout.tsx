"use client";

import { useEffect, useRef, useState } from "react";
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
  Sliders,
  ChevronDown,
  Mail,
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
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

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

  // Un chef de classe ne doit pas ouvrir les pages réservées au personnel,
  // même en saisissant l'adresse à la main.
  useEffect(() => {
    if (user?.role !== "CHEF_CLASSE") return;
    const pagesInterdites = [
      "/dashboard/config",
      "/dashboard/matieres",
      "/dashboard/progression",
      "/dashboard/admin/progression",
    ];
    if (pagesInterdites.includes(pathname)) {
      router.replace("/dashboard");
    }
  }, [user, pathname, router]);

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

  const roleLabel = isAdmin ? "Administration" : isTeacher ? "Enseignant" : "Chef de classe";
  const RoleIcon = isAdmin ? Building : isTeacher ? Shield : UserCheck;
  const roleStyle = isAdmin
    ? {
        bg: "bg-amber-600",
        text: "text-amber-600",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        banner: "from-amber-500 to-orange-400",
      }
    : isTeacher
    ? {
        bg: "bg-blue-600",
        text: "text-blue-600",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        banner: "from-blue-600 to-sky-400",
      }
    : {
        bg: "bg-indigo-600",
        text: "text-indigo-600",
        badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
        banner: "from-indigo-600 to-violet-400",
      };

  const currentPage = navigationSections
    .flatMap((s) => s.items)
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const avatar = user.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.image}
      alt={user.nom}
      className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
    />
  ) : (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white shadow-sm ${roleStyle.bg}`}
    >
      {user.nom.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Barre latérale desktop & mobile */}
      {mobileMenuOpen && (
        <div
          className="md:hidden no-print fixed inset-0 z-40 bg-slate-900/50"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-slate-900 text-white flex flex-col overflow-hidden transition-transform duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:self-start md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* En-tête Sidebar */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3 shrink-0">
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

        {/* Liens de navigation par ordre d'exécution */}
        <nav className="flex-1 min-h-0 p-3 space-y-3 overflow-y-auto">
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
        <div className="p-3 border-t border-slate-800 shrink-0">
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
        {/* En-tête commun à toutes les pages */}
        <header className="no-print sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-16">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Ouvrir le menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                  VacationPro
                </p>
                <p className="text-base sm:text-lg font-bold text-slate-900 truncate leading-tight mt-1">
                  {currentPage?.name ?? "Tableau de bord"}
                </p>
              </div>
            </div>

            {/* Carte profil */}
            <div className="relative shrink-0" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                className={`flex items-center gap-3 pl-1.5 pr-3 py-1.5 rounded-full border bg-white shadow-sm transition hover:shadow-md ${
                  profileOpen ? "border-slate-300 shadow-md" : "border-slate-200"
                }`}
              >
                {avatar}
                <div className="hidden sm:block text-left leading-tight max-w-[200px]">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user.nom}</p>
                  <p className={`text-[11px] font-medium ${roleStyle.text}`}>{roleLabel}</p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${profileOpen ? "rotate-180" : ""}`}
                />
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 overflow-hidden"
                >
                  <div className={`h-14 bg-gradient-to-r ${roleStyle.banner}`} />
                  <div className="px-4 pb-4 -mt-7">
                    <div className="ring-4 ring-white rounded-full w-fit">{avatar}</div>
                    <p className="mt-2 text-sm font-bold text-slate-900 truncate">{user.nom}</p>
                    {user.email && (
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 min-w-0">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${roleStyle.badge}`}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {roleLabel}
                      </span>
                      {user.classe && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Classe : {user.classe.code}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-slate-100 p-2">
                    <button
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
