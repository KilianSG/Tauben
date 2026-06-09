import bcrypt from "bcryptjs";
import postgres from "postgres";

export type EmployeeRecord = {
    id: number;
    username: string;
    description: string;
};

export type ThreadMessageRecord = {
    id: number;
    authorEmployeeId: number;
    authorUsername: string;
    text: string;
    createdAt: string;
};

type TaskRow = {
    id: number;
    creatorEmployeeId: number | null;
    creatorUsername: string;
    assigneeEmployeeId: number | null;
    assigneeUsername: string;
    masterTaskId: number | null;
    manualOverride: boolean;
    task: string;
    area: string;
    dueDate: string;
    done: boolean;
};

export type RecurringMasterTask = {
    id: number;
    creatorEmployeeId: number;
    creatorUsername: string;
    assigneeEmployeeId: number | null;
    assigneeUsername: string;
    task: string;
    area: string;
    frequencyDays: number;
    startDate: string;
    active: boolean;
};

type RecurringMasterTaskRow = {
    id: number;
    creatorEmployeeId: number;
    creatorUsername: string;
    assigneeEmployeeId: number | null;
    assigneeUsername: string;
    task: string;
    area: string;
    frequencyDays: number;
    startDate: string;
    active: boolean;
};

export type TaubenCareTask = {
    id: number;
    birdName: string;
    birdImage: string | null;
    careType: string;
    admittedAt: string;
    dischargedAt: string | null;
};

type TaubenCareTaskRow = {
    id: number;
    birdName: string;
    birdImage: string | null;
    careType: string;
    admittedAt: string;
    dischargedAt: string | null;
};

export type BoardTask = {
    id: number;
    creatorEmployeeId: number;
    creatorUsername: string;
    assigneeEmployeeId: number | null;
    assigneeUsername: string;
    masterTaskId: number | null;
    manualOverride: boolean;
    task: string;
    area: string;
    dueDate: string;
    done: boolean;
    thread: ThreadMessageRecord[];
};

export type BoardData = {
    tasks: BoardTask[];
    employees: EmployeeRecord[];
    recurringMasterTasks: RecurringMasterTask[];
    taubenCareTasks: TaubenCareTask[];
};

type TaskInput = {
    creatorEmployeeId: number;
    assigneeEmployeeId: number | null;
    task: string;
    area: string;
    dueDate: string;
};

type RecurringMasterTaskInput = {
    creatorEmployeeId: number;
    assigneeEmployeeId: number | null;
    task: string;
    area: string;
    frequencyDays: number;
    startDate: string;
    active?: boolean;
};

type RecurringMasterTaskUpdateInput = Partial<RecurringMasterTaskInput>;

type TaubenCareTaskInput = {
    birdName: string;
    birdImage: string | null;
    careType: string;
    admittedAt: string;
    dischargedAt?: string | null;
};

type TaubenCareTaskUpdateInput = Partial<TaubenCareTaskInput>;

type TaskUpdateInput = Partial<TaskInput> & {
    done?: boolean;
};

type EmployeeInput = {
    username: string;
    description: string;
};

type MessageInput = {
    authorEmployeeId: number;
    text: string;
};

export class DatabaseConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DatabaseConfigError";
    }
}

export function isDatabaseConfigError(error: unknown): error is DatabaseConfigError {
    return error instanceof DatabaseConfigError;
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    return "Unknown database error.";
}

function getErrorCode(error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
        const code = (error as { code?: unknown }).code;
        return typeof code === "string" ? code : null;
    }

    return null;
}

function toDatabaseConfigError(error: unknown): DatabaseConfigError | null {
    if (isDatabaseConfigError(error)) {
        return error;
    }

    const message = getErrorMessage(error);
    const code = getErrorCode(error);
    const normalized = `${code ? `${code} ` : ""}${message}`.toLowerCase();

    const looksLikeConfigIssue =
        /database_url|postgres_url|connection string|invalid url|url/i.test(normalized) ||
        /password authentication failed|no pg_hba.conf|invalid authorization specification/i.test(normalized) ||
        /econnrefused|enotfound|eai_again|connect timeout|connection terminated unexpectedly/i.test(normalized);

    if (!looksLikeConfigIssue) {
        return null;
    }

    return new DatabaseConfigError(`Database-Verbindung fehlgeschlagen: ${message}`);
}

function resolveDatabaseUrl() {
    const dbUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!dbUrl) {
        throw new DatabaseConfigError("DATABASE_URL (or POSTGRES_URL) is not configured.");
    }

    return dbUrl;
}

