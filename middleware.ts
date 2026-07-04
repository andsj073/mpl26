import { NextRequest, NextResponse } from "next/server";

const COOKIE = "mpl26_auth";

/** Cookien innehåller SHA-256 av lösenordet, aldrig lösenordet självt. */
async function expectedToken(): Promise<string> {
  const data = new TextEncoder().encode(`mpl26:${process.env.APP_PASSWORD}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  // Utan konfigurerat lösenord är appen öppen (t.ex. lokal dev utan env)
  if (!process.env.APP_PASSWORD) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  if (token === (await expectedToken())) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/las";
  return NextResponse.redirect(url);
}

export const config = {
  // Allt utom lås-sidan, login-API:t, Next-interna filer och statiska assets
  matcher: ["/((?!_next|las|api/login|favicon.ico|.*\\..*).*)"],
};
