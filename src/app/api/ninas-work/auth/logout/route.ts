import { NextResponse } from "next/server";
import { NINAS_WORK_SESSION_COOKIE } from "@/lib/ninas-work/auth";

export const runtime = "nodejs";

export async function POST() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(NINAS_WORK_SESSION_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });

    return response;
}