type SqlClient = ReturnType<typeof postgres>;

let sqlClient: SqlClient | null = null;

function getSqlClient() {
    if (!sqlClient) {
        sqlClient = postgres(resolveDatabaseUrl(), {
            ssl: process.env.NODE_ENV === "production" ? "require" : "prefer",
            max: 1,
        });
    }

    return sqlClient;
}

const sql = Object.assign(
    ((strings: TemplateStringsArray, ...values: unknown[]) => (getSqlClient() as any)(strings, ...values)) as SqlClient,
    {
        begin: <T>(fn: (tx: any) => Promise<T>) => getSqlClient().begin(fn as any),
    },
);

let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
    if (initialized) {
        return;
    }

    if (!initPromise) {
        initPromise = initialize();
    }

    try {
        await initPromise;
    } catch (error) {
        const configError = toDatabaseConfigError(error);
        if (configError) {
            throw configError;
        }

        throw error;
    }

    initialized = true;
}

async function initialize() {
    await sql.begin(async (tx) => {
        await tx`
            CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                description TEXT NOT NULL,
                password_hash TEXT NOT NULL
            )
        `;

        await tx`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                creator_employee_id INTEGER REFERENCES employees(id),
                creator TEXT NOT NULL DEFAULT '',
                assignee_employee_id INTEGER REFERENCES employees(id),
                assignee TEXT NOT NULL DEFAULT '',
                task TEXT NOT NULL,
                area TEXT NOT NULL,
                due_date DATE NOT NULL DEFAULT CURRENT_DATE,
                done BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `;

        await tx`
            CREATE TABLE IF NOT EXISTS task_messages (
                id SERIAL PRIMARY KEY,
                task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                author_employee_id INTEGER REFERENCES employees(id),
                author TEXT NOT NULL DEFAULT '',
                text TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `;

        await tx`
            CREATE TABLE IF NOT EXISTS recurring_master_tasks (
                id SERIAL PRIMARY KEY,
                creator_employee_id INTEGER NOT NULL REFERENCES employees(id),
                assignee_employee_id INTEGER REFERENCES employees(id),
                task TEXT NOT NULL,
                area TEXT NOT NULL,
                frequency_days INTEGER NOT NULL CHECK (frequency_days > 0),
                start_date DATE NOT NULL DEFAULT CURRENT_DATE,
                active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `;

        await tx`
            CREATE TABLE IF NOT EXISTS tauben_care_tasks (
                id SERIAL PRIMARY KEY,
                bird_name TEXT NOT NULL,
                bird_image TEXT,
                care_type TEXT NOT NULL,
                admitted_at DATE NOT NULL,
                discharged_at DATE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `;

        await tx`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS master_task_id INTEGER REFERENCES recurring_master_tasks(id) ON DELETE SET NULL`;
        await tx`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN NOT NULL DEFAULT FALSE`;
        await tx`CREATE UNIQUE INDEX IF NOT EXISTS tasks_master_due_unique_idx ON tasks(master_task_id, due_date) WHERE master_task_id IS NOT NULL`;

        const seedEmployees = [
            {
                username: "Stationsleitung",
                description: "Hält die Taubenroute zusammen und hat immer den Überblick.",
                passwordHash: bcrypt.hashSync("stationsleitung-demo-passwort", 10),
            },
            {
                username: "Mara",
                description: "Schnell, leise und immer mit Thermobecher unterwegs.",
                passwordHash: bcrypt.hashSync("mara-demo-passwort", 10),
            },
            {
                username: "Nico",
                description: "Sieht Probleme, bevor sie zu Problemen werden.",
                passwordHash: bcrypt.hashSync("nico-demo-passwort", 10),
            },
            {
                username: "Aylin",
                description: "Organisiert Schichten, Kaffee und gute Stimmung.",
                passwordHash: bcrypt.hashSync("aylin-demo-passwort", 10),
            },
        ];

        for (const employee of seedEmployees) {
            await tx`
                INSERT INTO employees (username, description, password_hash)
                VALUES (${employee.username}, ${employee.description}, ${employee.passwordHash})
                ON CONFLICT (username) DO NOTHING
            `;
        }

        const taskCount = await tx<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM tasks`;
        if (taskCount[0]?.count > 0) {
            return;
        }

        const employees = await tx<EmployeeRecord[]>`
            SELECT id, username, description
            FROM employees
        `;

        const byName = new Map(employees.map((employee) => [employee.username, employee.id]));
        const stationsleitungId = byName.get("Stationsleitung");
        const maraId = byName.get("Mara");
        const nicoId = byName.get("Nico");
        const aylinId = byName.get("Aylin");

        if (!stationsleitungId || !maraId || !nicoId || !aylinId) {
            throw new Error("Seed employees are missing.");
        }

        const seedTasks = [
            {
                creatorEmployeeId: stationsleitungId,
                assigneeEmployeeId: maraId,
                creator: "Stationsleitung",
                assignee: "Mara",
                task: "Futterstelle vor dem Morgengang pruefen",
                area: "Aussenbereich",
                dueDate: "2026-06-03",
                done: false,
                messages: [{ authorEmployeeId: maraId, author: "Mara", text: "Wird direkt nach Dienstbeginn gemacht." }],
            },
            {
                creatorEmployeeId: stationsleitungId,
                assigneeEmployeeId: nicoId,
                creator: "Stationsleitung",
                assignee: "Nico",
                task: "Taubenbanden am Gleis Sued dokumentieren",
                area: "Beobachtung",
                dueDate: "2026-06-04",
                done: true,
                messages: [{ authorEmployeeId: nicoId, author: "Nico", text: "Dokumentation liegt im Logbuch. Keine Auffaelligkeiten." }],
            },
            {
                creatorEmployeeId: stationsleitungId,
                assigneeEmployeeId: aylinId,
                creator: "Stationsleitung",
                assignee: "Aylin",
                task: "Wasserbehaelter reinigen und neu befuellen",
                area: "Hygiene",
                dueDate: "2026-06-05",
                done: false,
                messages: [{ authorEmployeeId: aylinId, author: "Aylin", text: "Ich uebernehme das nach der Pause." }],
            },
        ];

        for (const task of seedTasks) {
            const insertedTask = await tx<{ id: number }[]>`
                INSERT INTO tasks (
                    creator_employee_id,
                    creator,
                    assignee_employee_id,
                    assignee,
                    task,
                    area,
                    due_date,
                    done
                ) VALUES (
                    ${task.creatorEmployeeId},
                    ${task.creator},
                    ${task.assigneeEmployeeId},
                    ${task.assignee},
                    ${task.task},
                    ${task.area},
                    ${task.dueDate},
                    ${task.done}
                )
                RETURNING id
            `;

            const taskId = insertedTask[0]?.id;
            for (const message of task.messages) {
                await tx`
                    INSERT INTO task_messages (task_id, author_employee_id, author, text)
                    VALUES (${taskId}, ${message.authorEmployeeId}, ${message.author}, ${message.text})
                `;
            }
        }

        const recurringCount = await tx<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM recurring_master_tasks`;
        if ((recurringCount[0]?.count ?? 0) === 0) {
            await tx`
                INSERT INTO recurring_master_tasks (
                    creator_employee_id,
                    assignee_employee_id,
                    task,
                    area,
                    frequency_days,
                    start_date,
                    active
                ) VALUES
                    (${stationsleitungId}, ${maraId}, ${"Taubendienst"}, ${"Station"}, 1, CURRENT_DATE, TRUE),
                    (${stationsleitungId}, ${nicoId}, ${"Pflanzen gießen"}, ${"Aussenbereich"}, 2, CURRENT_DATE, TRUE)
            `;
        }
    });
}

