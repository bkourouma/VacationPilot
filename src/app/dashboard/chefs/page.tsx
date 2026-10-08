"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  UserPlus,
  Trash2,
  Lock,
  User,
  AlertTriangle,
} from "lucide-react";

interface ChefItem {
  id: string;
  username: string;
  nom: string;
  classeId: string | null;
  classe: { id: string; code: string; nom: string } | null;
  createdAt: string;
}

interface ClasseItem {
  id: string;
  code: string;
  nom: string;
}

export default function ChefsClassePage() {
  const [chefs, setChefs] = useState<ChefItem[]>([]);
  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("ENSEIGNANT");

  // Formulaire d'ajout
  const [nom, setNom] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [classeId, setClasseId] = useState("");
  const [saving, setSaving] = useState(false);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resAuth, resChefs, resClasses] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/chefs"),
        fetch("/api/classes"),
      ]);

      const auth = await resAuth.json();
      const role = auth.user?.role || "ENSEIGNANT";
      setUserRole(role);

      if (role !== "ENSEIGNANT" && role !== "ADMINISTRATION") {
        setLoading(false);
        return;
      }

      const chefsData = await resChefs.json();
      const classesData = await resClasses.json();

      if (Array.isArray(chefsData)) setChefs(chefsData);
      if (Array.isArray(classesData)) {
        setClasses(classesData);
        if (classesData.length > 0 && !classeId) {
          setClasseId(classesData[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateChef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !nom || !password || !classeId) {
      setNotification({ type: "error", message: "Tous les champs sont requis." });
      return;
    }

    setSaving(true);
    setNotification(null);

    try {
      const res = await fetch("/api/chefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, nom, password, classeId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: "error", message: data.error || "Erreur lors de la création." });
        setSaving(false);
        return;
      }

      setNotification({
        type: "success",
        message: `Compte chef de classe "${nom}" créé avec succès ! Identifiant : ${username}`,
      });

      setNom("");
      setUsername("");
      setPassword("");
      await loadData();
    } catch {
      setNotification({ type: "error", message: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChef = async (id: string) => {
    if (!confirm("Voulez-vous vraiment révoquer ce compte de chef de classe ?")) return;

    try {
      const res = await fetch(`/api/chefs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotification({ type: "success", message: "Compte chef de classe révoqué." });
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (userRole !== "ENSEIGNANT" && userRole !== "ADMINISTRATION") {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12 shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Accès Restreint</h2>
        <p className="text-sm text-slate-600">
          Seul le corps professoral ou la direction peut nommer et gérer les comptes des chefs de classe.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Shield className="w-7 h-7 text-blue-600" />
          Désignation des Chefs de Classe
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Créez des accès pour vos délégués afin qu&apos;ils puissent pointer les présences (accès aux notes strictement verrouillé)
        </p>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100">
            &times;
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Formulaire de création */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Créer un compte Chef de classe
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Le chef de classe pourra se connecter depuis son smartphone ou PC pour faire l&apos;appel.
          </p>

          <form onSubmit={handleCreateChef} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Classe rattachée
              </label>
              <select
                value={classeId}
                onChange={(e) => setClasseId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nom complet du chef de classe
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ex: Kouamé Emmanuel"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Identifiant de connexion (login)
              </label>
              <input
                type="text"
                required
                placeholder="Ex: chef-lprigl"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white lowercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
              {saving ? "Création en cours..." : "Créer le compte Chef de classe"}
            </button>
          </form>
        </div>

        {/* Liste des chefs désignés */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Comptes Chefs de classe actifs ({chefs.length})
              </h3>
              <p className="text-xs text-slate-500">
                Liste des assistants autorisés à effectuer l&apos;appel
              </p>
            </div>
          </div>

          {chefs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              Aucun chef de classe désigné pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {chefs.map((c) => (
                <div
                  key={c.id}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition rounded-lg px-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {c.nom.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{c.nom}</h4>
                      <p className="text-[11px] text-slate-500">
                        Login : <strong className="font-mono text-slate-700">{c.username}</strong> &bull; Classe :{" "}
                        <span className="font-semibold text-blue-700">{c.classe?.code || "Non assignée"}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteChef(c.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                    title="Révoquer le compte"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
