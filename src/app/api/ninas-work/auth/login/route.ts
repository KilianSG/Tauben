import { NextResponse } from "next/server";
import { NINAS_WORK_SESSION_COOKIE } from "@/lib/ninas-work/auth";
import { getEmployeeByIdPublic } from "@/lib/ninas-work/linked-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const body = (await request.json()) as {
        employeeId?: number;
    };

    const employeeId = Number(body.employeeId);
    if (Number.isNaN(employeeId) || employeeId <= 0) {
        return NextResponse.json({ error: "Ungültige Mitarbeiter-ID." }, { status: 400 });
    }

    const employee = await getEmployeeByIdPublic(employeeId);
    if (!employee) {
        return NextResponse.json({ error: "Mitarbeiter nicht gefunden." }, { status: 404 });
    }

    const response = NextResponse.json({ ok: true, employee });
    response.cookies.set(NINAS_WORK_SESSION_COOKIE, String(employee.id), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
    });

    return response;
}
