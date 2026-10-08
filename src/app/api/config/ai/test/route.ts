import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { callOpenRouter, getAiConfig } from "@/lib/ai-config";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMINISTRATION" && session.role !== "ENSEIGNANT")) {
      return NextResponse.json(
        { error: "Action réservée aux enseignants ou à l'administration." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const requestedModel = body.model;

    const config = await getAiConfig();
    const modelToTest = requestedModel || config.model || "deepseek/deepseek-chat";

    const startTime = Date.now();
    const result = await callOpenRouter({
      model: modelToTest,
      messages: [
        {
          role: "system",
          content: "Tu es un assistant de test technique. Réponds en quelques mots uniquement.",
        },
        {
          role: "user",
          content: "Réponds exactement : 'Connexion OpenRouter opérationnelle !'",
        },
      ],
      maxTokens: 50,
      temperature: 0.1,
    });

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Connexion opérationnelle (${latencyMs}ms) - ${result.content.trim()}`,
      modelTested: modelToTest,
      modelUsed: result.modelUsed,
      response: result.content.trim(),
      latencyMs,
    });
  } catch (error: unknown) {
    console.error("Erreur test OpenRouter:", error);
    const errMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
