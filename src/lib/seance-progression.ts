import { Prisma } from "@prisma/client";

// Un chapitre n'est considéré « traité en entier » que si tous ses sous-chapitres
// sont cochés dans la même demande (ou s'il n'en possède aucun).
async function garderChapitresComplets(
  tx: Prisma.TransactionClient,
  chapitreIds: string[],
  sousChapitreIds: string[]
): Promise<string[]> {
  const cochés = new Set(sousChapitreIds);
  const complets: string[] = [];
  for (const chId of chapitreIds) {
    const sous = await tx.sousChapitre.findMany({
      where: { chapitreId: chId },
      select: { id: true },
    });
    if (sous.length === 0 || sous.every((s) => cochés.has(s.id))) {
      complets.push(chId);
    }
  }
  return complets;
}

// Helper pour enregistrer la progression (chapitres et sous-chapitres) liée à une séance
export async function saveProgressionForSeance(
  tx: Prisma.TransactionClient,
  seanceId: string,
  coursId: string,
  parsedDate: Date,
  chapitreIdsDemandes?: string[],
  sousChapitreIds?: string[]
) {
  const chapitreIds = await garderChapitresComplets(
    tx,
    chapitreIdsDemandes || [],
    sousChapitreIds || []
  );
  const coveredChapitreIds = new Set<string>(chapitreIds);

  // 1. Enregistrer les sous-chapitres sélectionnés
  if (Array.isArray(sousChapitreIds) && sousChapitreIds.length > 0) {
    for (const scId of sousChapitreIds) {
      const sc = await tx.sousChapitre.findUnique({
        where: { id: scId },
        select: { id: true, chapitreId: true },
      });
      if (sc) {
        coveredChapitreIds.add(sc.chapitreId);
        await tx.coursSousChapitreValidation.upsert({
          where: {
            coursId_sousChapitreId: { coursId, sousChapitreId: scId },
          },
          update: {
            valide: true,
            seanceId,
            dateValidation: parsedDate,
          },
          create: {
            coursId,
            sousChapitreId: scId,
            seanceId,
            valide: true,
            dateValidation: parsedDate,
          },
        });
      }
    }
  }

  // 2. Pour les chapitres explicitement cochés en entier
  if (Array.isArray(chapitreIds) && chapitreIds.length > 0) {
    for (const chId of chapitreIds) {
      await tx.coursChapitreValidation.upsert({
        where: {
          coursId_chapitreId: { coursId, chapitreId: chId },
        },
        update: {
          valide: true,
          seanceId,
          dateValidation: parsedDate,
        },
        create: {
          coursId,
          chapitreId: chId,
          seanceId,
          valide: true,
          dateValidation: parsedDate,
        },
      });

      // Valider aussi tous les sous-chapitres de ce chapitre
      const subs = await tx.sousChapitre.findMany({
        where: { chapitreId: chId },
        select: { id: true },
      });
      for (const sub of subs) {
        await tx.coursSousChapitreValidation.upsert({
          where: {
            coursId_sousChapitreId: { coursId, sousChapitreId: sub.id },
          },
          update: {
            valide: true,
            seanceId,
            dateValidation: parsedDate,
          },
          create: {
            coursId,
            sousChapitreId: sub.id,
            seanceId,
            valide: true,
            dateValidation: parsedDate,
          },
        });
      }
    }
  }

  // 3. Associer les chapitres couverts à la séance (SeanceChapitre)
  for (const chId of coveredChapitreIds) {
    await tx.seanceChapitre.upsert({
      where: {
        seanceId_chapitreId: { seanceId, chapitreId: chId },
      },
      update: { statut: "TERMINE" },
      create: {
        seanceId,
        chapitreId: chId,
        statut: "TERMINE",
      },
    });

    // Vérifier si tous les sous-chapitres de ce chapitre sont désormais validés pour ce cours
    const totalSubs = await tx.sousChapitre.count({ where: { chapitreId: chId } });
    if (totalSubs > 0) {
      const validSubs = await tx.coursSousChapitreValidation.count({
        where: {
          coursId,
          valide: true,
          sousChapitre: { chapitreId: chId },
        },
      });
      if (validSubs >= totalSubs) {
        await tx.coursChapitreValidation.upsert({
          where: {
            coursId_chapitreId: { coursId, chapitreId: chId },
          },
          update: {
            valide: true,
            seanceId,
            dateValidation: parsedDate,
          },
          create: {
            coursId,
            chapitreId: chId,
            seanceId,
            valide: true,
            dateValidation: parsedDate,
          },
        });
      }
    }
  }
}
