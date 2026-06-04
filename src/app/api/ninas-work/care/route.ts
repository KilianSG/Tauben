import { NextResponse } from "next/server";
import { getTaubenCareTasks, createTaubenCareTask } from "@/lib/ninas-work/linked-db";
import { getSessionEmployeeId } from "@/lib/ninas-work/auth";

export const runtime = "nodejs";

export async function GET() {
    const sessionEmployeeId = await getSessionEmployeeId();
    if (!sessionEmployeeId) {
        return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
    }

    return NextResponse.json({ taubenCareTasks: await getTaubenCareTasks() });
}

export async function POST(request: Request) {
    const sessionEmployeeId = await getSessionEmployeeId();
    if (!sessionEmployeeId) {
        return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
    }

    const body = (await request.json()) as {
        birdName?: string;
        birdImage?: string | null;
        careType?: string;
        admittedAt?: string;
        dischargedAt?: string | null;
    };

    if (!body.birdName || !body.careType || !body.admittedAt) {
        return NextResponse.json({ error: "Name, Versorgung und Aufnahmedatum sind erforderlich." }, { status: 400 });
    }

    const created = await createTaubenCareTask({
        birdName: body.birdName,
        birdImage: body.birdImage ?? null,
        careType: body.careType,
        admittedAt: body.admittedAt,
        dischargedAt: body.dischargedAt ?? null,
    });

    if (!created) {
        return NextResponse.json({ error: "Taubencare-Task konnte nicht erstellt werden." }, { status: 400 });
    }

    return NextResponse.json(created, { status: 201 });
}