function mapMessagesByTask(messages: Array<ThreadMessageRecord & { taskId: number }>) {
    const grouped = new Map<number, ThreadMessageRecord[]>();

    for (const message of messages) {
        const threadMessage: ThreadMessageRecord = {
            id: message.id,
            authorEmployeeId: message.authorEmployeeId,
            authorUsername: message.authorUsername,
            text: message.text,
            createdAt: message.createdAt,
        };

        const existing = grouped.get(message.taskId);
        if (existing) {
            existing.push(threadMessage);
        } else {
            grouped.set(message.taskId, [threadMessage]);
        }
    }

    return grouped;
}

function startOfTodayIso() {
    return new Date().toISOString().slice(0, 10);
}

function addDaysIso(dateIso: string, days: number) {
    const base = new Date(`${dateIso}T00:00:00`);
    base.setDate(base.getDate() + days);
    return base.toISOString().slice(0, 10);
}

function diffDays(fromIso: string, toIso: string) {
    const from = new Date(`${fromIso}T00:00:00`).getTime();
    const to = new Date(`${toIso}T00:00:00`).getTime();
    return Math.floor((to - from) / 86400000);
}

function normalizeDateIso(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    return value.slice(0, 10);
}

async function getRecurringMasterTaskRows() {
    return sql<RecurringMasterTaskRow[]>`
        SELECT
            r.id,
            r.creator_employee_id::int AS "creatorEmployeeId",
            c.username AS "creatorUsername",
            r.assignee_employee_id::int AS "assigneeEmployeeId",
            COALESCE(a.username, '') AS "assigneeUsername",
            r.task,
            r.area,
            r.frequency_days::int AS "frequencyDays",
            r.start_date::text AS "startDate",
            r.active
        FROM recurring_master_tasks r
        JOIN employees c ON c.id = r.creator_employee_id
        LEFT JOIN employees a ON a.id = r.assignee_employee_id
        ORDER BY r.id ASC
    `;
}

