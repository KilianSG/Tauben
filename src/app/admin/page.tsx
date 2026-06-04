import Link from "next/link";
import NinasWorkAdmin from "@/components/ninas-work/NinasWorkAdmin";
import { getBoardData } from "@/lib/ninas-work/linked-db";
import { getSessionEmployee, isAdminSession } from "@/lib/ninas-work/auth";
import { nw } from "@/components/ninas-work/uiClasses";

export const runtime = "nodejs";

export default async function AdminPage() {
    const employee = await getSessionEmployee();
    const isAdmin = await isAdminSession();

    if (!employee || !isAdmin) {
        return (
            <section className={nw.dangerPanel}>
                <h2 className="text-2xl font-semibold">Kein Zugriff</h2>
                <p className="mt-3 text-sm">Der Adminbereich ist nur für die Admin-Person freigeschaltet.</p>
                <Link href="/" className={nw.linkButtonSolid}>
                    Zurück zu Ninas Work
                </Link>
            </section>
        );
    }

    const board = await getBoardData();
    return <NinasWorkAdmin initialEmployees={board.employees} currentEmployeeName={employee.username} />;
}