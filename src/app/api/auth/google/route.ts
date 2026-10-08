import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signSession } from "@/lib/auth";

// GET: Redirection vers le serveur d'authentification Google OAuth 2.0
export async function GET(request: Request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const appUrl = process.env.APP_URL || "http://localhost:3600";
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    // Si les clés Google ne sont pas encore configurées dans le .env
    if (!clientId || !clientSecret) {
      const url = new URL(request.url);
      url.pathname = "/";
      url.searchParams.set("google_config_needed", "true");
      return NextResponse.redirect(url.toString());
    }

    // Génération d'un état sécurisé anti-CSRF
    const state = Math.random().toString(36).substring(2) + Date.now().toString(36);

    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("access_type", "offline");
    googleAuthUrl.searchParams.set("prompt", "select_account");
    googleAuthUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(googleAuthUrl.toString());

    // Stockage de l'état dans un cookie sécurisé
    response.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Erreur initiation Google OAuth:", error);
    return NextResponse.json(
      { error: "Impossible d'initier la connexion Google." },
      { status: 500 }
    );
  }
}

// POST: Authentification via ID Token Google (Google Identity Services) ou création directe
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { credential, email, nom, googleId, image } = body;

    let userEmail = email?.trim().toLowerCase();
    let userName = nom?.trim();
    let userGoogleId = googleId;
    let userImage = image;

    // Si un ID token officiel Google est passé (via Google Identity Services)
    if (credential) {
      try {
        const verifyRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
        );
        if (verifyRes.ok) {
          const payload = await verifyRes.json();
          userEmail = payload.email?.toLowerCase();
          userName = payload.name;
          userGoogleId = payload.sub;
          userImage = payload.picture;
        } else {
          return NextResponse.json(
            { error: "Jeton Google invalide ou expiré." },
            { status: 401 }
          );
        }
      } catch (err) {
        console.error("Erreur vérification token Google:", err);
        return NextResponse.json(
          { error: "Erreur lors de la validation du compte Google." },
          { status: 500 }
        );
      }
    }

    // Si aucun jeton Google n'est fourni (ex: saisie directe d'email de test)
    if (!credential) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "La connexion Google officielle avec jeton valide est obligatoire en production." },
          { status: 403 }
        );
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "L'adresse email Google est requise." },
        { status: 400 }
      );
    }

    // Vérification du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return NextResponse.json(
        { error: "Veuillez saisir une adresse email valide." },
        { status: 400 }
      );
    }

    // Recherche de l'utilisateur existant
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userEmail },
          userGoogleId ? { googleId: userGoogleId } : { email: userEmail },
        ],
      },
      include: { classe: true },
    });

    // Protection anti-usurpation : les comptes d'administration ne peuvent JAMAIS être connectés sans jeton Google vérifié ou mot de passe
    if (user && user.role === "ADMINISTRATION" && !credential) {
      return NextResponse.json(
        {
          error:
            "Les comptes de la direction pédagogique et d'administration exigent une connexion par identifiant/mot de passe ou une validation Google sécurisée.",
        },
        { status: 403 }
      );
    }

    if (!user) {
      // Génération d'un username unique
      const baseUsername = userEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
      let uniqueUsername = baseUsername || `prof_${Date.now()}`;
      
      const existingWithUsername = await prisma.user.findUnique({
        where: { username: uniqueUsername },
      });
      if (existingWithUsername) {
        uniqueUsername = `${baseUsername}_${Math.floor(Math.random() * 1000)}`;
      }

      const displayName = userName || userEmail.split("@")[0];

      user = await prisma.user.create({
        data: {
          username: uniqueUsername,
          email: userEmail,
          nom: displayName,
          googleId: userGoogleId || null,
          image: userImage || null,
          role: "ENSEIGNANT",
        },
        include: { classe: true },
      });
    } else {
      // Mise à jour éventuelle des infos Google
      if ((userGoogleId && !user.googleId) || (userImage && !user.image)) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: userGoogleId || user.googleId,
            image: userImage || user.image,
            nom: userName || user.nom,
          },
          include: { classe: true },
        });
      }
    }

    // Création de la session
    const token = await signSession({
      userId: user.id,
      username: user.username,
      email: user.email,
      nom: user.nom,
      role: user.role as "ADMINISTRATION" | "ENSEIGNANT" | "CHEF_CLASSE",
      classeId: user.classeId,
    });

    const response = NextResponse.json({
      success: true,
      message: `Bienvenue, ${user.nom} !`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nom: user.nom,
        role: user.role,
        image: user.image,
        classeId: user.classeId,
        classe: user.classe,
      },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 jours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Erreur auth Google:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'authentification Google." },
      { status: 500 }
    );
  }
}
