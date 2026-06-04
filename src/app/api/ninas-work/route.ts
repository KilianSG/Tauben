import { NextResponse } from "next/server";
import { createTask, getBoardData } from "@/lib/ninas-work/linked-db";
import { getSessionEmployeeId } from "@/lib/ninas-work/auth";
import { isEmployeeAdmin } from "@/lib/ninas-work/linked-db";

export const runtime = "nodejs";

export async function GET() {
    const sessionEmployeeId = await getSessionEmployeeId();
    if (!sessionEmployeeId) {
        return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
    }

    return NextResponse.json(await getBoardData());
}

export async function POST(request: Request) {
    const sessionEmployeeId = await getSessionEmployeeId();
    if (!sessionEmployeeId) {
        return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
    }

    const body = (await request.json()) as {
        creatorEmployeeId?: number;
        task?: string;
        area?: string;
        dueDate?: string;
        assigneeEmployeeId?: number | null;
    };

    if (!body.task || !body.area || !body.dueDate) {
        return NextResponse.json({ error: "Alle Task-Felder sind erforderlich." }, { status: 400 });
    }

    const admin = await isEmployeeAdmin(sessionEmployeeId);
    const creatorEmployeeId = admin
        ? (body.creatorEmployeeId ?? sessionEmployeeId)
        : sessionEmployeeId;

    const task = await createTask({
        creatorEmployeeId,
        task: body.task,
        area: body.area,
        dueDate: body.dueDate,
        assigneeEmployeeId: body.assigneeEmployeeId ?? null,
    });

    if (!task) {
        return NextResponse.json({ error: "Mitarbeiter konnten nicht zugeordnet werden." }, { status: 400 });
    }

    return NextResponse.json(task, { status: 201 });
}