function mapRecurringMasterTask(row: RecurringMasterTaskRow): RecurringMasterTask {
    return {
        id: row.id,
        creatorEmployeeId: row.creatorEmployeeId,
        creatorUsername: row.creatorUsername,
        assigneeEmployeeId: row.assigneeEmployeeId,
        assigneeUsername: row.assigneeUsername || "",
        task: row.task,
        area: row.area,
        frequencyDays: row.frequencyDays,
        startDate: row.startDate,
        active: Boolean(row.active),
    };
}

async function ensureRecurringTasksHorizon(daysAhead = 14) {
    const templates = await getRecurringMasterTaskRows();
    const todayIso = startOfTodayIso();
    const horizonIso = addDaysIso(todayIso, daysAhead);

    for (const template of templates) {
        if (!template.active) {
            continue;
        }

        const creatorUsername = template.creatorUsername;
        const assigneeUsername = template.assigneeUsername || "";

        for (let offset = 0; offset <= daysAhead; offset += 1) {
            const dueIso = addDaysIso(todayIso, offset);
            const delta = diffDays(template.startDate, dueIso);

            if (delta < 0 || delta % template.frequencyDays !== 0) {
                continue;
            }

            await sql`
                INSERT INTO tasks (
                    creator_employee_id,
                    creator,
                    assignee_employee_id,
                    assignee,
                    master_task_id,
                    is_manual_override,
                    task,
                    area,
                    due_date,
                    done
                )
                SELECT
                    ${template.creatorEmployeeId},
                    ${creatorUsername},
                    ${template.assigneeEmployeeId ?? null},
                    ${assigneeUsername},
                    ${template.id},
                    FALSE,
                    ${template.task},
                    ${template.area},
                    ${dueIso},
                    FALSE
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM tasks existing
                    WHERE existing.master_task_id = ${template.id}
                        AND existing.due_date = ${dueIso}
                )
            `;
        }

        await sql`
            DELETE FROM tasks
            WHERE master_task_id = ${template.id}
                AND due_date > ${horizonIso}
                AND is_manual_override = FALSE
        `;
    }
}

async function getTaubenCareTaskRows() {
    return sql<TaubenCareTaskRow[]>`
        SELECT
            id,
            bird_name AS "birdName",
            bird_image AS "birdImage",
            care_type AS "careType",
            admitted_at::text AS "admittedAt",
            discharged_at::text AS "dischargedAt"
        FROM tauben_care_tasks
        ORDER BY admitted_at DESC, id DESC
    `;
}

function mapTaubenCareTask(row: TaubenCareTaskRow): TaubenCareTask {
    return {
        id: row.id,
        birdName: row.birdName,
        birdImage: row.birdImage,
        careType: row.careType,
        admittedAt: row.admittedAt,
        dischargedAt: row.dischargedAt,
    };
}

async function getEmployeeById(employeeId: number) {
    const rows = await sql<EmployeeRecord[]>`
        SELECT id, username, description
        FROM employees
        WHERE id = ${employeeId}
        LIMIT 1
    `;

    return rows[0] ?? null;
}

export async function getEmployeeByIdPublic(employeeId: number) {
    await ensureInitialized();
    return getEmployeeById(employeeId);
}

export async function isEmployeeAdmin(employeeId: number) {
    const employee = await getEmployeeByIdPublic(employeeId);
    return employee?.username === "Stationsleitung";
}

