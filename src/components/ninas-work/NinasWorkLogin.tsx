"use client";

import { useState } from "react";
import { nw } from "@/components/ninas-work/uiClasses";

type Employee = {
    id: number;
    username: string;
    description: string;
};

export default function NinasWorkLogin({ employees }: { employees: Employee[] }) {
    const [employeeId, setEmployeeId] = useState<number>(employees[0]?.id ?? 0);
    const [status, setStatus] = useState<string | null>(null);

    const login = async () => {
        if (!employeeId) {
            setStatus("Bitte Mitarbeiter auswählen.");
            return;
        }

        const response = await fetch("/api/ninas-work/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employeeId }),
        });

        if (!response.ok) {
            setStatus("Login fehlgeschlagen.");
            return;
        }

        window.location.reload();
    };

    return (
        <section className={`${nw.panelPaddedLg} mx-auto w-full max-w-xl shadow-lg shadow-slate-400/20`}>
            <p className={nw.sectionTitle}>Ninas Work Login</p>
            <h2 className={`mt-3 text-3xl font-semibold ${nw.textPrimary}`}>Anmeldung als Mitarbeiter</h2>
            <p className={`mt-3 text-sm leading-6 ${nw.textMuted}`}>
                Aktuell ohne Passwortprüfung. Die Anmeldung wird als Cookie gespeichert und ist damit für dieses System persistent.
            </p>

            {status ? (
                <p className={nw.statusDanger}>
                    {status}
                </p>
            ) : null}

            <div className="mt-6 space-y-3">
                <label className={nw.compactTitle}>Mitarbeiter</label>
                <select
                    value={employeeId}
                    onChange={(event) => setEmployeeId(Number(event.target.value))}
                    className={nw.input}
                >
                    {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                            {employee.username}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={login}
                    className={`${nw.buttonPrimaryMd} w-full rounded-2xl px-5 py-3`}
                >
                    Einloggen
                </button>
            </div>
        </section>
    );
}
