import { NextResponse } from "next/server";
import { deleteTask, updateTask } from "@/lib/ninas-work/linked-db";
import { getSessionEmployeeId } from "@/lib/ninas-work/auth";
import { isEmployeeAdmin } from "@/lib/ninas-work/linked-db";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function PATCH(request: Request, context: RouteContext) {
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
        creatorEmployeeId?: number;
        task?: string;
        area?: string;
        dueDate?: string;
        assigneeEmployeeId?: number | null;
        done?: boolean;
    };

    const admin = await isEmployeeAdmin(sessionEmployeeId);

    const task = await updateTask(taskId, {
        creatorEmployeeId: admin ? body.creatorEmployeeId : undefined,
        task: body.task,
        area: body.area,
        dueDate: body.dueDate,
        assigneeEmployeeId: body.assigneeEmployeeId,
        done: body.done,
    });

    if (!task) {
        return NextResponse.json({ error: "Task nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json(task);
}

export async function DELETE(_request: Request, context: RouteContext) {
    const sessionEmployeeId = await getSessionEmployeeId();
    if (!sessionEmployeeId) {
        return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
    }

    const { id } = await context.params;
    const taskId = Number(id);
    if (Number.isNaN(taskId)) {
        return NextResponse.json({ error: "Ungültige Task-ID." }, { status: 400 });
    }

    const removed = await deleteTask(taskId);
    if (!removed) {
        return NextResponse.json({ error: "Task nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}