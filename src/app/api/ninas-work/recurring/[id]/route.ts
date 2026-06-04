import { NextResponse } from "next/server";
import { updateRecurringMasterTask, deleteRecurringMasterTask } from "@/lib/ninas-work/linked-db";
import { getSessionEmployeeId } from "@/lib/ninas-work/auth";
import { isEmployeeAdmin } from "@/lib/ninas-work/linked-db";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
    const sessionEmployeeId = await getSessionEmployeeId();
    if (!sessionEmployeeId) {
        return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
    }

    const admin = await isEmployeeAdmin(sessionEmployeeId);
    if (!admin) {
        return NextResponse.json({ error: "Nur Admin erlaubt." }, { status: 403 });
    }

    const { id } = await context.params;
    const masterTaskId = Number(id);
    if (Number.isNaN(masterTaskId)) {
        return NextResponse.json({ error: "Ungültige Mastertask-ID." }, { status: 400 });
    }

    const body = (await request.json()) as {
        creatorEmployeeId?: number;
        assigneeEmployeeId?: number | null;
        task?: string;
        area?: string;
        frequencyDays?: number;
        startDate?: string;
        active?: boolean;
    };

    const updated = await updateRecurringMasterTask(masterTaskId, body);
    if (!updated) {
        return NextResponse.json({ error: "Mastertask konnte nicht aktualisiert werden." }, { status: 404 });
    }

    return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: RouteContext) {
    const sessionEmployeeId = await getSessionEmployeeId();
    if (!sessionEmployeeId) {
        return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
    }

    const admin = await isEmployeeAdmin(sessionEmployeeId);
    if (!admin) {
        return NextResponse.json({ error: "Nur Admin erlaubt." }, { status: 403 });
    }

    const { id } = await context.params;
    const masterTaskId = Number(id);
    if (Number.isNaN(masterTaskId)) {
        return NextResponse.json({ error: "Ungültige Mastertask-ID." }, { status: 400 });
    }

    const deleted = await deleteRecurringMasterTask(masterTaskId);
    if (!deleted) {
        return NextResponse.json({ error: "Mastertask nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}
