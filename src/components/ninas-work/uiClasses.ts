export function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export const nw = {
    pageStack: "space-y-6",
    panel: "rounded-3xl border border-[color:var(--nw-border)] bg-[color:var(--nw-surface)] backdrop-blur-xl",
    panelPadded: "rounded-3xl border border-[color:var(--nw-border)] bg-[color:var(--nw-surface)] p-6 backdrop-blur-xl",
    panelPaddedLg: "rounded-3xl border border-[color:var(--nw-border)] bg-[color:var(--nw-surface)] p-8 backdrop-blur-xl",
    dangerPanel: "mx-auto w-full max-w-2xl rounded-3xl border border-[color:var(--nw-danger)]/30 bg-[color:var(--nw-danger-bg)] p-8 text-[color:var(--nw-danger)]",

    sectionTitle: "text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--nw-accent)]",
    compactTitle: "text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--nw-accent)]",
    textPrimary: "text-[color:var(--nw-text)]",
    textMuted: "text-[color:var(--nw-muted)]",

    input: "w-full rounded-2xl border border-[color:var(--nw-border)] bg-[color:var(--nw-bg)] px-4 py-3 text-sm text-[color:var(--nw-text)] outline-none focus:border-[color:var(--nw-accent)]",
    textInput: "rounded-2xl border border-[color:var(--nw-border)] bg-[color:var(--nw-bg)] px-4 py-3 text-sm text-[color:var(--nw-text)] outline-none placeholder:text-[color:var(--nw-muted)] focus:border-[color:var(--nw-accent)]",
    staticField: "rounded-2xl border border-[color:var(--nw-border)] bg-[color:var(--nw-bg)] px-4 py-3 text-sm text-[color:var(--nw-text)]",
    fieldEditing: "border-[color:var(--nw-accent-soft)] bg-[color:var(--nw-accent-bg)] shadow-[0_0_0_3px_rgba(129,161,193,0.16)]",
    inputChanged: "border-[color:var(--nw-accent-soft)] bg-[color:var(--nw-accent-bg)]",

    statusInfo: "mt-4 rounded-2xl border border-[color:var(--nw-accent)]/30 bg-[color:var(--nw-accent-bg)] px-4 py-3 text-sm text-[color:var(--nw-accent)]",
    statusDanger: "mt-4 rounded-2xl border border-[color:var(--nw-danger)]/30 bg-[color:var(--nw-danger-bg)] px-4 py-3 text-sm text-[color:var(--nw-danger)]",

    buttonPrimary: "rounded-full border border-[color:var(--nw-accent)] bg-[color:var(--nw-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--nw-surface)] transition hover:brightness-95",
    buttonPrimaryMd: "rounded-2xl border border-[color:var(--nw-accent)] bg-[color:var(--nw-accent)] px-5 py-3 text-sm font-semibold text-[color:var(--nw-surface)] transition hover:brightness-95",
    buttonDisabled: "cursor-not-allowed opacity-45 saturate-75",
    buttonSuccess: "rounded-2xl border border-[color:var(--nw-accent)] bg-[color:var(--nw-accent)] px-5 py-3 text-sm font-semibold text-[color:var(--nw-surface)] transition hover:brightness-95",
    buttonDanger: "rounded-full border border-[color:var(--nw-danger)] bg-[color:var(--nw-danger)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--nw-surface)] transition hover:brightness-95",
    buttonDangerMd: "rounded-2xl border border-[color:var(--nw-danger)] bg-[color:var(--nw-danger)] px-5 py-3 text-sm font-semibold text-[color:var(--nw-surface)] transition hover:brightness-95",

    linkButton: "inline-block rounded-2xl border border-[color:var(--nw-accent)] bg-[color:var(--nw-accent)] px-5 py-3 text-sm font-semibold text-[color:var(--nw-surface)] transition hover:brightness-95",
    linkButtonSolid: "mt-6 inline-block rounded-2xl border border-[color:var(--nw-accent)] bg-[color:var(--nw-accent)] px-5 py-3 text-sm font-semibold text-[color:var(--nw-surface)] transition hover:brightness-95",

    metricCard: "rounded-2xl border border-[color:var(--nw-border)] bg-[color:var(--nw-bg)] p-4",
    metricLabel: "text-xs uppercase tracking-[0.25em] text-[color:var(--nw-accent)]",
    metricValue: "mt-2 text-2xl font-semibold text-[color:var(--nw-text)]",

    listCard: "rounded-2xl border border-[color:var(--nw-border)] bg-[color:var(--nw-bg)] p-4",
    idBadge: "rounded-full border border-[color:var(--nw-border)] bg-[color:var(--nw-surface)] px-3 py-1 text-xs font-medium text-[color:var(--nw-muted)]",

    menuButton: "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--nw-border)] bg-[color:var(--nw-surface)] text-[color:var(--nw-text)] transition hover:bg-[color:var(--nw-bg-alt)]",
    menuPanel: "absolute right-0 z-50 mt-3 w-72 rounded-2xl border border-[color:var(--nw-border)] bg-[color:var(--nw-surface)] p-3 shadow-lg shadow-slate-400/20 backdrop-blur-xl",
    menuInfoBox: "mb-3 rounded-xl border border-[color:var(--nw-border)] bg-[color:var(--nw-bg)] px-3 py-2 text-sm text-[color:var(--nw-muted)]",
    menuLink: "block rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--nw-text)] transition hover:bg-[color:var(--nw-bg-alt)]",

    taskCard: "rounded-3xl border border-[color:var(--nw-border)] bg-[color:var(--nw-surface)] transition",
    taskCardExpanded: "rounded-3xl border border-[color:var(--nw-accent-soft)] bg-[color:var(--nw-accent-bg)] shadow-lg shadow-slate-300/20 transition",
    taskMeta: "flex flex-wrap gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--nw-accent)]",
    taskTitle: "text-lg font-semibold text-[color:var(--nw-text)]",
    assigneeBadge: "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
    assigneeOk: "border-[color:var(--nw-accent-soft)]/60 bg-[color:var(--nw-accent-bg)] text-[color:var(--nw-accent)]",
    assigneeMissing: "border-[color:var(--nw-danger)]/40 bg-[color:var(--nw-danger-bg)] text-[color:var(--nw-danger)]",

    stateDone: "bg-[color:var(--nw-success-bg)] text-[color:var(--nw-success)]",
    stateOpen: "bg-[color:var(--nw-warn-bg)] text-[color:var(--nw-warn)]",
} as const;
