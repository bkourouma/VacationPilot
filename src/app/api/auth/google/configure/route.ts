import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const { clientId, clientSecret } = await request.json();

    if (!clientId?.trim() || !clientSecret?.trim()) {
      return NextResponse.json(
        { error: "Le Client ID et le Client Secret sont requis." },
        { status: 400 }
      );
    }

    const trimmedClientId = clientId.trim();
    const trimmedSecret = clientSecret.trim();

    // Protection injection : interdiction des sauts de ligne et caractères d'échappement
    if (/[\r\n\0]/.test(trimmedClientId) || /[\r\n\0]/.test(trimmedSecret)) {
      return NextResponse.json(
        { error: "Les identifiants ne doivent pas contenir de caractères de saut de ligne." },
        { status: 400 }
      );
    }

    // Validation du format Client ID Google
    if (!trimmedClientId.includes(".apps.googleusercontent.com") && !trimmedClientId.includes("google")) {
      return NextResponse.json(
        { error: "Le Client ID Google doit être un identifiant valide (ex: xxxx.apps.googleusercontent.com)." },
        { status: 400 }
      );
    }

    // Mettre à jour les variables d'environnement en cours d'exécution
    process.env.GOOGLE_CLIENT_ID = trimmedClientId;
    process.env.GOOGLE_CLIENT_SECRET = trimmedSecret;
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = trimmedClientId;

    // Mettre à jour le fichier .env sur disque
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    const updateEnvVar = (content: string, key: string, value: string) => {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(content)) {
        return content.replace(regex, `${key}="${value}"`);
      } else {
        return `${content.trim()}\n${key}="${value}"\n`;
      }
    };

    let updated = updateEnvVar(envContent, "GOOGLE_CLIENT_ID", trimmedClientId);
    updated = updateEnvVar(updated, "GOOGLE_CLIENT_SECRET", trimmedSecret);
    updated = updateEnvVar(updated, "NEXT_PUBLIC_GOOGLE_CLIENT_ID", trimmedClientId);

    fs.writeFileSync(envPath, updated, "utf-8");

    return NextResponse.json({
      success: true,
      message: "Configuration Google OAuth enregistrée avec succès !",
      configured: true,
      redirectUri: `${process.env.APP_URL || "http://localhost:3600"}/api/auth/google/callback`,
    });
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la configuration Google OAuth:", error);
    return NextResponse.json(
      { error: "Impossible de sauvegarder la configuration." },
      { status: 500 }
    );
  }
}
