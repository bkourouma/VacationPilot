import { NextResponse } from "next/server";
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
    const state = crypto.randomUUID();

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

// POST: authentification via ID token Google (Google Identity Services).
// Le jeton est la SEULE preuve d'identité acceptée : aucune adresse email « déclarée » par le client
// ne peut ouvrir de session (sinon n'importe qui pourrait usurper un compte enseignant ou chef de classe).
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const credential = typeof body?.credential === "string" ? body.credential : "";

    if (!credential) {
      return NextResponse.json(
        { error: "Un jeton Google valide est obligatoire pour se connecter avec Google." },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "La connexion Google n'est pas configurée sur ce serveur." },
        { status: 503 }
      );
    }

    let userEmail: string | undefined;
    let userName: string | undefined;
    let userGoogleId: string | undefined;
    let userImage: string | undefined;

    try {
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      if (!verifyRes.ok) {
        return NextResponse.json({ error: "Jeton Google invalide ou expiré." }, { status: 401 });
      }
      const payload = await verifyRes.json();

      // Le jeton doit avoir été émis pour CETTE application et pour une adresse vérifiée par Google.
      if (payload.aud !== clientId) {
        return NextResponse.json({ error: "Jeton Google non destiné à cette application." }, { status: 401 });
      }
      if (payload.email_verified !== true && payload.email_verified !== "true") {
        return NextResponse.json({ error: "L'adresse email Google n'est pas vérifiée." }, { status: 401 });
      }

      userEmail = payload.email?.toLowerCase();
      userName = payload.name;
      userGoogleId = payload.sub;
      userImage = payload.picture;
    } catch (err) {
      console.error("Erreur vérification token Google:", err);
      return NextResponse.json(
        { error: "Erreur lors de la validation du compte Google." },
        { status: 500 }
      );
    }

    if (!userEmail || !userGoogleId) {
      return NextResponse.json({ error: "L'adresse email Google est requise." }, { status: 400 });
    }

    // Recherche de l'utilisateur existant
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userEmail },
          { googleId: userGoogleId },
        ],
      },
      include: { classe: true },
    });

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
