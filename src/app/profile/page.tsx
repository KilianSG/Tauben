import Link from "next/link";
import { getSessionEmployee } from "@/lib/ninas-work/auth";
import { getBoardData } from "@/lib/ninas-work/linked-db";
import { nw } from "@/components/ninas-work/uiClasses";

export const runtime = "nodejs";

export default async function ProfilePage() {
    const employee = await getSessionEmployee();

    if (!employee) {
        return (
            <section className={nw.dangerPanel}>
                <h2 className="text-2xl font-semibold">Nicht eingeloggt</h2>
                <p className="mt-3 text-sm">Bitte melde dich zuerst auf der Ninas-Work-Seite an.</p>
                <Link href="/" className={nw.linkButtonSolid}>
                    Zurück zu Ninas Work
                </Link>
            </section>
        );
    }

    const board = await getBoardData();
    const createdTasks = board.tasks.filter((task) => task.creatorEmployeeId === employee.id).length;
    const assignedTasks = board.tasks.filter((task) => task.assigneeEmployeeId === employee.id).length;
    const doneAssignedTasks = board.tasks.filter((task) => task.assigneeEmployeeId === employee.id && task.done).length;

    return (
        <section className="mx-auto w-full max-w-3xl space-y-6">
            <div className={nw.panelPadded}>
                <p className={nw.sectionTitle}>Mein Profil</p>
                <h2 className={`mt-2 text-3xl font-semibold ${nw.textPrimary}`}>{employee.username}</h2>
                <p className={`mt-3 text-sm ${nw.textMuted}`}>{employee.description}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <article className={nw.metricCard}>
                    <p className={nw.metricLabel}>Erstellt</p>
                    <p className={nw.metricValue}>{createdTasks}</p>
                </article>
                <article className={nw.metricCard}>
                    <p className={nw.metricLabel}>Zugewiesen</p>
                    <p className={nw.metricValue}>{assignedTasks}</p>
                </article>
                <article className={nw.metricCard}>
                    <p className={nw.metricLabel}>Erledigt</p>
                    <p className={nw.metricValue}>{doneAssignedTasks}</p>
                </article>
            </div>

            <Link href="/" className={nw.linkButton}>
                Zurück zur Aufgabenübersicht
            </Link>
        </section>
    );
}