export async function getBoardData(): Promise<BoardData> {
    await ensureInitialized();
    await ensureRecurringTasksHorizon(14);

    const tasks = await sql<TaskRow[]>`
        SELECT
            t.id,
            t.creator_employee_id AS "creatorEmployeeId",
            COALESCE(c.username, t.creator) AS "creatorUsername",
            t.assignee_employee_id AS "assigneeEmployeeId",
            COALESCE(a.username, t.assignee) AS "assigneeUsername",
            t.master_task_id AS "masterTaskId",
            t.is_manual_override AS "manualOverride",
            t.task,
            t.area,
            t.due_date::text AS "dueDate",
            t.done
        FROM tasks t
        LEFT JOIN employees c ON c.id = t.creator_employee_id
        LEFT JOIN employees a ON a.id = t.assignee_employee_id
        ORDER BY t.done ASC, t.id ASC
    `;

    const employees = await sql<EmployeeRecord[]>`
        SELECT id, username, description
        FROM employees
        ORDER BY id ASC
    `;

    const recurringMasterTasks = (await getRecurringMasterTaskRows()).map(mapRecurringMasterTask);
    const taubenCareTasks = (await getTaubenCareTaskRows()).map(mapTaubenCareTask);

    const taskIds = tasks.map((task) => task.id);
    const threadRows = taskIds.length
        ? await sql<Array<ThreadMessageRecord & { taskId: number }>>`
            SELECT
                m.id,
                m.task_id AS "taskId",
                COALESCE(m.author_employee_id, 0)::int AS "authorEmployeeId",
                COALESCE(e.username, m.author) AS "authorUsername",
                m.text,
                m.created_at::text AS "createdAt"
            FROM task_messages m
            LEFT JOIN employees e ON e.id = m.author_employee_id
            WHERE m.task_id = ANY(${taskIds})
            ORDER BY m.id ASC
        `
        : [];

    const threadsByTask = mapMessagesByTask(threadRows);

    return {
        tasks: tasks.map((task) => ({
            id: task.id,
            creatorEmployeeId: task.creatorEmployeeId ?? 0,
            creatorUsername: task.creatorUsername,
            assigneeEmployeeId: task.assigneeEmployeeId,
            assigneeUsername: task.assigneeUsername,
            masterTaskId: task.masterTaskId,
            manualOverride: Boolean(task.manualOverride),
            task: task.task,
            area: task.area,
            dueDate: task.dueDate,
            done: Boolean(task.done),
            thread: threadsByTask.get(task.id) ?? [],
        })),
        employees,
        recurringMasterTasks,
        taubenCareTasks,
    };
}

export async function getTaskById(taskId: number) {
    await ensureInitialized();

    const rows = await sql<TaskRow[]>`
        SELECT
            t.id,
            t.creator_employee_id AS "creatorEmployeeId",
            COALESCE(c.username, t.creator) AS "creatorUsername",
            t.assignee_employee_id AS "assigneeEmployeeId",
            COALESCE(a.username, t.assignee) AS "assigneeUsername",
            t.master_task_id AS "masterTaskId",
            t.is_manual_override AS "manualOverride",
            t.task,
            t.area,
            t.due_date::text AS "dueDate",
            t.done
        FROM tasks t
        LEFT JOIN employees c ON c.id = t.creator_employee_id
        LEFT JOIN employees a ON a.id = t.assignee_employee_id
        WHERE t.id = ${taskId}
        LIMIT 1
    `;

    const task = rows[0];
    if (!task) {
        return null;
    }

    const thread = await sql<ThreadMessageRecord[]>`
        SELECT
            m.id,
            COALESCE(m.author_employee_id, 0)::int AS "authorEmployeeId",
            COALESCE(e.username, m.author) AS "authorUsername",
            m.text,
            m.created_at::text AS "createdAt"
        FROM task_messages m
        LEFT JOIN employees e ON e.id = m.author_employee_id
        WHERE m.task_id = ${taskId}
        ORDER BY m.id ASC
    `;

    return {
        id: task.id,
        creatorEmployeeId: task.creatorEmployeeId ?? 0,
        creatorUsername: task.creatorUsername,
        assigneeEmployeeId: task.assigneeEmployeeId,
        assigneeUsername: task.assigneeUsername,
        masterTaskId: task.masterTaskId,
        manualOverride: Boolean(task.manualOverride),
        task: task.task,
        area: task.area,
        dueDate: task.dueDate,
        done: Boolean(task.done),
        thread,
    } as BoardTask;
}

