import { NextResponse } from "next/server";
import { createEmployee, getBoardData } from "@/lib/ninas-work/linked-db";
import { isAdminSession } from "@/lib/ninas-work/auth";

export const runtime = "nodejs";

export async function GET() {
    if (!(await isAdminSession())) {
        return NextResponse.json({ error: "Nur Admin erlaubt." }, { status: 403 });
    }

    return NextResponse.json({ employees: (await getBoardData()).employees });
}

export async function POST(request: Request) {
    if (!(await isAdminSession())) {
        return NextResponse.json({ error: "Nur Admin erlaubt." }, { status: 403 });
    }

    const body = (await request.json()) as {
        username?: string;
        description?: string;
    };

    if (!body.username || !body.description) {
        return NextResponse.json({ error: "Username und Beschreibung sind erforderlich." }, { status: 400 });
    }

    const employee = await createEmployee({
        username: body.username,
        description: body.description,
    });

    if (!employee) {
        return NextResponse.json({ error: "Mitarbeiter konnte nicht erstellt werden." }, { status: 409 });
    }

    return NextResponse.json(employee, { status: 201 });
}
