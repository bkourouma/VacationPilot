import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matricule: string }> }
) {
  try {
    const { matricule } = await params;
    const cleanMatricule = matricule.trim();

    const etudiant = await prisma.etudiant.findUnique({
      where: { matricule: cleanMatricule },
      include: {
        classe: {
          include: {
            cours: {
              include: {
                matiere: true,
                evaluations: {
                  include: {
                    notes: true,
                  },
                },
                seances: {
                  include: {
                    presences: true,
                  },
                  orderBy: { date: "desc" },
                },
              },
            },
            etudiants: {
              select: {
                id: true,
                matricule: true,
                nom: true,
                prenom: true,
                presences: {
                  select: { statut: true, seance: { select: { nombreHeures: true } } },
                },
              },
            },
          },
        },
        notes: {
          include: {
            evaluation: {
              include: {
                cours: {
                  include: { matiere: true },
                },
              },
            },
          },
        },
        presences: {
          include: {
            seance: {
              include: {
                cours: {
                  include: { matiere: true },
                },
              },
            },
          },
          orderBy: {
            seance: {
              date: "desc",
            },
          },
        },
      },
    });

    if (!etudiant) {
      return NextResponse.json(
        { error: `Aucun étudiant trouvé avec le matricule "${cleanMatricule}".` },
        { status: 404 }
      );
    }

    // Vérification de session pour le contrôle d'accès aux données sensibles
    const session = await getSession();
    const isStaff =
      session?.role === "ADMINISTRATION" ||
      session?.role === "ENSEIGNANT" ||
      session?.role === "CHEF_CLASSE";

    // Calcul des statistiques de présence par matière et global
    let totalHeuresDispensées = 0;
    let totalHeuresPrésent = 0;
    let totalHeuresAbsent = 0;
    let totalHeuresJustifie = 0;
    let totalHeuresRetard = 0;
    let totalHeuresNonMarque = 0;

    // Toutes les séances de la classe
    const toutesLesSeances = etudiant.classe.cours.flatMap((c) =>
      c.seances.map((s) => ({
        ...s,
        matiereNom: c.matiere.nom,
        matiereCode: c.matiere.code,
      }))
    );

    toutesLesSeances.forEach((s) => {
      totalHeuresDispensées += s.nombreHeures;
      const pres = s.presences.find((p) => p.etudiantId === etudiant.id);
      const statut = pres ? pres.statut : "NON_MARQUE";

      if (statut === "PRESENT") totalHeuresPrésent += s.nombreHeures;
      else if (statut === "RETARD") totalHeuresRetard += s.nombreHeures;
      else if (statut === "JUSTIFIE") totalHeuresJustifie += s.nombreHeures;
      else if (statut === "ABSENT") totalHeuresAbsent += s.nombreHeures;
      else totalHeuresNonMarque += s.nombreHeures;
    });

    const tauxPresence =
      totalHeuresDispensées > 0
        ? Math.round(
            ((totalHeuresPrésent + totalHeuresJustifie + totalHeuresRetard) /
              totalHeuresDispensées) *
              100
          )
        : null;

    // Calcul des notes par matière/cours
    const matieresStats = etudiant.classe.cours.map((c) => {
      const evalNotes = c.evaluations.map((ev) => {
        const maNote = ev.notes.find((n) => n.etudiantId === etudiant.id);
        const toutesLesNotes = ev.notes.map((n) => n.valeur);
        const moyenneClasseEval =
          toutesLesNotes.length > 0
            ? toutesLesNotes.reduce((a, b) => a + b, 0) / toutesLesNotes.length
            : null;

        return {
          id: ev.id,
          titre: ev.titre,
          date: ev.date,
          coefficient: ev.coefficient,
          noteMax: ev.noteMax,
          valeur: maNote ? maNote.valeur : null,
          commentaire: maNote ? maNote.commentaire : null,
          moyenneClasse: moyenneClasseEval ? Math.round(moyenneClasseEval * 100) / 100 : null,
        };
      });

      // Moyenne de l'étudiant dans cette matière
      const evalsNotesFaites = evalNotes.filter((ev) => ev.valeur !== null);
      let moyenneMatiere: number | null = null;
      if (evalsNotesFaites.length > 0) {
        const totalPondere = evalsNotesFaites.reduce(
          (sum, ev) => sum + (ev.valeur! / ev.noteMax) * 20 * ev.coefficient,
          0
        );
        const totalCoef = evalsNotesFaites.reduce((sum, ev) => sum + ev.coefficient, 0);
        moyenneMatiere = totalCoef > 0 ? Math.round((totalPondere / totalCoef) * 100) / 100 : null;
      }

      // Présences pour ce cours
      const seancesMatiere = c.seances;
      let heuresMatDisp = 0;
      let heuresMatPres = 0;
      let heuresMatAbs = 0;
      let heuresMatRetard = 0;
      let heuresMatJustifie = 0;
      let heuresMatNonMarque = 0;
      seancesMatiere.forEach((s) => {
        heuresMatDisp += s.nombreHeures;
        const p = s.presences.find((pres) => pres.etudiantId === etudiant.id);
        const st = p ? p.statut : "NON_MARQUE";
        if (st === "PRESENT") {
          heuresMatPres += s.nombreHeures;
        } else if (st === "RETARD") {
          heuresMatRetard += s.nombreHeures;
        } else if (st === "JUSTIFIE") {
          heuresMatJustifie += s.nombreHeures;
        } else if (st === "ABSENT") {
          heuresMatAbs += s.nombreHeures;
        } else {
          heuresMatNonMarque += s.nombreHeures;
        }
      });

      return {
        id: c.id,
        code: c.matiere.code,
        nom: c.matiere.nom,
        coefficient: c.coefficient,
        evaluations: evalNotes,
        moyenne: moyenneMatiere,
        heuresDispensées: heuresMatDisp,
        heuresPrésent: heuresMatPres,
        heuresAbsent: heuresMatAbs,
        heuresRetard: heuresMatRetard,
        heuresJustifie: heuresMatJustifie,
        heuresNonMarque: heuresMatNonMarque,
        tauxPresence:
          heuresMatDisp > 0
            ? Math.round(
                ((heuresMatPres + heuresMatRetard + heuresMatJustifie) / heuresMatDisp) * 100
              )
            : null,
      };
    });

    // Moyenne générale pondérée de l'étudiant
    const matieresAvecMoyenne = matieresStats.filter((m) => m.moyenne !== null);
    let moyenneGenerale: number | null = null;
    if (matieresAvecMoyenne.length > 0) {
      const somPonderee = matieresAvecMoyenne.reduce(
        (acc, m) => acc + m.moyenne! * m.coefficient,
        0
      );
      const somCoef = matieresAvecMoyenne.reduce((acc, m) => acc + m.coefficient, 0);
      moyenneGenerale = somCoef > 0 ? Math.round((somPonderee / somCoef) * 100) / 100 : null;
    }

    // Récapitulatif de la classe (anonymisé pour les tiers/étudiants conformément à OWASP & RGPD)
    const totalEtudiantsClasse = etudiant.classe.etudiants.length;
    const classeCamarades = etudiant.classe.etudiants.map((camarade, idx) => {
      const isMe = camarade.matricule === etudiant.matricule;
      let heuresP = 0;
      camarade.presences.forEach((p) => {
        if (p.statut === "PRESENT" || p.statut === "JUSTIFIE" || p.statut === "RETARD") {
          heuresP += p.seance.nombreHeures;
        }
      });
      return {
        matricule: isStaff || isMe ? camarade.matricule : `AUD-${String(idx + 1).padStart(3, "0")}`,
        nom: isStaff || isMe ? camarade.nom : `Auditeur`,
        prenom: isStaff || isMe ? camarade.prenom : `#${idx + 1}`,
        isMe,
        heuresPresentes: heuresP,
        taux:
          totalHeuresDispensées > 0
            ? Math.round((heuresP / totalHeuresDispensées) * 100)
            : null,
      };
    });

    return NextResponse.json({
      etudiant: {
        id: etudiant.id,
        matricule: etudiant.matricule,
        nom: etudiant.nom,
        prenom: etudiant.prenom,
        // Masquage protecteur des coordonnées sensibles en vue publique
        contact: isStaff
          ? etudiant.contact
          : etudiant.contact
          ? etudiant.contact.replace(/(.{2})(.*)(.{2})/, "$1****$3")
          : null,
        email: isStaff
          ? etudiant.email
          : etudiant.email
          ? etudiant.email.replace(/(.{2})(.*)(?=@)/, "$1***")
          : null,
        classe: {
          id: etudiant.classe.id,
          code: etudiant.classe.code,
          nom: etudiant.classe.nom,
          anneeScolaire: etudiant.classe.anneeScolaire,
          totalEtudiants: totalEtudiantsClasse,
        },
      },
      statsAssiduite: {
        totalHeuresDispensées,
        totalHeuresPrésent,
        totalHeuresAbsent,
        totalHeuresRetard,
        totalHeuresJustifie,
        totalHeuresNonMarque,
        tauxPresence,
      },
      moyenneGenerale,
      matieres: matieresStats,
      historiquePresences: etudiant.presences.map((p) => ({
        id: p.id,
        statut: p.statut,
        remarque: p.remarque,
        seance: {
          id: p.seance.id,
          date: p.seance.date,
          nombreHeures: p.seance.nombreHeures,
          heureDebut: p.seance.heureDebut,
          heureFin: p.seance.heureFin,
          description: p.seance.description,
          matiereNom: p.seance.cours.matiere.nom,
          matiereCode: p.seance.cours.matiere.code,
        },
      })),
      classeCamarades,
    });
  } catch (error) {
    console.error("Erreur GET etudiant by matricule:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ matricule: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ENSEIGNANT") {
      return NextResponse.json(
        { error: "Action réservée à l'enseignant." },
        { status: 403 }
      );
    }

    const { matricule: identifier } = await params;
    const cleanIdentifier = identifier.trim();

    const etudiant = await prisma.etudiant.findFirst({
      where: {
        OR: [{ id: cleanIdentifier }, { matricule: cleanIdentifier }],
      },
    });

    if (!etudiant) {
      return NextResponse.json(
        { error: "Étudiant non trouvé." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { matricule, nom, prenom, contact, email, classeId } = body;

    if (!matricule || !nom) {
      return NextResponse.json(
        { error: "Le matricule et le nom sont obligatoires." },
        { status: 400 }
      );
    }

    const cleanNewMatricule = matricule.trim().toUpperCase();

    if (cleanNewMatricule !== etudiant.matricule) {
      const existing = await prisma.etudiant.findUnique({
        where: { matricule: cleanNewMatricule },
      });
      if (existing && existing.id !== etudiant.id) {
        return NextResponse.json(
          { error: `Le matricule "${cleanNewMatricule}" est déjà attribué à un autre étudiant.` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.etudiant.update({
      where: { id: etudiant.id },
      data: {
        matricule: cleanNewMatricule,
        nom: nom.trim(),
        prenom: prenom ? prenom.trim() : "",
        contact: contact ? contact.trim() : null,
        email: email ? email.trim() : null,
        classeId: classeId || undefined,
      },
      include: {
        classe: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erreur PUT etudiant:", error);
    return NextResponse.json({ error: "Erreur modification étudiant" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ matricule: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ENSEIGNANT") {
      return NextResponse.json(
        { error: "Action réservée à l'enseignant." },
        { status: 403 }
      );
    }

    const { matricule: identifier } = await params;
    const cleanIdentifier = identifier.trim();

    const etudiant = await prisma.etudiant.findFirst({
      where: {
        OR: [{ id: cleanIdentifier }, { matricule: cleanIdentifier }],
      },
    });

    if (!etudiant) {
      return NextResponse.json(
        { error: "Étudiant non trouvé." },
        { status: 404 }
      );
    }

    await prisma.etudiant.delete({
      where: { id: etudiant.id },
    });

    return NextResponse.json({ success: true, message: "Étudiant supprimé avec succès." });
  } catch (error) {
    console.error("Erreur DELETE etudiant:", error);
    return NextResponse.json({ error: "Erreur suppression étudiant" }, { status: 500 });
  }
}
