import { cookies } from "next/headers";
import { getEmployeeByIdPublic, isEmployeeAdmin, isDatabaseConfigError } from "@/lib/ninas-work/linked-db";

export const NINAS_WORK_SESSION_COOKIE = "ninas-work-session";

export function parseSessionEmployeeId(rawValue: string | undefined) {
    if (!rawValue) {
        return null;
    }

    const employeeId = Number(rawValue);
    if (Number.isNaN(employeeId) || employeeId <= 0) {
        return null;
    }

    return employeeId;
}

export async function getSessionEmployeeId() {
    const cookieStore = await cookies();
    return parseSessionEmployeeId(cookieStore.get(NINAS_WORK_SESSION_COOKIE)?.value);
}

export async function getSessionEmployee() {
    const employeeId = await getSessionEmployeeId();
    if (!employeeId) {
        return null;
    }

    try {
        return await getEmployeeByIdPublic(employeeId);
    } catch (error) {
        if (isDatabaseConfigError(error)) {
            return null;
        }

        throw error;
    }
}

export async function isAdminSession() {
    const employeeId = await getSessionEmployeeId();
    if (!employeeId) {
        return false;
    }

    try {
        return await isEmployeeAdmin(employeeId);
    } catch (error) {
        if (isDatabaseConfigError(error)) {
            return false;
        }

        throw error;
    }
}
