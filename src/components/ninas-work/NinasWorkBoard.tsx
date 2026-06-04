"use client";

import { useEffect, useMemo, useState } from "react";

type ThreadMessage = {
    id: number;
    author: string;
    text: string;
    createdAt: string;
};

type Task = {
    id: number;
    creator: string;
    task: string;
    area: string;
    assignee: string;
    done: boolean;
    thread: ThreadMessage[];
};

type Employee = {
    id: number;
    username: string;
    description: string;
};

type BoardData = {
    tasks: Task[];
    employees: Employee[];
};

type TaskFormState = {
    creator: string;
    task: string;
    area: string;
    assignee: string;
};

type MessageFormState = {
    author: string;
    text: string;
};

const emptyTaskForm: TaskFormState = {
    creator: "Stationsleitung",
    task: "",
    area: "",
    assignee: "",
};

export default function NinasWorkBoard({ initialBoard }: { initialBoard: BoardData }) {
    const [board, setBoard] = useState(initialBoard);
    const [selectedTaskId, setSelectedTaskId] = useState(initialBoard.tasks[0]?.id ?? 0);
    const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
    const [messageForm, setMessageForm] = useState<MessageFormState>({
        author: initialBoard.employees[0]?.username ?? "Stationsleitung",
        text: "",
    });
    const [status, setStatus] = useState<string | null>(null);

    const selectedTask = useMemo(
        () => board.tasks.find((task) => task.id === selectedTaskId) ?? board.tasks[0] ?? null,
        [board.tasks, selectedTaskId],
    );

    const openTasks = board.tasks.filter((task) => !task.done).length;
    const completedTasks = board.tasks.filter((task) => task.done).length;

    useEffect(() => {
        if (!selectedTask) {
            return;
        }

        setMessageForm((current) => ({
            ...current,
            author: current.author || selectedTask.assignee || board.employees[0]?.username || "Stationsleitung",
        }));
    }, [board.employees, selectedTask]);

    useEffect(() => {
        if (!selectedTask) {
            return;
        }

        setMessageForm((current) => ({
            ...current,
            author: current.author || selectedTask.assignee,
        }));
    }, [selectedTaskId]);

    const refreshBoard = async () => {
        const response = await fetch("/api/ninas-work", { cache: "no-store" });
        if (!response.ok) {
            throw new Error("Board konnte nicht geladen werden.");
        }

        const nextBoard = (await response.json()) as BoardData;
        setBoard(nextBoard);

        if (!nextBoard.tasks.some((task) => task.id === selectedTaskId)) {
            setSelectedTaskId(nextBoard.tasks[0]?.id ?? 0);
        }
    };

    const updateTaskSelection = (taskId: number) => {
        setSelectedTaskId(taskId);
        const task = board.tasks.find((item) => item.id === taskId);

        if (task) {
            setMessageForm((current) => ({
                ...current,
                author: current.author || task.assignee || board.employees[0]?.username || "Stationsleitung",
            }));
        }
    };

    const createTask = async () => {
        const response = await fetch("/api/ninas-work", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskForm),
        });

        if (!response.ok) {
            setStatus("Aufgabe konnte nicht erstellt werden.");
            return;
        }

        setTaskForm(emptyTaskForm);
        setStatus("Aufgabe erstellt.");
        await refreshBoard();
    };

    const saveSelectedTask = async () => {
        if (!selectedTask) {
            return;
        }

        const response = await fetch(`/api/ninas-work/tasks/${selectedTask.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                creator: selectedTask.creator,
                task: selectedTask.task,
                area: selectedTask.area,
                assignee: selectedTask.assignee,
                done: selectedTask.done,
            }),
        });

        if (!response.ok) {
            setStatus("Aufgabe konnte nicht gespeichert werden.");
            return;
        }

        setStatus("Aufgabe gespeichert.");
        await refreshBoard();
    };

    const patchSelectedTask = async (changes: Partial<Pick<Task, "creator" | "task" | "area" | "assignee" | "done">>) => {
        if (!selectedTask) {
            return;
        }

        const response = await fetch(`/api/ninas-work/tasks/${selectedTask.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(changes),
        });

        if (!response.ok) {
            setStatus("Aufgabe konnte nicht aktualisiert werden.");
            return;
        }

        await refreshBoard();
        setStatus("Aufgabe aktualisiert.");
    };

    const deleteSelectedTask = async () => {
        if (!selectedTask) {
            return;
        }

        const confirmed = window.confirm(`Aufgabe #${selectedTask.id} wirklich löschen?`);
        if (!confirmed) {
            return;
        }

        const response = await fetch(`/api/ninas-work/tasks/${selectedTask.id}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            setStatus("Aufgabe konnte nicht gelöscht werden.");
            return;
        }

        await refreshBoard();
        setStatus("Aufgabe gelöscht.");
    };

    const sendMessage = async () => {
        if (!selectedTask) {
            return;
        }

        const text = messageForm.text.trim();
        const author = messageForm.author.trim();

        if (!text || !author) {
            setStatus("Bitte Autor und Nachricht ausfüllen.");
            return;
        }

        const response = await fetch(`/api/ninas-work/tasks/${selectedTask.id}/thread`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ author, text }),
        });

        if (!response.ok) {
            setStatus("Nachricht konnte nicht gesendet werden.");
            return;
        }

        setMessageForm((current) => ({ ...current, text: "" }));
        setStatus("Nachricht gesendet.");
        await refreshBoard();
    };

    return (
        <section className="grid gap-6 pb-10 lg:grid-cols-[1.15fr_0.9fr]">
            <div className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/75">
                                Taubenstation Südkreuz
                            </p>
                            <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                                Ninas Work
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                                Hier werden die Tasks für das Taubenhaus verwaltet!
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center text-xs font-medium text-slate-300">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                                <div className="text-lg font-semibold text-white">{board.tasks.length}</div>
                                Aufgaben
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                                <div className="text-lg font-semibold text-white">{openTasks}</div>
                                Offen
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                                <div className="text-lg font-semibold text-white">{completedTasks}</div>
                                Erledigt
                            </div>
                        </div>
                    </div>

                    {status ? (
                        <p className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
                            {status}
                        </p>
                    ) : null}
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/75">
                                Neue Aufgabe
                            </p>
                            <h3 className="mt-2 text-2xl font-semibold text-white">Erstellen</h3>
                        </div>
                        <button
                            type="button"
                            onClick={createTask}
                            className="rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                        >
                            Speichern
                        </button>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <input
                            value={taskForm.creator}
                            onChange={(event) => setTaskForm((current) => ({ ...current, creator: event.target.value }))}
                            placeholder="Ersteller"
                            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                        />
                        <input
                            value={taskForm.assignee}
                            onChange={(event) => setTaskForm((current) => ({ ...current, assignee: event.target.value }))}
                            placeholder="Bearbeiter"
                            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                        />
                        <input
                            value={taskForm.area}
                            onChange={(event) => setTaskForm((current) => ({ ...current, area: event.target.value }))}
                            placeholder="Bereich"
                            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                        />
                        <input
                            value={taskForm.task}
                            onChange={(event) => setTaskForm((current) => ({ ...current, task: event.target.value }))}
                            placeholder="Aufgabe"
                            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50 sm:col-span-2"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    {board.tasks.map((task) => {
                        const active = task.id === selectedTaskId;

                        return (
                            <button
                                key={task.id}
                                type="button"
                                onClick={() => updateTaskSelection(task.id)}
                                className={`w-full rounded-3xl border p-5 text-left transition ${active
                                    ? "border-sky-400/40 bg-sky-400/10 shadow-lg shadow-sky-500/10"
                                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                                    }`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-sky-200/70">
                                            <span>#{task.id}</span>
                                            <span>{task.area}</span>
                                            <span>{task.creator}</span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-white">{task.task}</h3>
                                        <p className="text-sm text-slate-300">Bearbeiter: {task.assignee}</p>
                                    </div>

                                    <span
                                        className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] ${task.done
                                            ? "bg-emerald-400/15 text-emerald-200"
                                            : "bg-amber-400/15 text-amber-200"
                                            }`}
                                    >
                                        {task.done ? "Erledigt" : "Offen"}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-6">
                {selectedTask ? (
                    <>
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/75">
                                        Aufgabe #{selectedTask.id}
                                    </p>
                                    <h3 className="mt-2 text-2xl font-semibold text-white">Aufgabendetails</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => patchSelectedTask({ done: !selectedTask.done })}
                                        className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] ${selectedTask.done
                                            ? "bg-emerald-400/15 text-emerald-200"
                                            : "bg-amber-400/15 text-amber-200"
                                            }`}
                                    >
                                        {selectedTask.done ? "Erledigt" : "Offen"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={deleteSelectedTask}
                                        className="rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-rose-200"
                                    >
                                        Löschen
                                    </button>
                                </div>
                            </div>

                            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                                {[
                                    ["Id", `#${selectedTask.id}`],
                                    ["Ersteller", selectedTask.creator],
                                    ["Aufgabe", selectedTask.task],
                                    ["Bereich", selectedTask.area],
                                    ["Bearbeiter", selectedTask.assignee],
                                    ["Erledigt", selectedTask.done ? "Ja" : "Nein"],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                                        <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-sky-200/70">
                                            {label}
                                        </dt>
                                        <dd className="mt-2 text-sm font-medium text-white">{value}</dd>
                                    </div>
                                ))}
                            </dl>

                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                <input
                                    value={selectedTask.creator}
                                    onChange={(event) =>
                                        setBoard((current) => ({
                                            ...current,
                                            tasks: current.tasks.map((task) =>
                                                task.id === selectedTask.id ? { ...task, creator: event.target.value } : task,
                                            ),
                                        }))
                                    }
                                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                                />
                                <input
                                    value={selectedTask.assignee}
                                    onChange={(event) =>
                                        setBoard((current) => ({
                                            ...current,
                                            tasks: current.tasks.map((task) =>
                                                task.id === selectedTask.id ? { ...task, assignee: event.target.value } : task,
                                            ),
                                        }))
                                    }
                                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                                />
                                <input
                                    value={selectedTask.area}
                                    onChange={(event) =>
                                        setBoard((current) => ({
                                            ...current,
                                            tasks: current.tasks.map((task) =>
                                                task.id === selectedTask.id ? { ...task, area: event.target.value } : task,
                                            ),
                                        }))
                                    }
                                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                                />
                                <input
                                    value={selectedTask.task}
                                    onChange={(event) =>
                                        setBoard((current) => ({
                                            ...current,
                                            tasks: current.tasks.map((task) =>
                                                task.id === selectedTask.id ? { ...task, task: event.target.value } : task,
                                            ),
                                        }))
                                    }
                                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={saveSelectedTask}
                                className="mt-5 rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                            >
                                Änderungen speichern
                            </button>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/75">
                                        Thread
                                    </p>
                                    <h3 className="mt-2 text-2xl font-semibold text-white">Chat zur Aufgabe</h3>
                                </div>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                                    {selectedTask.thread.length} Nachrichten
                                </span>
                            </div>

                            <div className="mt-6 space-y-3">
                                {selectedTask.thread.map((message) => (
                                    <div key={message.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                                        <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                                            <span className="font-semibold uppercase tracking-[0.25em] text-sky-200/70">
                                                {message.author}
                                            </span>
                                            <span>{message.createdAt}</span>
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-slate-200">{message.text}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 grid gap-3 sm:grid-cols-[0.8fr_1.2fr_auto]">
                                <input
                                    value={messageForm.author}
                                    onChange={(event) =>
                                        setMessageForm((current) => ({ ...current, author: event.target.value }))
                                    }
                                    placeholder="Autor"
                                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                                />
                                <input
                                    value={messageForm.text}
                                    onChange={(event) =>
                                        setMessageForm((current) => ({ ...current, text: event.target.value }))
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            void sendMessage();
                                        }
                                    }}
                                    placeholder="Nachricht für diesen Thread"
                                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                                />
                                <button
                                    type="button"
                                    onClick={sendMessage}
                                    className="rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                                >
                                    Senden
                                </button>
                            </div>
                        </div>
                    </>
                ) : null}

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/75">
                        Mitarbeiter
                    </p>
                    <div className="mt-4 space-y-3">
                        {board.employees.map((employee) => (
                            <div key={employee.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className="text-base font-semibold text-white">{employee.username}</h4>
                                        <p className="mt-1 text-sm leading-6 text-slate-300">{employee.description}</p>
                                    </div>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                                        #{employee.id}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}