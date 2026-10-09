import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAiConfig, setAiConfig, CURATED_MODELS } from "@/lib/ai-config";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (session.role !== "ADMINISTRATION" && session.role !== "ENSEIGNANT") {
      return NextResponse.json(
        { error: "Accès réservé aux enseignants ou à l'administration." },
        { status: 403 }
      );
    }

    const config = await getAiConfig();

    return NextResponse.json({
      model: config.model,
      hasApiKey: config.hasApiKey,
      isConfiguredInEnv: config.isConfiguredInEnv,
      isConfiguredInDb: config.isConfiguredInDb,
      availableModels: CURATED_MODELS,
    });
  } catch (error) {
    console.error("Erreur GET /api/config/ai:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMINISTRATION" && session.role !== "ENSEIGNANT")) {
      return NextResponse.json(
        { error: "Action réservée aux enseignants ou à l'administration." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { model, apiKey } = body;

    const updated = await setAiConfig({
      model: typeof model === "string" ? model : undefined,
      apiKey: typeof apiKey === "string" ? apiKey : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Configuration IA mise à jour avec succès.",
      model: updated.model,
      hasApiKey: updated.hasApiKey,
    });
  } catch (error) {
    console.error("Erreur POST /api/config/ai:", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer la configuration IA." },
      { status: 500 }
    );
  }
}
