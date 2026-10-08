import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: coursId } = await params;

    const cours = await prisma.cours.findUnique({
      where: { id: coursId },
      include: {
        matiere: {
          include: {
            chapitres: {
              orderBy: { ordre: "asc" },
              include: {
                sousChapitres: {
                  orderBy: { ordre: "asc" },
                },
              },
            },
          },
        },
        classe: {
          select: { id: true, code: true, nom: true, anneeScolaire: true },
        },
        enseignant: {
          select: { id: true, nom: true, email: true, username: true },
        },
        chapitreValidations: {
          include: {
            seance: {
              select: { id: true, date: true, nombreHeures: true, description: true },
            },
          },
        },
        sousChapitreValidations: {
          include: {
            seance: {
              select: { id: true, date: true, nombreHeures: true, description: true },
            },
          },
        },
        seances: {
          orderBy: { date: "desc" },
          select: {
            id: true,
            date: true,
            nombreHeures: true,
            description: true,
            chapitres: {
              select: { chapitreId: true, statut: true },
            },
          },
        },
      },
    });

    if (!cours) {
      return NextResponse.json({ error: "Cours non trouvé." }, { status: 404 });
    }

    const totalChapitres = cours.matiere.chapitres.length;
    const validationsMap = new Map(
      cours.chapitreValidations.map((v) => [v.chapitreId, v])
    );
    const sousValidationsMap = new Map(
      cours.sousChapitreValidations.map((v) => [v.sousChapitreId, v])
    );

    let totalEquivalentValid = 0;

    const chapitresWithStatus = cours.matiere.chapitres.map((ch) => {
      const val = validationsMap.get(ch.id);
      const isChapDirectlyValide = !!(val && val.valide);

      const sousChapitres = (ch.sousChapitres || []).map((sc) => {
        const scVal = sousValidationsMap.get(sc.id);
        const isScValide = !!(scVal && scVal.valide) || isChapDirectlyValide;
        return {
          id: sc.id,
          chapitreId: ch.id,
          titre: sc.titre,
          ordre: sc.ordre,
          valide: isScValide,
          dateValidation: scVal?.dateValidation || (isChapDirectlyValide ? val?.dateValidation : null) || null,
          seanceId: scVal?.seanceId || (isChapDirectlyValide ? val?.seanceId : null) || null,
          seance: scVal?.seance || (isChapDirectlyValide ? val?.seance : null) || null,
        };
      });

      const totalSous = sousChapitres.length;
      const validesSous = sousChapitres.filter((s) => s.valide).length;

      let isValide = false;
      let progressionPct = 0;

      if (totalSous > 0) {
        isValide = validesSous === totalSous;
        progressionPct = Math.round((validesSous / totalSous) * 100);
        totalEquivalentValid += validesSous / totalSous;
      } else {
        isValide = isChapDirectlyValide;
        progressionPct = isValide ? 100 : 0;
        if (isValide) totalEquivalentValid += 1;
      }

      return {
        id: ch.id,
        numero: ch.numero,
        titre: ch.titre,
        description: ch.description,
        ordre: ch.ordre,
        valide: isValide,
        progressionPct,
        totalSous,
        validesSous,
        dateValidation: val?.dateValidation || null,
        seanceId: val?.seanceId || null,
        seance: val?.seance || null,
        remarque: val?.remarque || null,
        sousChapitres,
      };
    });

    const chapitresValidesCount = chapitresWithStatus.filter((c) => c.valide).length;
    const progressionChapitresPct =
      totalChapitres > 0
        ? Math.min(100, Math.round((totalEquivalentValid / totalChapitres) * 100))
        : 0;

    const heuresEffectuees = cours.seances.reduce((acc, s) => acc + s.nombreHeures, 0);
    const progressionHeuresPct =
      cours.volumeHoraire > 0
        ? Math.min(100, Math.round((heuresEffectuees / cours.volumeHoraire) * 100))
        : 0;

    return NextResponse.json({
      cours: {
        id: cours.id,
        classe: cours.classe,
        matiere: {
          id: cours.matiere.id,
          code: cours.matiere.code,
          nom: cours.matiere.nom,
          description: cours.matiere.description,
        },
        enseignant: cours.enseignant,
        volumeHoraire: cours.volumeHoraire,
        coefficient: cours.coefficient,
        heuresEffectuees,
        heuresRestantes: Math.max(0, cours.volumeHoraire - heuresEffectuees),
        progressionHeuresPct,
      },
      stats: {
        totalChapitres,
        chapitresValidesCount,
        chapitresRestantsCount: Math.max(0, totalChapitres - chapitresValidesCount),
        progressionChapitresPct,
        totalSeances: cours.seances.length,
      },
      chapitres: chapitresWithStatus,
      seances: cours.seances,
    });
  } catch (error) {
    console.error("Erreur GET progression cours:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json(
        { error: "Action réservée aux enseignants ou à l'administration." },
        { status: 403 }
      );
    }

    const { id: coursId } = await params;
    const body = await request.json();

    // Mode BATCH (plusieurs chapitres ou sous-chapitres cochés d'un coup)
    if (Array.isArray(body.validations)) {
      const { validations, seanceId } = body;

      await prisma.$transaction(async (tx) => {
        for (const item of validations) {
          const { chapitreId, sousChapitreId, valide } = item;
          const targetSeanceId = item.seanceId || seanceId || null;

          if (sousChapitreId) {
            if (valide) {
              await tx.coursSousChapitreValidation.upsert({
                where: {
                  coursId_sousChapitreId: { coursId, sousChapitreId },
                },
                update: {
                  valide: true,
                  seanceId: targetSeanceId,
                  dateValidation: new Date(),
                  remarque: item.remarque || undefined,
                },
                create: {
                  coursId,
                  sousChapitreId,
                  seanceId: targetSeanceId,
                  valide: true,
                  dateValidation: new Date(),
                  remarque: item.remarque || null,
                },
              });
            } else {
              await tx.coursSousChapitreValidation.deleteMany({
                where: { coursId, sousChapitreId },
              });
            }
          }

          if (chapitreId) {
            if (valide) {
              await tx.coursChapitreValidation.upsert({
                where: {
                  coursId_chapitreId: { coursId, chapitreId },
                },
                update: {
                  valide: true,
                  seanceId: targetSeanceId,
                  dateValidation: new Date(),
                  remarque: item.remarque || undefined,
                },
                create: {
                  coursId,
                  chapitreId,
                  seanceId: targetSeanceId,
                  valide: true,
                  dateValidation: new Date(),
                  remarque: item.remarque || null,
                },
              });

              if (targetSeanceId) {
                await tx.seanceChapitre.upsert({
                  where: {
                    seanceId_chapitreId: { seanceId: targetSeanceId, chapitreId },
                  },
                  update: { statut: "TERMINE" },
                  create: {
                    seanceId: targetSeanceId,
                    chapitreId,
                    statut: "TERMINE",
                  },
                });
              }
            } else {
              await tx.coursChapitreValidation.deleteMany({
                where: { coursId, chapitreId },
              });
              if (targetSeanceId) {
                await tx.seanceChapitre.deleteMany({
                  where: { seanceId: targetSeanceId, chapitreId },
                });
              }
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: "Progression mise à jour avec succès.",
      });
    }

    // Mode UNIQUE : cocher/décocher un sous-chapitre ou un chapitre
    const { chapitreId, sousChapitreId, valide, seanceId, remarque } = body;

    if (!chapitreId && !sousChapitreId) {
      return NextResponse.json(
        { error: "chapitreId ou sousChapitreId est requis." },
        { status: 400 }
      );
    }

    // A. Gestion du sous-chapitre
    if (sousChapitreId) {
      const targetSousChapitre = await prisma.sousChapitre.findUnique({
        where: { id: sousChapitreId },
        include: { chapitre: { include: { sousChapitres: true } } },
      });

      if (!targetSousChapitre) {
        return NextResponse.json({ error: "Sous-chapitre introuvable." }, { status: 404 });
      }

      const parentChapId = targetSousChapitre.chapitreId;

      if (valide) {
        const scValidation = await prisma.coursSousChapitreValidation.upsert({
          where: {
            coursId_sousChapitreId: { coursId, sousChapitreId },
          },
          update: {
            valide: true,
            seanceId: seanceId || undefined,
            dateValidation: new Date(),
            remarque: remarque !== undefined ? remarque : undefined,
          },
          create: {
            coursId,
            sousChapitreId,
            seanceId: seanceId || null,
            valide: true,
            dateValidation: new Date(),
            remarque: remarque || null,
          },
        });

        // Vérifier si tous les sous-chapitres du parent sont validés
        const allSubs = targetSousChapitre.chapitre.sousChapitres;
        const validCount = await prisma.coursSousChapitreValidation.count({
          where: {
            coursId,
            sousChapitreId: { in: allSubs.map((s) => s.id) },
            valide: true,
          },
        });

        let parentValidated = false;
        if (validCount === allSubs.length) {
          await prisma.coursChapitreValidation.upsert({
            where: {
              coursId_chapitreId: { coursId, chapitreId: parentChapId },
            },
            update: {
              valide: true,
              seanceId: seanceId || undefined,
              dateValidation: new Date(),
            },
            create: {
              coursId,
              chapitreId: parentChapId,
              seanceId: seanceId || null,
              valide: true,
              dateValidation: new Date(),
            },
          });
          parentValidated = true;
        }

        return NextResponse.json({
          success: true,
          valide: true,
          sousChapitreId,
          parentChapId,
          parentValidated,
          validation: scValidation,
        });
      } else {
        // Décocher le sous-chapitre
        await prisma.coursSousChapitreValidation.deleteMany({
          where: { coursId, sousChapitreId },
        });

        // Décocher également le chapitre parent puisqu'il n'est plus intégralement validé
        await prisma.coursChapitreValidation.deleteMany({
          where: { coursId, chapitreId: parentChapId },
        });

        return NextResponse.json({
          success: true,
          valide: false,
          sousChapitreId,
          parentChapId,
          parentValidated: false,
        });
      }
    }

    // B. Gestion globale du chapitre complet
    if (valide) {
      const validation = await prisma.coursChapitreValidation.upsert({
        where: {
          coursId_chapitreId: { coursId, chapitreId },
        },
        update: {
          valide: true,
          seanceId: seanceId || undefined,
          dateValidation: new Date(),
          remarque: remarque !== undefined ? remarque : undefined,
        },
        create: {
          coursId,
          chapitreId,
          seanceId: seanceId || null,
          valide: true,
          dateValidation: new Date(),
          remarque: remarque || null,
        },
      });

      // Valider également tous les sous-chapitres de ce chapitre
      const subList = await prisma.sousChapitre.findMany({
        where: { chapitreId },
      });
      for (const sc of subList) {
        await prisma.coursSousChapitreValidation.upsert({
          where: {
            coursId_sousChapitreId: { coursId, sousChapitreId: sc.id },
          },
          update: {
            valide: true,
            seanceId: seanceId || undefined,
            dateValidation: new Date(),
          },
          create: {
            coursId,
            sousChapitreId: sc.id,
            seanceId: seanceId || null,
            valide: true,
            dateValidation: new Date(),
          },
        });
      }

      if (seanceId) {
        await prisma.seanceChapitre.upsert({
          where: {
            seanceId_chapitreId: { seanceId, chapitreId },
          },
          update: { statut: "TERMINE" },
          create: {
            seanceId,
            chapitreId,
            statut: "TERMINE",
          },
        });
      }

      return NextResponse.json({
        success: true,
        valide: true,
        chapitreId,
        validation,
      });
    } else {
      // Décocher le chapitre
      await prisma.coursChapitreValidation.deleteMany({
        where: { coursId, chapitreId },
      });

      // Décocher tous les sous-chapitres liés à ce chapitre
      const subList = await prisma.sousChapitre.findMany({
        where: { chapitreId },
      });
      if (subList.length > 0) {
        await prisma.coursSousChapitreValidation.deleteMany({
          where: {
            coursId,
            sousChapitreId: { in: subList.map((s) => s.id) },
          },
        });
      }

      if (seanceId) {
        await prisma.seanceChapitre.deleteMany({
          where: { seanceId, chapitreId },
        });
      }

      return NextResponse.json({
        success: true,
        valide: false,
        chapitreId,
      });
    }
  } catch (error) {
    console.error("Erreur POST progression cours:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la progression." },
      { status: 500 }
    );
  }
}
