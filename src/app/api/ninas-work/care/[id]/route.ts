import { NextResponse } from "next/server";
import { updateTaubenCareTask, deleteTaubenCareTask } from "@/lib/ninas-work/linked-db";
import { getSessionEmployeeId } from "@/lib/ninas-work/auth";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
    const sessionEmployeeId = await getSessionEmployeeId();
    if (!sessionEmployeeId) {
        return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
    }

    const { id } = await context.params;
    const careTaskId = Number(id);
    if (Number.isNaN(careTaskId)) {
        return NextResponse.json({ error: "Ungültige Taubencare-ID." }, { status: 400 });
    }

    const body = (await request.json()) as {
        birdName?: string;
        birdImage?: string | null;
        careType?: string;
        admittedAt?: string;
        dischargedAt?: string | null;
    };

    const updated = await updateTaubenCareTask(careTaskId, body);
    if (!updated) {
        return NextResponse.json({ error: "Taubencare-Task konnte nicht aktualisiert werden." }, { status: 404 });
    }

    return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: RouteContext) {
    const sessionEmployeeId = await getSessionEmployeeId();
    if (!sessionEmployeeId) {
        return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
    }

    const { id } = await context.params;
    const careTaskId = Number(id);
    if (Number.isNaN(careTaskId)) {
        return NextResponse.json({ error: "Ungültige Taubencare-ID." }, { status: 400 });
    }

    const deleted = await deleteTaubenCareTask(careTaskId);
    if (!deleted) {
        return NextResponse.json({ error: "Taubencare-Task nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}
