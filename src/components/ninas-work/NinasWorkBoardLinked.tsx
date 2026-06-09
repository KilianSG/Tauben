"use client";

import { type FormEvent, useEffect, useState } from "react";
import type {
    BoardData,
    BoardTask,
    EmployeeRecord,
    RecurringMasterTask,
    TaubenCareTask,
} from "@/lib/ninas-work/linked-db";
import { cx, nw } from "@/components/ninas-work/uiClasses";

type TaskFormState = {
    creatorEmployeeId: number;
    assigneeEmployeeId: number | null;
    task: string;
    area: string;
    dueDate: string;
};

type EditFormState = TaskFormState & {
    done: boolean;
};

type MessageFormState = {
    text: string;
};

type MasterTaskFormState = {
    creatorEmployeeId: number;
    assigneeEmployeeId: number | null;
    task: string;
    area: string;
    frequencyDays: number;
    startDate: string;
};

type CareFormState = {
    birdName: string;
    birdImage: string | null;
    careType: string;
    admittedAt: string;
    dischargedAt: string;
};

type EditFieldName = keyof EditFormState;
type ActiveTab = "tasks" | "create" | "care";
type TaskViewMode = "list" | "calendar";
type TaskStatusFilter = "all" | "open" | "done";
type ViewPreferences = {
    activeTab: ActiveTab;
    taskViewMode: TaskViewMode;
};

const WEEKDAYS_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function todayIso() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

function addDaysIso(dateIso: string, days: number) {
    const base = new Date(`${dateIso}T00:00:00`);
    if (Number.isNaN(base.getTime())) {
        return dateIso;
    }

    base.setDate(base.getDate() + days);
    const month = String(base.getMonth() + 1).padStart(2, "0");
    const day = String(base.getDate()).padStart(2, "0");
    return `${base.getFullYear()}-${month}-${day}`;
}

function assigneeLabel(username: string | null | undefined) {
    return username && username.trim() ? username : "Unzugewiesen";
}

function taskStatusLabel(task: BoardTask) {
    return task.done ? "Erledigt" : "Offen";
}

function formatDueDateLabel(value: string) {
    if (!value) {
        return "Kein Datum";
    }

    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    const weekday = WEEKDAYS_SHORT[parsed.getDay()] ?? "";
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    return `${weekday} ${day}.${month}`;
}

function taskMatchesEditForm(task: BoardTask, form: EditFormState) {
    return (
        task.creatorEmployeeId === form.creatorEmployeeId
        && (task.assigneeEmployeeId ?? null) === (form.assigneeEmployeeId ?? null)
        && task.task === form.task
        && task.area === form.area
        && task.dueDate === form.dueDate
        && task.done === form.done
    );
}

function autoResizeTextarea(event: FormEvent<HTMLTextAreaElement>) {
    const target = event.currentTarget;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
}

type BoardProps = {
    initialBoard: BoardData;
    currentEmployeeId: number;
    currentEmployeeName: string;
    isAdmin: boolean;
};