export async function createTask(input: TaskInput) {
    await ensureInitialized();

    const creator = await getEmployeeById(input.creatorEmployeeId);
    if (!creator) {
        return null;
    }

    let assignee: EmployeeRecord | null = null;
    if (typeof input.assigneeEmployeeId === "number") {
        assignee = await getEmployeeById(input.assigneeEmployeeId);
        if (!assignee) {
            return null;
        }
    }

    const inserted = await sql<{ id: number }[]>`
        INSERT INTO tasks (
            creator_employee_id,
            creator,
            assignee_employee_id,
            assignee,
            master_task_id,
            is_manual_override,
            task,
            area,
            due_date,
            done
        ) VALUES (
            ${creator.id},
            ${creator.username},
            ${assignee?.id ?? null},
            ${assignee?.username ?? ""},
            NULL,
            FALSE,
            ${input.task},
            ${input.area},
            ${input.dueDate},
            FALSE
        )
        RETURNING id
    `;

    return getTaskById(inserted[0].id);
}

export async function updateTask(taskId: number, input: TaskUpdateInput) {
    await ensureInitialized();

    const current = await getTaskById(taskId);
    if (!current) {
        return null;
    }

    const nextCreatorId = input.creatorEmployeeId ?? current.creatorEmployeeId;
    const creator = await getEmployeeById(nextCreatorId);
    if (!creator) {
        return null;
    }

    const nextAssigneeId = input.assigneeEmployeeId !== undefined ? input.assigneeEmployeeId : current.assigneeEmployeeId;
    let assignee: EmployeeRecord | null = null;

    if (typeof nextAssigneeId === "number") {
        assignee = await getEmployeeById(nextAssigneeId);
        if (!assignee) {
            return null;
        }
    }

    const manualOverrideChangeRequested = input.task !== undefined
        || input.area !== undefined
        || input.dueDate !== undefined
        || input.assigneeEmployeeId !== undefined
        || input.creatorEmployeeId !== undefined;

    const nextManualOverride = current.masterTaskId && manualOverrideChangeRequested
        ? true
        : current.manualOverride;

    await sql`
        UPDATE tasks
        SET
            creator_employee_id = ${creator.id},
            creator = ${creator.username},
            assignee_employee_id = ${assignee?.id ?? null},
            assignee = ${assignee?.username ?? ""},
            is_manual_override = ${nextManualOverride},
            task = ${input.task ?? current.task},
            area = ${input.area ?? current.area},
            due_date = ${input.dueDate ?? current.dueDate},
            done = ${typeof input.done === "boolean" ? input.done : current.done},
            updated_at = NOW()
        WHERE id = ${taskId}
    `;

    return getTaskById(taskId);
}

export async function deleteTask(taskId: number) {
    await ensureInitialized();
    const result = await sql<{ id: number }[]>`
        DELETE FROM tasks
        WHERE id = ${taskId}
        RETURNING id
    `;

    return result.length > 0;
}

export async function addTaskMessage(taskId: number, input: MessageInput) {
    await ensureInitialized();

    const taskExists = await sql<{ id: number }[]>`
        SELECT id
        FROM tasks
        WHERE id = ${taskId}
        LIMIT 1
    `;

    if (!taskExists[0]) {
        return null;
    }

    const author = await getEmployeeById(input.authorEmployeeId);
    if (!author) {
        return null;
    }

    await sql`
        INSERT INTO task_messages (task_id, author_employee_id, author, text)
        VALUES (${taskId}, ${author.id}, ${author.username}, ${input.text})
    `;

    return getTaskById(taskId);
}

async function getRecurringMasterTaskById(masterTaskId: number) {
    const rows = await sql<RecurringMasterTaskRow[]>`
        SELECT
            r.id,
            r.creator_employee_id::int AS "creatorEmployeeId",
            c.username AS "creatorUsername",
            r.assignee_employee_id::int AS "assigneeEmployeeId",
            COALESCE(a.username, '') AS "assigneeUsername",
            r.task,
            r.area,
            r.frequency_days::int AS "frequencyDays",
            r.start_date::text AS "startDate",
            r.active
        FROM recurring_master_tasks r
        JOIN employees c ON c.id = r.creator_employee_id
        LEFT JOIN employees a ON a.id = r.assignee_employee_id
        WHERE r.id = ${masterTaskId}
        LIMIT 1
    `;

    return rows[0] ? mapRecurringMasterTask(rows[0]) : null;
}

