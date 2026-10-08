import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMINISTRATION" && session.role !== "ENSEIGNANT")) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filterClasseId = searchParams.get("classeId");
    const filterEnseignantId = searchParams.get("enseignantId");

    // Récupérer toutes les classes avec leurs cours, séances, présences, évaluations et chapitres
    const classes = await prisma.classe.findMany({
      where: filterClasseId ? { id: filterClasseId } : {},
      include: {
        _count: {
          select: { etudiants: true },
        },
        cours: {
          where: filterEnseignantId ? { enseignantId: filterEnseignantId } : {},
          include: {
            matiere: {
              include: {
                chapitres: {
                  orderBy: { ordre: "asc" },
                },
              },
            },
            enseignant: {
              select: { id: true, nom: true, email: true, username: true },
            },
            chapitreValidations: {
              where: { valide: true },
            },
            seances: {
              include: {
                presences: {
                  select: { statut: true },
                },
              },
              orderBy: { date: "asc" },
            },
            evaluations: {
              include: {
                notes: {
                  select: { valeur: true },
                },
              },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    const now = new Date();

    let totalVolumePrevu = 0;
    let totalHeuresEffectuees = 0;
    let matieresEnRetardCount = 0;
    let matieresTermineesCount = 0;
    let matieresEnCoursCount = 0;
    let matieresNonDemarreesCount = 0;
    let totalPresencesAll = 0;
    let totalPresentsAll = 0;
    let totalRetardsAll = 0;
    let totalChapitresAll = 0;
    let totalChapitresValidesAll = 0;

    const alertesGlobales: {
      type: "URGENT" | "ATTENTION" | "INFO";
      matiereNom: string;
      matiereCode: string;
      classeCode: string;
      enseignantNom: string;
      message: string;
    }[] = [];

    const processedClasses = classes.map((classe) => {
      const processedMatieres = classe.cours.map((c) => {
        const volumeHoraire = c.volumeHoraire || 20.0;
        const heuresEffectuees = c.seances.reduce(
          (acc, s) => acc + (s.nombreHeures || 0),
          0
        );
        const heuresRestantes = Math.max(0, volumeHoraire - heuresEffectuees);
        const progressionPct =
          volumeHoraire > 0
            ? Math.min(100, Math.round((heuresEffectuees / volumeHoraire) * 100))
            : 0;

        totalVolumePrevu += volumeHoraire;
        totalHeuresEffectuees += heuresEffectuees;

        // Chapitres et progression pédagogique
        const totalChapitres = c.matiere.chapitres.length;
        const chapitresValides = c.chapitreValidations.length;
        const progressionPedagogiquePct =
          totalChapitres > 0
            ? Math.min(100, Math.round((chapitresValides / totalChapitres) * 100))
            : 0;

        totalChapitresAll += totalChapitres;
        totalChapitresValidesAll += chapitresValides;

        // Statistiques d'assiduité sur cette matière
        let presencesCount = 0;
        let presentsCount = 0;
        let absentsCount = 0;
        let retardsCount = 0;
        let justifiesCount = 0;

        c.seances.forEach((s) => {
          s.presences.forEach((p) => {
            presencesCount++;
            if (p.statut === "PRESENT") presentsCount++;
            else if (p.statut === "ABSENT") absentsCount++;
            else if (p.statut === "RETARD") retardsCount++;
            else if (p.statut === "JUSTIFIE") justifiesCount++;
          });
        });

        totalPresencesAll += presencesCount;
        totalPresentsAll += presentsCount;
        totalRetardsAll += retardsCount;

        const tauxAssiduite =
          presencesCount > 0
            ? Math.round(((presentsCount + retardsCount) / presencesCount) * 100)
            : 100;

        // Statistiques des notes
        let totalNotesCount = 0;
        let sumNotes = 0;
        c.evaluations.forEach((ev) => {
          ev.notes.forEach((n) => {
            totalNotesCount++;
            sumNotes += n.valeur;
          });
        });
        const moyenneGenerale =
          totalNotesCount > 0
            ? Math.round((sumNotes / totalNotesCount) * 10) / 10
            : null;

        // Dernière séance
        const lastSeance =
          c.seances.length > 0 ? c.seances[c.seances.length - 1] : null;
        const derniereSeanceDate = lastSeance ? lastSeance.date : null;
        let joursDepuisDerniereSeance: number | null = null;
        if (derniereSeanceDate) {
          const diffMs = now.getTime() - new Date(derniereSeanceDate).getTime();
          joursDepuisDerniereSeance = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }

        // Détection des alertes et retards
        const alertes: string[] = [];
        let statut: "NON_DEMARRE" | "EN_COURS" | "TERMINE" = "EN_COURS";

        if (heuresEffectuees === 0) {
          statut = "NON_DEMARRE";
          matieresNonDemarreesCount++;
          alertes.push("Cours non démarré : aucune séance enregistrée.");
          alertesGlobales.push({
            type: "INFO",
            matiereNom: c.matiere.nom,
            matiereCode: c.matiere.code,
            classeCode: classe.code,
            enseignantNom: c.enseignant?.nom || "Non assigné",
            message: "Le cours n'a pas encore démarré.",
          });
        } else if (heuresEffectuees >= volumeHoraire) {
          statut = "TERMINE";
          matieresTermineesCount++;
        } else {
          statut = "EN_COURS";
          matieresEnCoursCount++;

          if (joursDepuisDerniereSeance !== null && joursDepuisDerniereSeance > 14) {
            matieresEnRetardCount++;
            alertes.push(
              `Retard potentiel : Aucune séance depuis ${joursDepuisDerniereSeance} jours.`
            );
            alertesGlobales.push({
              type: "URGENT",
              matiereNom: c.matiere.nom,
              matiereCode: c.matiere.code,
              classeCode: classe.code,
              enseignantNom: c.enseignant?.nom || "Non assigné",
              message: `Retard : Inactif depuis ${joursDepuisDerniereSeance} jours (${heuresEffectuees}h/${volumeHoraire}h faites).`,
            });
          }

          if (progressionPct >= 50 && c.evaluations.length === 0) {
            alertes.push(
              "Retard d'évaluation : > 50% du volume horaire réalisé sans aucune note saisie."
            );
            alertesGlobales.push({
              type: "ATTENTION",
              matiereNom: c.matiere.nom,
              matiereCode: c.matiere.code,
              classeCode: classe.code,
              enseignantNom: c.enseignant?.nom || "Non assigné",
              message:
                "Retard évaluation : Déjà 50% du cours effectué sans aucun devoir ou note.",
            });
          }

          // Alerte décalage pédagogique vs volume horaire
          if (totalChapitres > 0 && progressionPct >= 60 && progressionPedagogiquePct < 30) {
            alertes.push(
              `Décalage pédagogique : ${progressionPct}% du temps écoulé mais seulement ${progressionPedagogiquePct}% des chapitres validés.`
            );
          }
        }

        // Alerte étudiant retards
        const pctRetards =
          presencesCount > 0 ? (retardsCount / presencesCount) * 100 : 0;
        if (pctRetards > 20) {
          alertes.push(
            `Assiduité : Taux élevé d'étudiants en retard (${Math.round(pctRetards)}%).`
          );
        }

        if (!c.enseignant) {
          alertes.push("Aucun enseignant responsable assigné à ce cours.");
        }

        return {
          id: c.id,
          coursId: c.id,
          matiereId: c.matiereId,
          code: c.matiere.code,
          nom: c.matiere.nom,
          coefficient: c.coefficient,
          volumeHoraire,
          heuresEffectuees,
          heuresRestantes,
          progressionPct,
          statut,
          totalChapitres,
          chapitresValides,
          progressionPedagogiquePct,
          totalSeances: c.seances.length,
          derniereSeanceDate,
          joursDepuisDerniereSeance,
          presencesCount,
          presentsCount,
          absentsCount,
          retardsCount,
          justifiesCount,
          tauxAssiduite,
          evaluationsCount: c.evaluations.length,
          moyenneGenerale,
          alertes,
          enseignant: c.enseignant,
        };
      });

      const classeHeuresPrevues = processedMatieres.reduce(
        (acc, m) => acc + m.volumeHoraire,
        0
      );
      const classeHeuresFaites = processedMatieres.reduce(
        (acc, m) => acc + m.heuresEffectuees,
        0
      );
      const classeProgressionPct =
        classeHeuresPrevues > 0
          ? Math.min(100, Math.round((classeHeuresFaites / classeHeuresPrevues) * 100))
          : 0;

      return {
        id: classe.id,
        code: classe.code,
        nom: classe.nom,
        anneeScolaire: classe.anneeScolaire,
        effectif: classe._count.etudiants,
        heuresPrevues: classeHeuresPrevues,
        heuresFaites: classeHeuresFaites,
        heuresRestantes: Math.max(0, classeHeuresPrevues - classeHeuresFaites),
        progressionPct: classeProgressionPct,
        matieres: processedMatieres,
      };
    });

    const enseignants = await prisma.user.findMany({
      where: { role: "ENSEIGNANT" },
      select: {
        id: true,
        nom: true,
        email: true,
        username: true,
        image: true,
        createdAt: true,
        _count: {
          select: { matieres: true, cours: true, seances: true },
        },
      },
      orderBy: { nom: "asc" },
    });

    const tauxGlobalAssiduite =
      totalPresencesAll > 0
        ? Math.round(((totalPresentsAll + totalRetardsAll) / totalPresencesAll) * 100)
        : 100;

    const progressionGlobalePct =
      totalVolumePrevu > 0
        ? Math.min(100, Math.round((totalHeuresEffectuees / totalVolumePrevu) * 100))
        : 0;

    const progressionPedagogiqueGlobalePct =
      totalChapitresAll > 0
        ? Math.min(100, Math.round((totalChapitresValidesAll / totalChapitresAll) * 100))
        : 0;

    const globalStats = {
      totalClasses: classes.length,
      totalEnseignants: enseignants.length,
      totalEtudiants: processedClasses.reduce((acc, c) => acc + c.effectif, 0),
      totalVolumePrevu,
      totalHeuresEffectuees,
      totalHeuresRestantes: Math.max(0, totalVolumePrevu - totalHeuresEffectuees),
      tauxRealisationGlobal: progressionGlobalePct,
      matieresTermineesCount,
      matieresEnCoursCount,
      matieresEnRetardCount,
      matieresNonDemarreesCount,
      totalRetardsAll,
      tauxAssiduiteGlobal: tauxGlobalAssiduite,
    };

    return NextResponse.json({
      globalStats,
      synthese: {
        totalClasses: classes.length,
        totalMatieres: processedClasses.reduce((acc, c) => acc + c.matieres.length, 0),
        totalHeuresPrevues: totalVolumePrevu,
        totalHeuresEffectuees,
        progressionGlobalePct,
        totalChapitres: totalChapitresAll,
        totalChapitresValides: totalChapitresValidesAll,
        progressionPedagogiqueGlobalePct,
        tauxGlobalAssiduite,
        matieresNonDemarreesCount,
        matieresEnCoursCount,
        matieresTermineesCount,
        matieresEnRetardCount,
      },
      alertesGlobales,
      classes: processedClasses,
      enseignants,
    });
  } catch (error) {
    console.error("Erreur GET progression:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
