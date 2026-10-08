import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || "http://localhost:3600";

  const isConfigured = Boolean(clientId && clientId.trim() !== "" && clientSecret && clientSecret.trim() !== "");

  return NextResponse.json({
    configured: isConfigured,
    hasClientId: Boolean(clientId && clientId.trim() !== ""),
    hasClientSecret: Boolean(clientSecret && clientSecret.trim() !== ""),
    clientIdMasked: clientId ? `${clientId.substring(0, 14)}...` : null,
    redirectUri: `${appUrl}/api/auth/google/callback`,
    appUrl,
  });
}
