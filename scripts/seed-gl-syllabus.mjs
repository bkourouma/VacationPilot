import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const gl = await prisma.matiere.findUnique({
    where: { code: "GL" },
    include: { chapitres: true },
  });

  if (!gl) {
    console.error("Matière GL non trouvée !");
    return;
  }

  console.log(`Matière trouvée: ${gl.nom} (${gl.code}), chapitres existants: ${gl.chapitres.length}`);

  // Supprimer les chapitres existants s'il y en avait
  if (gl.chapitres.length > 0) {
    await prisma.chapitre.deleteMany({
      where: { matiereId: gl.id },
    });
    console.log("Anciens chapitres supprimés.");
  }

  const syllabus = [
    {
      numero: 1,
      ordre: 1,
      titre: "Cycle de Vie Logiciel & Méthodologies Agiles",
      description: "Fondements du génie logiciel, cycle en V, Scrum, Kanban et gestion des exigences.",
      sousChapitres: [
        "Introduction au Génie Logiciel et enjeux industriels",
        "Méthodologie Scrum : rôles, cérémonies et artefacts",
        "Ingénierie des exigences et cahier des charges technique",
      ],
    },
    {
      numero: 2,
      ordre: 2,
      titre: "Modélisation Orientée Objet avec UML",
      description: "Conception formelle avec les diagrammes structurels et comportementaux UML.",
      sousChapitres: [
        "Diagramme des cas d'utilisation et scénarios",
        "Diagramme de classes : associations, héritage et interfaces",
        "Diagrammes de séquence et d'états-transitions",
      ],
    },
    {
      numero: 3,
      ordre: 3,
      titre: "Patrons de Conception (Design Patterns GoF)",
      description: "Mise en œuvre des patrons de création, de structure et de comportement.",
      sousChapitres: [
        "Patrons de création : Singleton, Factory, Builder",
        "Patrons de structure : Adapter, Decorator, Facade",
        "Patrons de comportement : Observer, Strategy",
      ],
    },
    {
      numero: 4,
      ordre: 4,
      titre: "Architectures Logicielles & Clean Architecture",
      description: "Principes SOLID, patrons architecturaux MVC / n-tiers et conception d'APIs REST.",
      sousChapitres: [
        "Principes SOLID et couplage faible",
        "Architecture MVC et découpage en couches",
        "Conception et contractualisation d'APIs RESTful",
      ],
    },
    {
      numero: 5,
      ordre: 5,
      titre: "Qualité, Tests Logiciels & CI/CD",
      description: "Assurance qualité, tests automatisés (TDD) et intégration / déploiement continu.",
      sousChapitres: [
        "Stratégie de tests : tests unitaires, intégration et mocks",
        "Qualité de code, métriques et revues de code",
        "Automatisation et pipelines CI/CD",
      ],
    },
  ];

  for (const chap of syllabus) {
    const createdChap = await prisma.chapitre.create({
      data: {
        matiereId: gl.id,
        numero: chap.numero,
        ordre: chap.ordre,
        titre: chap.titre,
        description: chap.description,
        sousChapitres: {
          create: chap.sousChapitres.map((s, idx) => ({
            titre: s,
            ordre: idx + 1,
          })),
        },
      },
      include: { sousChapitres: true },
    });
    console.log(`+ Chapitre ${createdChap.numero} créé : ${createdChap.titre} (${createdChap.sousChapitres.length} sous-chapitres)`);
  }

  console.log("✅ Syllabus GL initialisé avec succès !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