export async function createRecurringMasterTask(input: RecurringMasterTaskInput) {
    await ensureInitialized();

    const creator = await getEmployeeById(input.creatorEmployeeId);
    if (!creator) {
        return null;
    }

    let assignee: EmployeeRecord | null = null;
    if (typeof input.assigneeEmployeeId === "number") {
        assignee = await getEmployeeById(input.assigneeEmployeeId);
        if (!assignee) {
            return null;
        }
    }

    if (!Number.isFinite(input.frequencyDays) || input.frequencyDays <= 0) {
        return null;
    }

    const inserted = await sql<{ id: number }[]>`
        INSERT INTO recurring_master_tasks (
            creator_employee_id,
            assignee_employee_id,
            task,
            area,
            frequency_days,
            start_date,
            active
        ) VALUES (
            ${creator.id},
            ${assignee?.id ?? null},
            ${input.task.trim()},
            ${input.area.trim()},
            ${Math.floor(input.frequencyDays)},
            ${input.startDate},
            ${input.active ?? true}
        )
        RETURNING id
    `;

    await ensureRecurringTasksHorizon(14);
    return getRecurringMasterTaskById(inserted[0].id);
}

export async function updateRecurringMasterTask(masterTaskId: number, input: RecurringMasterTaskUpdateInput) {
    await ensureInitialized();

    const current = await getRecurringMasterTaskById(masterTaskId);
    if (!current) {
        return null;
    }

    const creatorId = input.creatorEmployeeId ?? current.creatorEmployeeId;
    const creator = await getEmployeeById(creatorId);
    if (!creator) {
        return null;
    }

    const nextAssigneeId = input.assigneeEmployeeId !== undefined ? input.assigneeEmployeeId : current.assigneeEmployeeId;
    let assignee: EmployeeRecord | null = null;
    if (typeof nextAssigneeId === "number") {
        assignee = await getEmployeeById(nextAssigneeId);
        if (!assignee) {
            return null;
        }
    }

    const frequencyDays = input.frequencyDays ?? current.frequencyDays;
    if (!Number.isFinite(frequencyDays) || frequencyDays <= 0) {
        return null;
    }

    await sql`
        UPDATE recurring_master_tasks
        SET
            creator_employee_id = ${creator.id},
            assignee_employee_id = ${assignee?.id ?? null},
            task = ${input.task?.trim() ?? current.task},
            area = ${input.area?.trim() ?? current.area},
            frequency_days = ${Math.floor(frequencyDays)},
            start_date = ${input.startDate ?? current.startDate},
            active = ${typeof input.active === "boolean" ? input.active : current.active},
            updated_at = NOW()
        WHERE id = ${masterTaskId}
    `;

    await sql`
        DELETE FROM tasks
        WHERE master_task_id = ${masterTaskId}
            AND due_date >= ${startOfTodayIso()}
            AND is_manual_override = FALSE
    `;

    await ensureRecurringTasksHorizon(14);
    return getRecurringMasterTaskById(masterTaskId);
}

export async function deleteRecurringMasterTask(masterTaskId: number) {
    await ensureInitialized();

    await sql`
        DELETE FROM tasks
        WHERE master_task_id = ${masterTaskId}
            AND due_date >= ${startOfTodayIso()}
            AND is_manual_override = FALSE
    `;

    const deleted = await sql<{ id: number }[]>`
        DELETE FROM recurring_master_tasks
        WHERE id = ${masterTaskId}
        RETURNING id
    `;

    return deleted.length > 0;
}

export async function getTaubenCareTasks() {
    await ensureInitialized();
    return (await getTaubenCareTaskRows()).map(mapTaubenCareTask);
}

export async function createTaubenCareTask(input: TaubenCareTaskInput) {
    await ensureInitialized();

    const birdName = input.birdName.trim();
    const careType = input.careType.trim();
    const admittedAt = normalizeDateIso(input.admittedAt);
    const dischargedAt = normalizeDateIso(input.dischargedAt ?? null);

    if (!birdName || !careType || !admittedAt) {
        return null;
    }

    const inserted = await sql<{ id: number }[]>`
        INSERT INTO tauben_care_tasks (
            bird_name,
            bird_image,
            care_type,
            admitted_at,
            discharged_at
        ) VALUES (
            ${birdName},
            ${input.birdImage ?? null},
            ${careType},
            ${admittedAt},
            ${dischargedAt}
        )
        RETURNING id
    `;

    const rows = await sql<TaubenCareTaskRow[]>`
        SELECT
            id,
            bird_name AS "birdName",
            bird_image AS "birdImage",
            care_type AS "careType",
            admitted_at::text AS "admittedAt",
            discharged_at::text AS "dischargedAt"
        FROM tauben_care_tasks
        WHERE id = ${inserted[0].id}
        LIMIT 1
    `;

    return rows[0] ? mapTaubenCareTask(rows[0]) : null;
}

