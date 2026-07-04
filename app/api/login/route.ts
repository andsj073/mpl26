import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    return NextResponse.json({ error: "Lösenord är inte konfigurerat." }, { status: 500 });
  }
  if (password !== expected) {
    return NextResponse.json({ error: "Fel lösenord." }, { status: 401 });
  }

  const token = createHash("sha256").update(`mpl26:${expected}`).digest("hex");
  const res = NextResponse.json({ ok: true });
  res.cookies.set("mpl26_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
