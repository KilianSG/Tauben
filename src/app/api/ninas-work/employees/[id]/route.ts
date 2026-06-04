import { NextResponse } from "next/server";
import { deleteEmployee, updateEmployee } from "@/lib/ninas-work/linked-db";
import { isAdminSession } from "@/lib/ninas-work/auth";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function PATCH(request: Request, context: RouteContext) {
    if (!(await isAdminSession())) {
        return NextResponse.json({ error: "Nur Admin erlaubt." }, { status: 403 });
    }

    const { id } = await context.params;
    const employeeId = Number(id);
    if (Number.isNaN(employeeId)) {
        return NextResponse.json({ error: "Ungültige Mitarbeiter-ID." }, { status: 400 });
    }

    const body = (await request.json()) as {
        username?: string;
        description?: string;
    };

    if (!body.username || !body.description) {
        return NextResponse.json({ error: "Username und Beschreibung sind erforderlich." }, { status: 400 });
    }

    const employee = await updateEmployee(employeeId, {
        username: body.username,
        description: body.description,
    });

    if (!employee) {
        return NextResponse.json({ error: "Mitarbeiter konnte nicht aktualisiert werden." }, { status: 409 });
    }

    return NextResponse.json(employee);
}

export async function DELETE(_request: Request, context: RouteContext) {
    if (!(await isAdminSession())) {
        return NextResponse.json({ error: "Nur Admin erlaubt." }, { status: 403 });
    }

    const { id } = await context.params;
    const employeeId = Number(id);
    if (Number.isNaN(employeeId)) {
        return NextResponse.json({ error: "Ungültige Mitarbeiter-ID." }, { status: 400 });
    }

    const deleted = await deleteEmployee(employeeId);
    if (!deleted) {
        return NextResponse.json({ error: "Mitarbeiter konnte nicht gelöscht werden." }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
}
