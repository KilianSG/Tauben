"use client";

import { useEffect } from "react";
import { useState } from "react";
import { nw } from "@/components/ninas-work/uiClasses";

type Employee = {
    id: number;
    username: string;
    description: string;
};

type Props = {
    initialEmployees: Employee[];
    currentEmployeeName: string; // nichts
};

export default function NinasWorkAdmin({ initialEmployees, currentEmployeeName }: Props) {
    const [employees, setEmployees] = useState(initialEmployees);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployees[0]?.id ?? 0);
    const [username, setUsername] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        const selected = employees.find((employee) => employee.id === selectedEmployeeId);
        if (!selected) {
            return;
        }

        setUsername(selected.username);
        setDescription(selected.description);
    }, [employees, selectedEmployeeId]);

    const refreshEmployees = async () => {
        const response = await fetch("/api/ninas-work/employees", { cache: "no-store" });
        if (!response.ok) {
            setStatus("Mitarbeiter konnten nicht geladen werden.");
            return;
        }

        const payload = (await response.json()) as { employees: Employee[] };
        setEmployees(payload.employees);
        if (!payload.employees.some((item) => item.id === selectedEmployeeId)) {
            setSelectedEmployeeId(payload.employees[0]?.id ?? 0);
        }
    };

    const createEmployee = async () => {
        const response = await fetch("/api/ninas-work/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, description }),
        });

        if (!response.ok) {
            setStatus("Mitarbeiter konnte nicht angelegt werden.");
            return;
        }

        setUsername("");
        setDescription("");
        setStatus("Mitarbeiter angelegt.");
        await refreshEmployees();
    };

    const updateEmployee = async () => {
        if (!selectedEmployeeId) {
            setStatus("Bitte Mitarbeiter auswählen.");
            return;
        }

        const response = await fetch(`/api/ninas-work/employees/${selectedEmployeeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, description }),
        });

        if (!response.ok) {
            setStatus("Mitarbeiter konnte nicht geändert werden.");
            return;
        }

        setStatus("Mitarbeiter geändert.");
        await refreshEmployees();
    };

    const removeEmployee = async () => {
        if (!selectedEmployeeId) {
            setStatus("Bitte Mitarbeiter auswählen.");
            return;
        }

        const response = await fetch(`/api/ninas-work/employees/${selectedEmployeeId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            setStatus("Mitarbeiter konnte nicht gelöscht werden. Prüfe offene Aufgaben/Threads.");
            return;
        }

        setStatus("Mitarbeiter gelöscht.");
        await refreshEmployees();
    };

    return (
        <section className="mx-auto w-full max-w-4xl space-y-6">
            <div className={nw.panelPadded}>
                <p className={nw.sectionTitle}>Adminbereich</p>
                <h2 className={`mt-2 text-3xl font-semibold ${nw.textPrimary}`}>Benutzerverwaltung</h2>
                <p className={`mt-3 text-sm ${nw.textMuted}`}>Angemeldet als Admin: {currentEmployeeName}</p>
                {status ? (
                    <p className={nw.statusInfo}>
                        {status}
                    </p>
                ) : null}
            </div>

            <div className={nw.panelPadded}>
                <div className="grid gap-3 sm:grid-cols-2">
                    <select
                        value={selectedEmployeeId}
                        onChange={(event) => setSelectedEmployeeId(Number(event.target.value))}
                        className={nw.input}
                    >
                        {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                                #{employee.id} {employee.username}
                            </option>
                        ))}
                    </select>
                    <input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="Nutzername"
                        className={nw.textInput}
                    />
                    <input
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Beschreibung"
                        className={`${nw.textInput} sm:col-span-2`}
                    />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={createEmployee}
                        className={nw.buttonSuccess}
                    >
                        Benutzer anlegen
                    </button>
                    <button
                        type="button"
                        onClick={updateEmployee}
                        className={`${nw.buttonPrimaryMd} rounded-2xl px-5 py-3`}
                    >
                        Benutzer ändern
                    </button>
                    <button
                        type="button"
                        onClick={removeEmployee}
                        className={nw.buttonDangerMd}
                    >
                        Benutzer entfernen
                    </button>
                </div>

                <div className="mt-6 space-y-2">
                    {employees.map((employee) => (
                        <div key={employee.id} className={`${nw.metricCard} p-3`}>
                            <p className={`text-sm font-semibold ${nw.textPrimary}`}>#{employee.id} {employee.username}</p>
                            <p className={`text-sm ${nw.textMuted}`}>{employee.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
