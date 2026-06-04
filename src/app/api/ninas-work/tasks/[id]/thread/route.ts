import { NextResponse } from "next/server";
import { addTaskMessage } from "@/lib/ninas-work/linked-db";
import { getSessionEmployeeId } from "@/lib/ninas-work/auth";
import { isEmployeeAdmin } from "@/lib/ninas-work/linked-db";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function POST(request: Request, context: RouteContext) {
    const sessionEmployeeId = await getSessionEmployeeId();
    if (!sessionEmployeeId) {
        return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
    }

    const { id } = await context.params;
    const taskId = Number(id);
    if (Number.isNaN(taskId)) {
        return NextResponse.json({ error: "Ungültige Task-ID." }, { status: 400 });
    }

    const body = (await request.json()) as {
        authorEmployeeId?: number;
        text?: string;
    };

    if (!body.authorEmployeeId || !body.text) {
        return NextResponse.json({ error: "Autor und Nachricht sind erforderlich." }, { status: 400 });
    }

    const admin = await isEmployeeAdmin(sessionEmployeeId);
    const authorEmployeeId = admin ? body.authorEmployeeId : sessionEmployeeId;

    const task = await addTaskMessage(taskId, {
        authorEmployeeId,
        text: body.text,
    });
    if (!task) {
        return NextResponse.json({ error: "Task nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json(task, { status: 201 });
}