export default function NinasWorkBoardLinked({
    initialBoard,
    currentEmployeeId,
    currentEmployeeName,
    isAdmin,
}: BoardProps) {
    const viewPreferenceKey = `ninas-work-view-${currentEmployeeId}`;
    const [board, setBoard] = useState(initialBoard);
    const [activeTab, setActiveTab] = useState<ActiveTab>("tasks");
    const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>("list");
    const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>("all");
    const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<string>("all");
    const [taskAreaFilter, setTaskAreaFilter] = useState<string>("all");
    const [taskSearch, setTaskSearch] = useState("");
    const [calendarStartDate, setCalendarStartDate] = useState(todayIso());
    const [visibleCalendarDays, setVisibleCalendarDays] = useState(7);

    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(initialBoard.tasks[0]?.id ?? null);
    const firstEmployeeId = initialBoard.employees[0]?.id ?? 0;

    const [createForm, setCreateForm] = useState<TaskFormState>({
        creatorEmployeeId: currentEmployeeId,
        assigneeEmployeeId: currentEmployeeId || null,
        task: "",
        area: "",
        dueDate: todayIso(),
    });

    const [editForm, setEditForm] = useState<EditFormState>({
        creatorEmployeeId: firstEmployeeId,
        assigneeEmployeeId: null,
        task: "",
        area: "",
        dueDate: todayIso(),
        done: false,
    });

    const [messageForm, setMessageForm] = useState<MessageFormState>({ text: "" });
    const [editingFields, setEditingFields] = useState<Partial<Record<EditFieldName, boolean>>>({});
    const [status, setStatus] = useState<string | null>(null);

    const [masterForm, setMasterForm] = useState<MasterTaskFormState>({
        creatorEmployeeId: currentEmployeeId,
        assigneeEmployeeId: currentEmployeeId || null,
        task: "",
        area: "",
        frequencyDays: 1,
        startDate: todayIso(),
    });

    const [careForm, setCareForm] = useState<CareFormState>({
        birdName: "",
        birdImage: null,
        careType: "",
        admittedAt: todayIso(),
        dischargedAt: "",
    });

    const openTasks = board.tasks.filter((task) => !task.done).length;
    const completedTasks = board.tasks.filter((task) => task.done).length;
    const taskAreas = Array.from(new Set(board.tasks.map((task) => task.area.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "de"));

    const filteredTasks = board.tasks.filter((task) => {
        if (taskStatusFilter === "open" && task.done) {
            return false;
        }

        if (taskStatusFilter === "done" && !task.done) {
            return false;
        }

        if (taskAssigneeFilter === "unassigned" && task.assigneeEmployeeId !== null) {
            return false;
        }

        if (taskAssigneeFilter !== "all" && taskAssigneeFilter !== "unassigned") {
            if ((task.assigneeEmployeeId ?? -1) !== Number(taskAssigneeFilter)) {
                return false;
            }
        }

        if (taskAreaFilter !== "all" && task.area !== taskAreaFilter) {
            return false;
        }

        const searchValue = taskSearch.trim().toLowerCase();
        if (!searchValue) {
            return true;
        }

        return [task.task, task.area, task.creatorUsername, task.assigneeUsername ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(searchValue);
    });

    const calendarDays = Array.from({ length: visibleCalendarDays }, (_, index) => addDaysIso(calendarStartDate, index));
    const tasksByDay = new Map<string, BoardTask[]>();

    for (const day of calendarDays) {
        tasksByDay.set(day, []);
    }

    for (const task of filteredTasks) {
        const bucket = tasksByDay.get(task.dueDate);
        if (bucket) {
            bucket.push(task);
        }
    }

    for (const tasks of tasksByDay.values()) {
        tasks.sort((a, b) => Number(a.done) - Number(b.done) || a.id - b.id);
    }

    const markEditField = <K extends EditFieldName>(field: K, value: EditFormState[K]) => {
        setEditForm((current) => ({ ...current, [field]: value }));
        setEditingFields((current) => ({ ...current, [field]: true }));
    };

    const clearEditField = (field: EditFieldName) => {
        setEditingFields((current) => ({ ...current, [field]: false }));
    };

    useEffect(() => {
        const activeTask = board.tasks.find((task) => task.id === selectedTaskId);
        if (!activeTask) {
            return;
        }

        setEditForm({
            creatorEmployeeId: activeTask.creatorEmployeeId,
            assigneeEmployeeId: activeTask.assigneeEmployeeId,
            task: activeTask.task,
            area: activeTask.area,
            dueDate: activeTask.dueDate,
            done: activeTask.done,
        });
        setEditingFields({});
    }, [board.tasks, selectedTaskId]);

    useEffect(() => {
        if (!board.employees.some((employee) => employee.id === createForm.creatorEmployeeId)) {
            setCreateForm((current) => ({
                ...current,
                creatorEmployeeId: currentEmployeeId || firstEmployeeId,
                assigneeEmployeeId: currentEmployeeId || null,
            }));
        }
    }, [board.employees, createForm.creatorEmployeeId, currentEmployeeId, firstEmployeeId]);

    useEffect(() => {
        const updateVisibleDays = () => {
            const width = window.innerWidth;
            if (width < 640) {
                setVisibleCalendarDays(1);
                return;
            }

            if (width < 980) {
                setVisibleCalendarDays(3);
                return;
            }

            if (width < 1280) {
                setVisibleCalendarDays(5);
                return;
            }

            setVisibleCalendarDays(7);
        };

        updateVisibleDays();
        window.addEventListener("resize", updateVisibleDays);
        return () => window.removeEventListener("resize", updateVisibleDays);
    }, []);

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(viewPreferenceKey);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw) as Partial<ViewPreferences>;
            if (parsed.activeTab === "tasks" || parsed.activeTab === "create" || parsed.activeTab === "care") {
                setActiveTab(parsed.activeTab);
            }

            if (parsed.taskViewMode === "list" || parsed.taskViewMode === "calendar") {
                setTaskViewMode(parsed.taskViewMode);
            }
        } catch {
            // Ignore invalid localStorage payload.
        }
    }, [viewPreferenceKey]);

    useEffect(() => {
        const payload: ViewPreferences = {
            activeTab,
            taskViewMode,
        };

        window.localStorage.setItem(viewPreferenceKey, JSON.stringify(payload));
    }, [activeTab, taskViewMode, viewPreferenceKey]);

    const renderTaskExpanded = (task: BoardTask, mode: TaskViewMode = "list") => {
        const hasUnsavedChanges = !taskMatchesEditForm(task, editForm);
        const wrapperClass = mode === "calendar"
            ? "mt-2 w-full space-y-5 rounded-2xl border border-[color:var(--nw-border)] bg-[color:var(--nw-surface)] p-5 sm:absolute sm:left-0 sm:top-full sm:z-30 sm:w-[min(92vw,46rem)] sm:shadow-2xl sm:shadow-slate-400/30"
            : "space-y-5 border-t border-[color:var(--nw-border)] p-5";

        return (
            <div
                className={wrapperClass}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    {isAdmin ? (
                        <label className="space-y-2">
                            <span className={nw.compactTitle}>Ersteller</span>
                            <select
                                value={editForm.creatorEmployeeId}
                                onChange={(event) => markEditField("creatorEmployeeId", Number(event.target.value))}
                                onBlur={() => clearEditField("creatorEmployeeId")}
                                className={cx(nw.input, editingFields.creatorEmployeeId && nw.fieldEditing)}
                            >
                                {board.employees.map((employee) => (
                                    <option key={employee.id} value={employee.id}>{employee.username}</option>
                                ))}
                            </select>
                        </label>
                    ) : (
                        <div className="space-y-2">
                            <span className={nw.compactTitle}>Ersteller</span>
                            <p className={nw.staticField}>{task.creatorUsername}</p>
                        </div>
                    )}

                    <label className="space-y-2">
                        <span className={nw.compactTitle}>Bearbeiter</span>
                        <select
                            value={editForm.assigneeEmployeeId ?? ""}
                            onChange={(event) => markEditField("assigneeEmployeeId", event.target.value ? Number(event.target.value) : null)}
                            onBlur={() => clearEditField("assigneeEmployeeId")}
                            className={cx(nw.input, !editForm.assigneeEmployeeId && nw.assigneeMissing, editingFields.assigneeEmployeeId && nw.fieldEditing)}
                        >
                            <option value="">Noch unzugewiesen</option>
                            {board.employees.map((employee) => (
                                <option key={employee.id} value={employee.id}>{employee.username}</option>
                            ))}
                        </select>
                    </label>

                    <input value={editForm.area} onChange={(event) => markEditField("area", event.target.value)} onBlur={() => clearEditField("area")} placeholder="Bereich" className={cx(nw.textInput, editingFields.area && nw.fieldEditing)} />
                    <textarea
                        value={editForm.task}
                        onChange={(event) => markEditField("task", event.target.value)}
                        onInput={autoResizeTextarea}
                        onBlur={() => clearEditField("task")}
                        placeholder="Aufgabe"
                        rows={2}
                        className={cx(nw.textInput, "resize-none overflow-hidden", editingFields.task && nw.fieldEditing)}
                    />

                    <label className="space-y-2 sm:col-span-2">
                        <span className={nw.compactTitle}>Fälligkeitstag</span>
                        <input type="date" value={editForm.dueDate} onChange={(event) => markEditField("dueDate", event.target.value)} onBlur={() => clearEditField("dueDate")} className={cx(nw.input, editingFields.dueDate && nw.fieldEditing)} />
                    </label>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            markEditField("done", !editForm.done);
                            clearEditField("done");
                        }}
                        className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] ${editForm.done ? nw.stateDone : nw.stateOpen}`}
                    >
                        {editForm.done ? "Erledigt" : "Offen"}
                    </button>
                    <button type="button" onClick={() => saveTask(task.id)} disabled={!hasUnsavedChanges} className={cx(nw.buttonPrimary, !hasUnsavedChanges && nw.buttonDisabled)}>Speichern</button>
                    <button type="button" onClick={() => deleteTaskById(task)} className={nw.buttonDanger}>Löschen</button>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                        <p className={nw.sectionTitle}>Thread</p>
                        <span className={nw.idBadge}>{task.thread.length} Nachrichten</span>
                    </div>

                    {task.thread.map((message) => (
                        <div key={message.id} className={nw.listCard}>
                            <div className={`flex items-center justify-between gap-3 text-xs ${nw.textMuted}`}>
                                <span className="font-semibold uppercase tracking-[0.25em] text-[color:var(--nw-accent)]">{message.authorUsername}</span>
                                <span>{message.createdAt}</span>
                            </div>
                            <p className={`mt-2 text-sm leading-6 ${nw.textPrimary}`}>{message.text}</p>
                        </div>
                    ))}

                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <label className="space-y-2 sm:col-span-1">
                            <span className={nw.compactTitle}>Antworten als {currentEmployeeName}</span>
                            <input
                                value={messageForm.text}
                                onChange={(event) => setMessageForm({ text: event.target.value })}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        void sendMessage(task.id);
                                    }
                                }}
                                placeholder="Nachricht für diesen Thread"
                                className={nw.input}
                            />
                        </label>

                        <button type="button" onClick={() => sendMessage(task.id)} className={`${nw.buttonPrimaryMd} self-end rounded-2xl px-5 py-3`}>Senden</button>
                    </div>
                </div>
            </div>
        );
    };

    const refreshBoard = async () => {
        const response = await fetch("/api/ninas-work", { cache: "no-store" });
        if (!response.ok) {
            setStatus("Board konnte nicht neu geladen werden.");
            return;
        }

        const nextBoard = (await response.json()) as BoardData;
        setBoard(nextBoard);

        if (!nextBoard.tasks.some((task) => task.id === selectedTaskId)) {
            setSelectedTaskId(nextBoard.tasks[0]?.id ?? null);
        }
    };

    const createTask = async () => {
        const response = await fetch("/api/ninas-work", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(createForm),
        });

        if (!response.ok) {
            setStatus("Aufgabe konnte nicht erstellt werden.");
            return;
        }

        setCreateForm({
            creatorEmployeeId: currentEmployeeId || firstEmployeeId,
            assigneeEmployeeId: currentEmployeeId || null,
            task: "",
            area: "",
            dueDate: todayIso(),
        });
        setStatus("Aufgabe erstellt.");
        await refreshBoard();
    };

    const saveTask = async (taskId: number) => {
        const response = await fetch(`/api/ninas-work/tasks/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editForm),
        });

        if (!response.ok) {
            setStatus("Aufgabe konnte nicht gespeichert werden.");
            return;
        }

        setStatus("Aufgabe gespeichert.");
        await refreshBoard();
    };

    const toggleTaskDone = async (task: BoardTask) => {
        const response = await fetch(`/api/ninas-work/tasks/${task.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ done: !task.done }),
        });

        if (!response.ok) {
            setStatus("Status konnte nicht gespeichert werden.");
            return;
        }

        setStatus(task.done ? "Aufgabe als offen markiert." : "Aufgabe als erledigt markiert.");
        await refreshBoard();
    };

    const deleteTaskById = async (task: BoardTask) => {
        const confirmed = window.confirm(`Aufgabe #${task.id} wirklich löschen?`);
        if (!confirmed) {
            return;
        }

        const response = await fetch(`/api/ninas-work/tasks/${task.id}`, { method: "DELETE" });

        if (!response.ok) {
            setStatus("Aufgabe konnte nicht gelöscht werden.");
            return;
        }

        setStatus("Aufgabe gelöscht.");
        await refreshBoard();
    };

    const sendMessage = async (taskId: number) => {
        if (!messageForm.text.trim()) {
            setStatus("Bitte eine Nachricht eingeben.");
            return;
        }

        const response = await fetch(`/api/ninas-work/tasks/${taskId}/thread`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                authorEmployeeId: currentEmployeeId,
                text: messageForm.text,
            }),
        });

        if (!response.ok) {
            setStatus("Nachricht konnte nicht gesendet werden.");
            return;
        }

        setMessageForm({ text: "" });
        setStatus("Nachricht gesendet.");
        await refreshBoard();
    };

    const createMasterTask = async () => {
        if (!isAdmin) {
            setStatus("Nur Admin kann Mastertasks erstellen.");
            return;
        }

        const response = await fetch("/api/ninas-work/recurring", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(masterForm),
        });

        if (!response.ok) {
            setStatus("Mastertask konnte nicht erstellt werden.");
            return;
        }

        setMasterForm((current) => ({
            ...current,
            task: "",
            area: "",
            frequencyDays: 1,
            startDate: todayIso(),
        }));
        setStatus("Mastertask erstellt. Subtasks wurden bis 14 Tage im Voraus erzeugt.");
        await refreshBoard();
    };

    const quickEditMasterTask = async (masterTask: RecurringMasterTask) => {
        const nextTask = window.prompt("Taskname", masterTask.task)?.trim();
        if (!nextTask) {
            return;
        }

        const nextArea = window.prompt("Bereich", masterTask.area)?.trim();
        if (!nextArea) {
            return;
        }

        const nextIntervalRaw = window.prompt("Intervall in Tagen", String(masterTask.frequencyDays));
        if (!nextIntervalRaw) {
            return;
        }

        const nextInterval = Number(nextIntervalRaw);
        if (!Number.isFinite(nextInterval) || nextInterval <= 0) {
            setStatus("Intervall muss eine positive Zahl sein.");
            return;
        }

        const response = await fetch(`/api/ninas-work/recurring/${masterTask.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                task: nextTask,
                area: nextArea,
                frequencyDays: nextInterval,
            }),
        });

        if (!response.ok) {
            setStatus("Mastertask konnte nicht aktualisiert werden.");
            return;
        }

        setStatus("Mastertask aktualisiert. Zukünftige Subtasks wurden synchronisiert.");
        await refreshBoard();
    };

    const toggleMasterTaskActive = async (masterTask: RecurringMasterTask) => {
        const response = await fetch(`/api/ninas-work/recurring/${masterTask.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: !masterTask.active }),
        });

        if (!response.ok) {
            setStatus("Mastertask-Status konnte nicht geändert werden.");
            return;
        }

        setStatus(masterTask.active ? "Mastertask pausiert." : "Mastertask aktiviert.");
        await refreshBoard();
    };

    const deleteMasterTask = async (masterTask: RecurringMasterTask) => {
        const confirmed = window.confirm(`Mastertask #${masterTask.id} wirklich löschen?`);
        if (!confirmed) {
            return;
        }

        const response = await fetch(`/api/ninas-work/recurring/${masterTask.id}`, { method: "DELETE" });

        if (!response.ok) {
            setStatus("Mastertask konnte nicht gelöscht werden.");
            return;
        }

        setStatus("Mastertask gelöscht.");
        await refreshBoard();
    };

    const setCareImageFromFile = async (file: File | null) => {
        if (!file) {
            return;
        }

        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."));
            reader.readAsDataURL(file);
        });

        setCareForm((current) => ({ ...current, birdImage: dataUrl }));
    };

    const createCareTask = async () => {
        const response = await fetch("/api/ninas-work/care", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...careForm, dischargedAt: careForm.dischargedAt || null }),
        });

        if (!response.ok) {
            setStatus("Taubencare-Task konnte nicht erstellt werden.");
            return;
        }

        setCareForm({
            birdName: "",
            birdImage: null,
            careType: "",
            admittedAt: todayIso(),
            dischargedAt: "",
        });
        setStatus("Taubencare-Task erstellt.");
        await refreshBoard();
    };

    const markCareDischarged = async (task: TaubenCareTask) => {
        const response = await fetch(`/api/ninas-work/care/${task.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dischargedAt: task.dischargedAt ? null : todayIso() }),
        });

        if (!response.ok) {
            setStatus("Entlassungsdatum konnte nicht gespeichert werden.");
            return;
        }

        setStatus(task.dischargedAt ? "Taube wieder als aktiv markiert." : "Taube als entlassen markiert.");
        await refreshBoard();
    };

    const deleteCareTask = async (task: TaubenCareTask) => {
        const confirmed = window.confirm(`Taubencare-Eintrag #${task.id} wirklich löschen?`);
        if (!confirmed) {
            return;
        }

        const response = await fetch(`/api/ninas-work/care/${task.id}`, { method: "DELETE" });

        if (!response.ok) {
            setStatus("Taubencare-Eintrag konnte nicht gelöscht werden.");
            return;
        }

        setStatus("Taubencare-Eintrag gelöscht.");
        await refreshBoard();
    };

    return (
        <section className="space-y-6 pb-10">
            <div className={nw.panelPadded}>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab("tasks")}
                        className={cx(
                            "rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em]",
                            activeTab === "tasks" ? nw.buttonPrimary : "border border-[color:var(--nw-border)] text-[color:var(--nw-text)]",
                        )}
                    >
                        Aufgaben
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("create")}
                        className={cx(
                            "rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em]",
                            activeTab === "create" ? nw.buttonPrimary : "border border-[color:var(--nw-border)] text-[color:var(--nw-text)]",
                        )}
                    >
                        Erstelle Aufgabe
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("care")}
                        className={cx(
                            "rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em]",
                            activeTab === "care" ? nw.buttonPrimary : "border border-[color:var(--nw-border)] text-[color:var(--nw-text)]",
                        )}
                    >
                        Taubencare
                    </button>
                </div>
            </div>

            {status ? (
                <div className={nw.panelPadded}>
                    <p className={nw.statusInfo}>{status}</p>
                </div>
            ) : null}

            {activeTab === "tasks" ? (
                <section className="space-y-6">
                    <div className={`${nw.panelPadded} shadow-lg shadow-slate-400/20 sm:p-8`}>
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <p className={nw.sectionTitle}>Taubenstation Südkreuz</p>
                                <h2 className={`mt-2 text-3xl font-semibold sm:text-4xl ${nw.textPrimary}`}>Ninas Work</h2>
                                <p className={`mt-3 max-w-2xl text-sm leading-6 sm:text-base ${nw.textMuted}`}>
                                    Hier werden die Tasks für das Taubenhaus verwaltet!
                                </p>
                                <p className={nw.compactTitle}>Eingeloggt als: {currentEmployeeName}</p>
                            </div>

                            <div className={`grid grid-cols-3 gap-3 text-center text-xs font-medium ${nw.textMuted}`}>
                                <div className="rounded-2xl border border-[color:var(--nw-border)] bg-[color:var(--nw-bg)] px-4 py-3">
                                    <div className={`text-lg font-semibold ${nw.textPrimary}`}>{board.tasks.length}</div>
                                    Aufgaben
                                </div>
                                <div className="rounded-2xl border border-[color:var(--nw-border)] bg-[color:var(--nw-bg)] px-4 py-3">
                                    <div className={`text-lg font-semibold ${nw.textPrimary}`}>{openTasks}</div>
                                    Offen
                                </div>
                                <div className="rounded-2xl border border-[color:var(--nw-border)] bg-[color:var(--nw-bg)] px-4 py-3">
                                    <div className={`text-lg font-semibold ${nw.textPrimary}`}>{completedTasks}</div>
                                    Erledigt
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={nw.panelPadded}>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className={nw.sectionTitle}>Ansicht & Filter</p>
                                <h3 className={`mt-2 text-2xl font-semibold ${nw.textPrimary}`}>Aufgabenliste</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => setTaskViewMode("list")} className={cx(taskViewMode === "list" ? nw.buttonPrimary : nw.linkButton)}>Liste</button>
                                <button type="button" onClick={() => setTaskViewMode("calendar")} className={cx(taskViewMode === "calendar" ? nw.buttonPrimary : nw.linkButton)}>Kalender</button>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <label className="space-y-2">
                                <span className={nw.compactTitle}>Suche</span>
                                <input value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder="Task, Bereich, Mitarbeiter" className={nw.textInput} />
                            </label>
                            <label className="space-y-2">
                                <span className={nw.compactTitle}>Status</span>
                                <select value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value as TaskStatusFilter)} className={nw.input}>
                                    <option value="all">Alle</option>
                                    <option value="open">Offen</option>
                                    <option value="done">Erledigt</option>
                                </select>
                            </label>
                            <label className="space-y-2">
                                <span className={nw.compactTitle}>Bearbeiter</span>
                                <select value={taskAssigneeFilter} onChange={(event) => setTaskAssigneeFilter(event.target.value)} className={nw.input}>
                                    <option value="all">Alle</option>
                                    <option value="unassigned">Unzugewiesen</option>
                                    {board.employees.map((employee) => (
                                        <option key={employee.id} value={String(employee.id)}>{employee.username}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="space-y-2">
                                <span className={nw.compactTitle}>Bereich</span>
                                <select value={taskAreaFilter} onChange={(event) => setTaskAreaFilter(event.target.value)} className={nw.input}>
                                    <option value="all">Alle</option>
                                    {taskAreas.map((area) => (
                                        <option key={area} value={area}>{area}</option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p className={nw.compactTitle}>{filteredTasks.length} gefilterte Aufgaben</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setTaskStatusFilter("all");
                                    setTaskAssigneeFilter("all");
                                    setTaskAreaFilter("all");
                                    setTaskSearch("");
                                }}
                                className={nw.linkButton}
                            >
                                Filter zurücksetzen
                            </button>
                        </div>
                    </div>

                    {taskViewMode === "calendar" ? (
                        <div className={nw.panelPadded}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h3 className={`mt-2 text-2xl font-semibold ${nw.textPrimary}`}>Aufgaben nach Tagen</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" className={nw.linkButton} onClick={() => setCalendarStartDate(addDaysIso(calendarStartDate, -visibleCalendarDays))}>◀</button>
                                    <button type="button" className={nw.linkButton} onClick={() => setCalendarStartDate(todayIso())}>Heute</button>
                                    <button type="button" className={nw.linkButton} onClick={() => setCalendarStartDate(addDaysIso(calendarStartDate, visibleCalendarDays))}>▶</button>
                                </div>
                            </div>

                            <div className="mt-5 grid gap-4" style={{ gridTemplateColumns: `repeat(${visibleCalendarDays}, minmax(0, 1fr))` }}>
                                {calendarDays.map((day) => (
                                    <div key={day} className="rounded-2xl border border-[color:var(--nw-border)] bg-[color:var(--nw-bg)] p-3">
                                        <p className={nw.compactTitle}>{formatDueDateLabel(day)}</p>
                                        <div className="mt-3 space-y-2">
                                            {(tasksByDay.get(day) ?? []).length === 0 ? (
                                                <p className={`text-xs ${nw.textMuted}`}>Keine Aufgaben</p>
                                            ) : (
                                                (tasksByDay.get(day) ?? []).map((task) => (
                                                    <article key={task.id} className={cx("relative", selectedTaskId === task.id ? nw.taskCardExpanded : nw.taskCard)}>
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => setSelectedTaskId((current) => (current === task.id ? null : task.id))}
                                                            onKeyDown={(event) => {
                                                                if (event.key === "Enter" || event.key === " ") {
                                                                    event.preventDefault();
                                                                    setSelectedTaskId((current) => (current === task.id ? null : task.id));
                                                                }
                                                            }}
                                                            className="w-full p-4 text-left"
                                                        >
                                                            <p className="text-xs font-semibold">#{task.id} {task.task}</p>
                                                            <p className={`mt-1 text-xs ${nw.textMuted}`}>{assigneeLabel(task.assigneeUsername)}</p>
                                                            <p className={cx("mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                                                                task.assigneeEmployeeId ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700")}
                                                            >
                                                                {task.assigneeEmployeeId ? assigneeLabel(task.assigneeUsername) : "Unzugewiesen"}
                                                            </p>
                                                        </div>

                                                        {selectedTaskId === task.id ? renderTaskExpanded(task, "calendar") : null}
                                                    </article>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {taskViewMode === "list" ? (
                        <div className="space-y-3">
                            {filteredTasks.length === 0 ? (
                                <div className={nw.panelPadded}>
                                    <p className={nw.textMuted}>Keine Aufgaben passend zu den Filtern gefunden.</p>
                                </div>
                            ) : (
                                filteredTasks.map((task) => {
                                    const expanded = task.id === selectedTaskId;

                                    return (
                                        <article key={task.id} className={expanded ? nw.taskCardExpanded : nw.taskCard}>
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setSelectedTaskId((current) => (current === task.id ? null : task.id))}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter" || event.key === " ") {
                                                        event.preventDefault();
                                                        setSelectedTaskId((current) => (current === task.id ? null : task.id));
                                                    }
                                                }}
                                                aria-expanded={expanded}
                                                className="w-full p-5 text-left"
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-4">
                                                    <div className="space-y-2">
                                                        <div className={nw.taskMeta}>
                                                            <span>#{task.id}</span>
                                                            <span>{task.area}</span>
                                                            <span>Fällig: {formatDueDateLabel(task.dueDate)}</span>
                                                        </div>
                                                        <h3 className={nw.taskTitle}>{task.task}</h3>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <span className={`text-sm ${nw.textMuted}`}>Bearbeiter</span>
                                                            <span className={cx(nw.assigneeBadge, task.assigneeEmployeeId ? nw.assigneeOk : nw.assigneeMissing)}>
                                                                {assigneeLabel(task.assigneeUsername)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                void toggleTaskDone(task);
                                                            }}
                                                            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] ${task.done ? nw.stateDone : nw.stateOpen}`}
                                                        >
                                                            {taskStatusLabel(task)}
                                                        </button>
                                                        <svg className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : "rotate-0"}`} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                                            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {expanded ? (
                                                renderTaskExpanded(task)
                                            ) : null}
                                        </article>
                                    );
                                })
                            )}
                        </div>
                    ) : null}
                </section>
            ) : null}

            {activeTab === "create" ? (
                <section className="space-y-6">
                    <div className={nw.panelPadded}>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className={nw.sectionTitle}>Neue Aufgabe</p>
                                <h3 className={`mt-2 text-2xl font-semibold ${nw.textPrimary}`}>Erstellen</h3>
                            </div>
                            <button type="button" onClick={createTask} className={`${nw.buttonPrimaryMd} px-4 py-2`}>Speichern</button>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            {isAdmin ? (
                                <label className="space-y-2">
                                    <span className={nw.compactTitle}>Ersteller</span>
                                    <select value={createForm.creatorEmployeeId} onChange={(event) => setCreateForm((current) => ({ ...current, creatorEmployeeId: Number(event.target.value) }))} className={nw.input}>
                                        {board.employees.map((employee) => (
                                            <option key={employee.id} value={employee.id}>{employee.username}</option>
                                        ))}
                                    </select>
                                </label>
                            ) : (
                                <div className="space-y-2">
                                    <span className={nw.compactTitle}>Ersteller</span>
                                    <p className={nw.staticField}>{currentEmployeeName}</p>
                                </div>
                            )}

                            <label className="space-y-2">
                                <span className={nw.compactTitle}>Bearbeiter</span>
                                <select value={createForm.assigneeEmployeeId ?? ""} onChange={(event) => setCreateForm((current) => ({ ...current, assigneeEmployeeId: event.target.value ? Number(event.target.value) : null }))} className={cx(nw.input, !createForm.assigneeEmployeeId && nw.assigneeMissing)}>
                                    <option value="">Unzugewiesen</option>
                                    {board.employees.map((employee) => (
                                        <option key={employee.id} value={employee.id}>{employee.username}</option>
                                    ))}
                                </select>
                            </label>

                            <input value={createForm.area} onChange={(event) => setCreateForm((current) => ({ ...current, area: event.target.value }))} placeholder="Bereich" className={nw.textInput} />
                            <textarea
                                value={createForm.task}
                                onChange={(event) => setCreateForm((current) => ({ ...current, task: event.target.value }))}
                                onInput={autoResizeTextarea}
                                placeholder="Aufgabe"
                                rows={2}
                                className={cx(nw.textInput, "resize-none overflow-hidden")}
                            />

                            <label className="space-y-2 sm:col-span-2">
                                <span className={nw.compactTitle}>Fälligkeitstag</span>
                                <input type="date" value={createForm.dueDate} onChange={(event) => setCreateForm((current) => ({ ...current, dueDate: event.target.value }))} className={nw.input} />
                            </label>
                        </div>
                    </div>

                    {isAdmin ? (
                        <div className={nw.panelPadded}>
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className={nw.sectionTitle}>Mastertasks</p>
                                    <h3 className={`mt-2 text-2xl font-semibold ${nw.textPrimary}`}>Wiederkehrende Aufgaben</h3>
                                    <p className={`mt-2 text-sm ${nw.textMuted}`}>Änderungen werden auf zukünftige, nicht manuell angepasste Subtasks übertragen. Es werden immer 14 Tage voraus geplant.</p>
                                </div>
                                <button type="button" onClick={createMasterTask} className={`${nw.buttonPrimaryMd} px-4 py-2`}>Mastertask speichern</button>
                            </div>

                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                <label className="space-y-2">
                                    <span className={nw.compactTitle}>Ersteller</span>
                                    <select value={masterForm.creatorEmployeeId} onChange={(event) => setMasterForm((current) => ({ ...current, creatorEmployeeId: Number(event.target.value) }))} className={nw.input}>
                                        {board.employees.map((employee) => (
                                            <option key={employee.id} value={employee.id}>{employee.username}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="space-y-2">
                                    <span className={nw.compactTitle}>Bearbeiter</span>
                                    <select value={masterForm.assigneeEmployeeId ?? ""} onChange={(event) => setMasterForm((current) => ({ ...current, assigneeEmployeeId: event.target.value ? Number(event.target.value) : null }))} className={nw.input}>
                                        <option value="">Unzugewiesen</option>
                                        {board.employees.map((employee) => (
                                            <option key={employee.id} value={employee.id}>{employee.username}</option>
                                        ))}
                                    </select>
                                </label>

                                <input value={masterForm.area} onChange={(event) => setMasterForm((current) => ({ ...current, area: event.target.value }))} placeholder="Bereich" className={nw.textInput} />
                                <input value={masterForm.task} onChange={(event) => setMasterForm((current) => ({ ...current, task: event.target.value }))} placeholder="Mastertask" className={nw.textInput} />

                                <label className="space-y-2">
                                    <span className={nw.compactTitle}>Intervall (Tage)</span>
                                    <input type="number" min={1} value={masterForm.frequencyDays} onChange={(event) => setMasterForm((current) => ({ ...current, frequencyDays: Number(event.target.value) || 1 }))} className={nw.input} />
                                </label>

                                <label className="space-y-2">
                                    <span className={nw.compactTitle}>Startdatum</span>
                                    <input type="date" value={masterForm.startDate} onChange={(event) => setMasterForm((current) => ({ ...current, startDate: event.target.value }))} className={nw.input} />
                                </label>
                            </div>

                            <div className="mt-6 space-y-3">
                                {board.recurringMasterTasks.map((masterTask) => (
                                    <article key={masterTask.id} className={nw.listCard}>
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className={nw.taskMeta}>
                                                    <span>#{masterTask.id}</span>
                                                    <span>Alle {masterTask.frequencyDays} Tage</span>
                                                    <span>Start: {masterTask.startDate}</span>
                                                </p>
                                                <h4 className={`mt-2 text-lg font-semibold ${nw.textPrimary}`}>{masterTask.task}</h4>
                                                <p className={`mt-1 text-sm ${nw.textMuted}`}>Bereich: {masterTask.area} | Bearbeiter: {assigneeLabel(masterTask.assigneeUsername)}</p>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <button type="button" onClick={() => quickEditMasterTask(masterTask)} className={nw.linkButton}>Bearbeiten</button>
                                                <button type="button" onClick={() => toggleMasterTaskActive(masterTask)} className={nw.linkButton}>{masterTask.active ? "Pausieren" : "Aktivieren"}</button>
                                                <button type="button" onClick={() => deleteMasterTask(masterTask)} className={nw.buttonDanger}>Löschen</button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </section>
            ) : null}

            {activeTab === "care" ? (
                <section className="space-y-6">
                    <div className={nw.panelPadded}>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className={nw.sectionTitle}>Taubencare</p>
                                <h3 className={`mt-2 text-2xl font-semibold ${nw.textPrimary}`}>Pflegeübersicht</h3>
                            </div>
                            <button type="button" onClick={createCareTask} className={`${nw.buttonPrimaryMd} px-4 py-2`}>Eintrag speichern</button>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <input value={careForm.birdName} onChange={(event) => setCareForm((current) => ({ ...current, birdName: event.target.value }))} placeholder="Name des Vogels" className={nw.textInput} />
                            <input value={careForm.careType} onChange={(event) => setCareForm((current) => ({ ...current, careType: event.target.value }))} placeholder="Medizin, Futter, etc." className={nw.textInput} />
                            <label className="space-y-2">
                                <span className={nw.compactTitle}>Aufgenommen am</span>
                                <input type="date" value={careForm.admittedAt} onChange={(event) => setCareForm((current) => ({ ...current, admittedAt: event.target.value }))} className={nw.input} />
                            </label>
                            <label className="space-y-2">
                                <span className={nw.compactTitle}>Entlassen am (optional)</span>
                                <input type="date" value={careForm.dischargedAt} onChange={(event) => setCareForm((current) => ({ ...current, dischargedAt: event.target.value }))} className={nw.input} />
                            </label>
                            <label className="space-y-2 sm:col-span-2">
                                <span className={nw.compactTitle}>Bild hochladen</span>
                                <input type="file" accept="image/*" onChange={(event) => { void setCareImageFromFile(event.target.files?.[0] ?? null); }} className={nw.input} />
                            </label>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {board.taubenCareTasks.map((careTask) => (
                            <article key={careTask.id} className={nw.listCard}>
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex gap-4">
                                        {careTask.birdImage ? (
                                            <img src={careTask.birdImage} alt={careTask.birdName} className="h-20 w-20 rounded-2xl object-cover" />
                                        ) : (
                                            <div className="h-20 w-20 rounded-2xl border border-[color:var(--nw-border)] bg-[color:var(--nw-bg)]" />
                                        )}
                                        <div>
                                            <p className={nw.taskMeta}>
                                                <span>#{careTask.id}</span>
                                                <span>Aufnahme: {careTask.admittedAt}</span>
                                                <span>{careTask.dischargedAt ? `Entlassen: ${careTask.dischargedAt}` : "Noch in Pflege"}</span>
                                            </p>
                                            <h4 className={`mt-2 text-lg font-semibold ${nw.textPrimary}`}>{careTask.birdName}</h4>
                                            <p className={`mt-1 text-sm ${nw.textMuted}`}>{careTask.careType}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => markCareDischarged(careTask)} className={nw.linkButton}>{careTask.dischargedAt ? "Wieder aktiv" : "Entlassen"}</button>
                                        <button type="button" onClick={() => deleteCareTask(careTask)} className={nw.buttonDanger}>Löschen</button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            ) : null}
        </section>
    );
}

