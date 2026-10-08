import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import * as mammoth from "mammoth";
import { getAiConfig, callOpenRouter } from "@/lib/ai-config";

// Analyseur heuristique de secours si aucune clé IA n'est fournie ou en cas d'erreur API
function parseChaptersHeuristically(text: string): Array<{
  numero: number;
  titre: string;
  description: string | null;
  sousChapitres: string[];
}> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: Array<{
    numero: number;
    titre: string;
    description: string | null;
    sousChapitres: string[];
  }> = [];
  const chapterRegex = /^(?:chapitre|module|partie|thème|seance|séance|section)\s*([0-9IVXLCDM]+)\s*[:.\-–—]?\s*(.*)$/i;
  const numberedTitleRegex = /^([0-9]{1,2}|[IVXLCDM]{1,4})\s*[:.\-–—]\s*([A-ZÀ-Ÿ].*)$/;
  const subChapterRegex = /^(?:[-*•–—]|(?:[0-9]{1,2}\.[0-9]{1,2})|[a-z]\))\s*(.*)$/i;

  let currentChapter: {
    numero: number;
    titre: string;
    descriptions: string[];
    sousChapitres: string[];
  } | null = null;
  let count = 0;

  for (const line of lines) {
    const matchChap = line.match(chapterRegex);
    const matchNum = !matchChap ? line.match(numberedTitleRegex) : null;
    const matchSub = line.match(subChapterRegex);

    if (matchChap) {
      if (currentChapter) {
        results.push({
          numero: currentChapter.numero,
          titre: currentChapter.titre,
          description: currentChapter.descriptions.length > 0 ? currentChapter.descriptions.join(". ") : null,
          sousChapitres: currentChapter.sousChapitres,
        });
      }
      count++;
      currentChapter = {
        numero: count,
        titre: `Chapitre ${matchChap[1]} : ${matchChap[2].trim() || "Sans titre"}`,
        descriptions: [],
        sousChapitres: [],
      };
    } else if (matchNum && line.length < 120) {
      if (currentChapter) {
        results.push({
          numero: currentChapter.numero,
          titre: currentChapter.titre,
          description: currentChapter.descriptions.length > 0 ? currentChapter.descriptions.join(". ") : null,
          sousChapitres: currentChapter.sousChapitres,
        });
      }
      count++;
      currentChapter = {
        numero: count,
        titre: `Chapitre ${count} : ${matchNum[2].trim()}`,
        descriptions: [],
        sousChapitres: [],
      };
    } else if (currentChapter && matchSub && matchSub[1].trim().length > 3) {
      currentChapter.sousChapitres.push(matchSub[1].trim());
    } else if (currentChapter && line.length > 10 && currentChapter.descriptions.length < 3) {
      currentChapter.descriptions.push(line);
    }
  }

  if (currentChapter) {
    results.push({
      numero: currentChapter.numero,
      titre: currentChapter.titre,
      description: currentChapter.descriptions.length > 0 ? currentChapter.descriptions.join(". ") : null,
      sousChapitres: currentChapter.sousChapitres,
    });
  }

  return results;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json(
        { error: "Action réservée aux enseignants ou à l'administration." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userApiKey = (formData.get("apiKey") as string | null)?.trim();

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier Word fourni." }, { status: 400 });
    }

    const fileName = file.name || "";
    if (!fileName.toLowerCase().endsWith(".docx")) {
      return NextResponse.json(
        { error: "Format non supporté. Veuillez importer un document Word au format .docx." },
        { status: 400 }
      );
    }

    // Extraction du texte brut via mammoth
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value || "";

    if (rawText.trim().length < 20) {
      return NextResponse.json(
        { error: "Le document Word semble vide ou ne contient aucun texte exploitable." },
        { status: 400 }
      );
    }

    const config = await getAiConfig();
    const modelParam = (formData.get("model") as string | null)?.trim();
    const modelToUse = modelParam || config.model || "deepseek/deepseek-chat";

    // Si une clé OpenRouter est configurée, appel à OpenRouter
    if (config.hasApiKey) {
      try {
        const result = await callOpenRouter({
          model: modelToUse,
          messages: [
            {
              role: "system",
              content: `Tu es un assistant pédagogique universitaire expert.
Analyse le document Word fourni (plan de cours, syllabus, programme d'études, progression).
Extrais la liste ordonnée des chapitres ou modules d'enseignement ainsi que leurs SOUS-CHAPITRES / points clés associés.
Ignore totalement les introductions administratives, coordonnées, objectifs généraux d'école, bibliographies, barèmes de notation.

Pour chaque chapitre ou module :
- "numero": entier séquentiel (1, 2, 3...)
- "titre": intitulé clair, concis et formatté (ex: "Chapitre 1 : Introduction et Fondations")
- "description": résumé des notions clés, concepts abordés ou compétences (1 à 2 phrases concises)
- "sousChapitres": tableau de chaînes de caractères listant les sous-chapitres ou sections détaillées (ex: ["Découvrir NumPy", "Les bases de l'algèbre linéaire"]) ou tableau vide [] s'il n'y a pas de sous-parties.

Réponds STRICTEMENT avec un tableau JSON valide au format exact :
[
  {
    "numero": 1,
    "titre": "Nom du chapitre",
    "description": "Notions abordées...",
    "sousChapitres": ["Sous-chapitre 1", "Sous-chapitre 2"]
  }
]
Ne produis aucun texte avant ou après le JSON. Réponds en pur JSON.`,
            },
            {
              role: "user",
              content: `Texte extrait du document Word (${fileName}) :\n\n${rawText.slice(0, 18000)}`,
            },
          ],
          temperature: 0.1,
          maxTokens: 3000,
        });

        let content = result.content.trim();

        // Nettoyage markdown éventuel ```json ... ```
        if (content.startsWith("```")) {
          content = content.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
        }

        try {
          const parsedChapitres = JSON.parse(content);
          if (Array.isArray(parsedChapitres) && parsedChapitres.length > 0) {
            interface RawChapitre {
              numero?: number;
              titre?: string;
              description?: string | null;
              sousChapitres?: Array<string | { titre?: string }>;
            }
            const formatted = (parsedChapitres as RawChapitre[]).map((c, idx) => ({
              numero: c.numero || idx + 1,
              titre: String(c.titre || `Chapitre ${idx + 1}`).trim(),
              description: c.description ? String(c.description).trim() : null,
              ordre: idx + 1,
              sousChapitres: Array.isArray(c.sousChapitres)
                ? c.sousChapitres
                    .map((s) => (typeof s === "string" ? s : s?.titre || ""))
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length > 0)
                : [],
            }));

            return NextResponse.json({
              success: true,
              method: "openrouter",
              modelUsed: result.modelUsed,
              message: `L'IA OpenRouter (${result.modelUsed}) a extrait avec succès ${formatted.length} chapitre(s) et leurs sous-chapitres de votre document.`,
              chapitres: formatted,
              totalLinesAnalyzed: rawText.split("\n").length,
            });
          }
        } catch (jsonErr) {
          console.warn("Échec parsing JSON OpenRouter, bascule sur heuristique:", jsonErr, content);
        }
      } catch (aiErr: unknown) {
        const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
        console.warn("Erreur réseau appel OpenRouter:", msg);
      }
    }

    // Fallback : Détection heuristique / regex
    const heuristicResults = parseChaptersHeuristically(rawText);

    if (heuristicResults.length > 0) {
      const formatted = heuristicResults.map((c, idx) => ({
        ...c,
        ordre: idx + 1,
      }));

      return NextResponse.json({
        success: true,
        method: "heuristic",
        message: config.hasApiKey
          ? `Extraction heuristique locale réussie (le modèle ${modelToUse} n'a pas répondu au format attendu).`
          : "Extraction automatique locale réussie. Pour bénéficier de l'IA (OpenRouter), configurez votre clé OPENROUTER_API_KEY dans le menu de configuration ou le fichier .env.",
        chapitres: formatted,
        totalLinesAnalyzed: rawText.split("\n").length,
      });
    }

    return NextResponse.json(
      {
        error:
          "Impossible de repérer automatiquement les chapitres dans ce document. Veuillez saisir les chapitres manuellement ou vérifier le format du document Word.",
      },
      { status: 422 }
    );
  } catch (error) {
    console.error("Erreur extraction chapitres IA:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la lecture du document Word." },
      { status: 500 }
    );
  }
}
