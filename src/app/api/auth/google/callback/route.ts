import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signSession } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const appUrl = process.env.APP_URL || "http://localhost:3600";

  // En cas d'annulation ou refus par l'utilisateur sur Google
  if (errorParam) {
    console.warn("Google OAuth refusé ou annulé:", errorParam);
    const redirectUrl = new URL("/", appUrl);
    redirectUrl.searchParams.set("error", "google_cancelled");
    return NextResponse.redirect(redirectUrl.toString());
  }

  if (!code) {
    const redirectUrl = new URL("/", appUrl);
    redirectUrl.searchParams.set("error", "code_manquant");
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Vérification de l'état anti-CSRF
  const cookieStore = await cookies();
  const savedState = cookieStore.get("google_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    console.warn("Échec validation CSRF state Google OAuth");
    const redirectUrl = new URL("/", appUrl);
    redirectUrl.searchParams.set("error", "session_expiree");
    return NextResponse.redirect(redirectUrl.toString());
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      throw new Error("Identifiants Google non configurés dans l'environnement");
    }

    // Échange du code contre les jetons Google
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error("Erreur lors de l'échange du token Google:", errorBody);
      const redirectUrl = new URL("/", appUrl);
      redirectUrl.searchParams.set("error", "echange_token_echoue");
      return NextResponse.redirect(redirectUrl.toString());
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Récupération des informations de profil de l'utilisateur Google
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userinfoResponse.ok) {
      throw new Error("Impossible de récupérer les informations de l'utilisateur Google");
    }

    const profile = await userinfoResponse.json();
    const googleId = profile.sub;
    const email = profile.email?.toLowerCase();
    const name = profile.name || profile.given_name || email?.split("@")[0];
    const picture = profile.picture;

    if (!email || profile.email_verified !== true) {
      const redirectUrl = new URL("/", appUrl);
      redirectUrl.searchParams.set("error", "email_introuvable");
      return NextResponse.redirect(redirectUrl.toString());
    }

    // Recherche de l'utilisateur existant
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { googleId },
        ],
      },
      include: { classe: true },
    });

    if (!user) {
      // Génération d'un username unique
      const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
      let uniqueUsername = baseUsername || `prof_${Date.now()}`;
      
      const existingWithUsername = await prisma.user.findUnique({
        where: { username: uniqueUsername },
      });
      if (existingWithUsername) {
        uniqueUsername = `${baseUsername}_${Math.floor(Math.random() * 1000)}`;
      }

      // Création automatique du compte Enseignant
      user = await prisma.user.create({
        data: {
          username: uniqueUsername,
          email,
          nom: name,
          googleId,
          image: picture || null,
          role: "ENSEIGNANT",
        },
        include: { classe: true },
      });
    } else {
      // Mise à jour des informations Google
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleId || user.googleId,
          image: picture || user.image,
          nom: user.nom || name,
        },
        include: { classe: true },
      });
    }

    // Création de la session JWT de l'application
    const sessionToken = await signSession({
      userId: user.id,
      username: user.username,
      email: user.email,
      nom: user.nom,
      role: user.role as "ADMINISTRATION" | "ENSEIGNANT" | "CHEF_CLASSE",
      classeId: user.classeId,
    });

    // Redirection vers le dashboard
    const destinationUrl = new URL("/dashboard", appUrl);
    const response = NextResponse.redirect(destinationUrl.toString());

    // Pose du cookie d'authentification
    response.cookies.set("auth_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 jours
      path: "/",
    });

    // Nettoyage du cookie d'état
    response.cookies.delete("google_oauth_state");

    return response;
  } catch (error) {
    console.error("Erreur callback Google OAuth:", error);
    const redirectUrl = new URL("/", appUrl);
    redirectUrl.searchParams.set("error", "erreur_google_serveur");
    return NextResponse.redirect(redirectUrl.toString());
  }
}
