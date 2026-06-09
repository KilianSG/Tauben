import NinasWorkBoard from "@/components/ninas-work/NinasWorkBoardLinked";
import NinasWorkHeaderMenu from "@/components/ninas-work/NinasWorkHeaderMenu";
import NinasWorkLogin from "@/components/ninas-work/NinasWorkLogin";
import { nw } from "@/components/ninas-work/uiClasses";
import { getSessionEmployeeId, getSessionEmployee, isAdminSession } from "@/lib/ninas-work/auth";
import { getBoardData, isDatabaseConfigError } from "@/lib/ninas-work/linked-db";

export const runtime = "nodejs";

export default async function NinasWorkRootPage() {
    let board;

    try {
        board = await getBoardData();
    } catch (error) {
        if (isDatabaseConfigError(error)) {
            return (
                <section className={nw.dangerPanel}>
                    <h2 className="text-2xl font-semibold">Datenbank nicht konfiguriert</h2>
                    <p className="mt-3 text-sm">
                        Bitte setze <strong>DATABASE_URL</strong> (oder <strong>POSTGRES_URL</strong>) in deiner Umgebung,
                        damit Ninas Work gestartet werden kann.
                    </p>
                    <p className="mt-3 text-sm">
                        <strong>Grund:</strong> {error.message}
                    </p>
                </section>
            );
        }

        throw error;
    }

    const sessionEmployeeId = await getSessionEmployeeId();

    if (!sessionEmployeeId) {
        return <NinasWorkLogin employees={board.employees} />;
    }

    const currentEmployee = board.employees.find((employee) => employee.id === sessionEmployeeId) ?? null;
    if (!currentEmployee) {
        return <NinasWorkLogin employees={board.employees} />;
    }

    const isAdmin = currentEmployee.username === "Stationsleitung";

    return (
        <div className="ninas-work-theme min-h-screen bg-[radial-gradient(circle_at_top,_rgba(129,161,193,0.26),_transparent_46%),linear-gradient(180deg,_var(--nw-bg)_0%,_var(--nw-bg-alt)_100%)] text-[color:var(--nw-text)]">
            <header className="sticky top-0 z-40 border-b border-[color:var(--nw-border)] bg-[color:var(--nw-surface)]/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
                    <div>
                        <h1 className={`mt-1 text-lg font-semibold ${nw.textPrimary}`}>Ninas Work</h1>
                    </div>

                    <NinasWorkHeaderMenu
                        isLoggedIn={Boolean(currentEmployee)}
                        isAdmin={isAdmin}
                        employeeName={currentEmployee?.username ?? null}
                    />
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-12 sm:py-16">
                <NinasWorkBoard
                    initialBoard={board}
                    currentEmployeeId={sessionEmployeeId}
                    currentEmployeeName={currentEmployee.username}
                    isAdmin={isAdmin}
                />
            </main>
        </div>
    );
}