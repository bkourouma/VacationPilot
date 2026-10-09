"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Form, Input } from "antd";
import { Check, Copy, ExternalLink, Key, Lock, Save, ShieldCheck } from "lucide-react";

interface GoogleStatus {
  configured: boolean;
  clientIdMasked: string | null;
  redirectUri: string;
}

interface FormValues {
  clientId: string;
  clientSecret: string;
}

const labelClass = "text-xs font-bold text-slate-700";

/**
 * Configuration de la connexion Google OAuth.
 * Réservée à l'administration : l'API refuse toute écriture sans session ADMINISTRATION
 * (et en production, où les clés se définissent par variables d'environnement).
 */
export default function GoogleOAuthCard() {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/google/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      /* statut indisponible : la carte reste utilisable */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.user?.role === "ADMINISTRATION") {
          setIsAdmin(true);
          loadStatus();
        }
      } catch {
        /* non administrateur ou hors ligne : la carte reste masquée */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStatus]);

  if (!isAdmin) return null;

  const redirectUri = status?.redirectUri ?? "http://localhost:3600/api/auth/google/callback";

  const copyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.info("Copie indisponible : sélectionnez l'adresse manuellement.");
    }
  };

  const save = async (values: FormValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/google/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: values.clientId.trim(),
          clientSecret: values.clientSecret.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        message.error(data.error || "Impossible d'enregistrer la configuration Google.");
        return;
      }
      message.success("Configuration Google enregistrée.");
      form.resetFields();
      await loadStatus();
    } catch {
      message.error("Erreur réseau lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </span>
        <div>
          <h2 className="font-bold text-sm text-slate-900">Connexion Google des enseignants (OAuth 2.0)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Réservé à l&apos;administration. Ces clés permettent aux enseignants de se connecter avec leur compte Google.
          </p>
        </div>
      </div>

      <Alert
        type={status?.configured ? "success" : "warning"}
        showIcon
        className="!mb-4"
        title={
          status?.configured
            ? `Google OAuth configuré (${status.clientIdMasked})`
            : "Google OAuth non configuré"
        }
      />

      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs text-slate-600 mb-5">
        <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
          <li>
            Ouvrez la{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-0.5"
            >
              Google Cloud Console <ExternalLink className="w-3 h-3" />
            </a>{" "}
            et créez un <strong>ID client OAuth 2.0</strong> (type : <em>Application Web</em>).
          </li>
          <li>
            Dans <strong>URI de redirection autorisés</strong>, renseignez l&apos;adresse exacte ci-dessous.
          </li>
        </ol>
        <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1.5">
          <code className="text-[10px] text-blue-900 font-mono flex-1 truncate px-1">{redirectUri}</code>
          <Button
            size="small"
            onClick={copyRedirectUri}
            icon={copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            className="!text-[10px] !font-semibold"
          >
            {copied ? "Copié !" : "Copier"}
          </Button>
        </div>
        <p className="text-[11px]">
          3. Collez ensuite l&apos;<strong>ID client</strong> et le <strong>secret</strong> ci-dessous.
        </p>
      </div>

      <Form
        form={form}
        name="google_oauth_form"
        layout="vertical"
        requiredMark={false}
        autoComplete="off"
        onFinish={save}
      >
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Form.Item
            label={<span className={labelClass}>Google Client ID</span>}
            name="clientId"
            rules={[
              { required: true, whitespace: true, message: "Renseignez le Client ID." },
              {
                pattern: /^[\w-]+(\.[\w-]+)*\.apps\.googleusercontent\.com$/,
                message: "Format attendu : xxxx.apps.googleusercontent.com",
              },
            ]}
          >
            <Input
              prefix={<Key className="w-4 h-4 text-slate-400" />}
              placeholder="123456789-xxxx.apps.googleusercontent.com"
              className="!font-mono !text-xs"
            />
          </Form.Item>
          <Form.Item
            label={<span className={labelClass}>Google Client Secret</span>}
            name="clientSecret"
            rules={[{ required: true, whitespace: true, message: "Renseignez le Client Secret." }]}
          >
            <Input.Password
              prefix={<Lock className="w-4 h-4 text-slate-400" />}
              placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
              autoComplete="new-password"
              className="!font-mono !text-xs"
            />
          </Form.Item>
        </div>
        <div className="flex justify-end">
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            icon={!saving ? <Save className="w-4 h-4" /> : undefined}
            className="!text-xs !font-bold"
          >
            Enregistrer la configuration Google
          </Button>
        </div>
      </Form>
    </section>
  );
}
