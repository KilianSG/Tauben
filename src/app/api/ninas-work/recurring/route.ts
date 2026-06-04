import { NextResponse } from "next/server";
import { getBoardData, createRecurringMasterTask } from "@/lib/ninas-work/linked-db";
import { getSessionEmployeeId } from "@/lib/ninas-work/auth";
import { isEmployeeAdmin } from "@/lib/ninas-work/linked-db";

export const runtime = "nodejs";

export async function GET() {
    const sessionEmployeeId = await getSessionEmployeeId();
    if (!sessionEmployeeId) {
        return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
    }

    const board = await getBoardData();
    return NextResponse.json({ recurringMasterTasks: board.recurringMasterTasks });
}

export async function POST(request: Request) {
    const sessionEmployeeId = await getSessionEmployeeId();
    if (!sessionEmployeeId) {
        return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
    }

    const admin = await isEmployeeAdmin(sessionEmployeeId);
    if (!admin) {
        return NextResponse.json({ error: "Nur Admin erlaubt." }, { status: 403 });
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

    if (!body.task || !body.area || !body.frequencyDays || !body.startDate) {
        return NextResponse.json({ error: "Task, Bereich, Intervall und Startdatum sind erforderlich." }, { status: 400 });
    }

    const created = await createRecurringMasterTask({
        creatorEmployeeId: body.creatorEmployeeId ?? sessionEmployeeId,
        assigneeEmployeeId: body.assigneeEmployeeId ?? null,
        task: body.task,
        area: body.area,
        frequencyDays: body.frequencyDays,
        startDate: body.startDate,
        active: body.active ?? true,
    });

    if (!created) {
        return NextResponse.json({ error: "Mastertask konnte nicht erstellt werden." }, { status: 400 });
    }

    return NextResponse.json(created, { status: 201 });
}