export async function updateTaubenCareTask(taskId: number, input: TaubenCareTaskUpdateInput) {
    await ensureInitialized();

    const currentRows = await sql<TaubenCareTaskRow[]>`
        SELECT
            id,
            bird_name AS "birdName",
            bird_image AS "birdImage",
            care_type AS "careType",
            admitted_at::text AS "admittedAt",
            discharged_at::text AS "dischargedAt"
        FROM tauben_care_tasks
        WHERE id = ${taskId}
        LIMIT 1
    `;

    const current = currentRows[0];
    if (!current) {
        return null;
    }

    const nextBirdName = input.birdName?.trim() ?? current.birdName;
    const nextCareType = input.careType?.trim() ?? current.careType;
    const nextAdmittedAt = normalizeDateIso(input.admittedAt ?? current.admittedAt);
    const nextDischargedAt = normalizeDateIso(
        input.dischargedAt === undefined ? current.dischargedAt : input.dischargedAt,
    );

    if (!nextBirdName || !nextCareType || !nextAdmittedAt) {
        return null;
    }

    await sql`
        UPDATE tauben_care_tasks
        SET
            bird_name = ${nextBirdName},
            bird_image = ${input.birdImage === undefined ? current.birdImage : input.birdImage},
            care_type = ${nextCareType},
            admitted_at = ${nextAdmittedAt},
            discharged_at = ${nextDischargedAt},
            updated_at = NOW()
        WHERE id = ${taskId}
    `;

    const rows = await sql<TaubenCareTaskRow[]>`
        SELECT
            id,
            bird_name AS "birdName",
            bird_image AS "birdImage",
            care_type AS "careType",
            admitted_at::text AS "admittedAt",
            discharged_at::text AS "dischargedAt"
        FROM tauben_care_tasks
        WHERE id = ${taskId}
        LIMIT 1
    `;

    return rows[0] ? mapTaubenCareTask(rows[0]) : null;
}

export async function deleteTaubenCareTask(taskId: number) {
    await ensureInitialized();
    const deleted = await sql<{ id: number }[]>`
        DELETE FROM tauben_care_tasks
        WHERE id = ${taskId}
        RETURNING id
    `;

    return deleted.length > 0;
}

export async function createEmployee(input: EmployeeInput) {
    await ensureInitialized();

    const username = input.username.trim();
    const description = input.description.trim();
    if (!username || !description) {
        return null;
    }

    try {
        const inserted = await sql<{ id: number }[]>`
            INSERT INTO employees (username, description, password_hash)
            VALUES (${username}, ${description}, ${bcrypt.hashSync("password-pending", 10)})
            RETURNING id
        `;

        return getEmployeeById(inserted[0].id);
    } catch {
        return null;
    }
}

export async function updateEmployee(employeeId: number, input: EmployeeInput) {
    await ensureInitialized();

    const current = await getEmployeeById(employeeId);
    if (!current) {
        return null;
    }

    const username = input.username.trim();
    const description = input.description.trim();
    if (!username || !description) {
        return null;
    }

    try {
        await sql.begin(async (tx) => {
            await tx`
                UPDATE employees
                SET username = ${username}, description = ${description}
                WHERE id = ${employeeId}
            `;
            await tx`UPDATE tasks SET creator = ${username} WHERE creator_employee_id = ${employeeId}`;
            await tx`UPDATE tasks SET assignee = ${username} WHERE assignee_employee_id = ${employeeId}`;
            await tx`UPDATE task_messages SET author = ${username} WHERE author_employee_id = ${employeeId}`;
        });

        return getEmployeeById(employeeId);
    } catch {
        return null;
    }
}

export async function deleteEmployee(employeeId: number) {
    await ensureInitialized();

    const employee = await getEmployeeById(employeeId);
    if (!employee || employee.username === "Stationsleitung") {
        return false;
    }

    const linkedTaskCount = await sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM tasks
        WHERE creator_employee_id = ${employeeId} OR assignee_employee_id = ${employeeId}
    `;

    const linkedMessageCount = await sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM task_messages
        WHERE author_employee_id = ${employeeId}
    `;

    if ((linkedTaskCount[0]?.count ?? 0) > 0 || (linkedMessageCount[0]?.count ?? 0) > 0) {
        return false;
    }

    const deleted = await sql<{ id: number }[]>`
        DELETE FROM employees
        WHERE id = ${employeeId}
        RETURNING id
    `;

    return deleted.length > 0;
}
