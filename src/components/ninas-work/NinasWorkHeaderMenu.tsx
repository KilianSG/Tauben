"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { nw } from "@/components/ninas-work/uiClasses";

type Props = {
    isLoggedIn: boolean;
    isAdmin: boolean;
    employeeName: string | null;
};

export default function NinasWorkHeaderMenu({ isLoggedIn, isAdmin, employeeName }: Props) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        const closeOnOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (containerRef.current && !containerRef.current.contains(target)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, [open]);

    const logout = async () => {
        await fetch("/api/ninas-work/auth/logout", { method: "POST" });
        window.location.href = "/";
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-label="Menü öffnen"
                aria-expanded={open}
                className={nw.menuButton}
            >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {open ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                </svg>
            </button>

            {open ? (
                <div className={nw.menuPanel}>
                    <p className="px-3 pb-3 text-xs uppercase tracking-[0.25em] text-[color:var(--nw-accent)]">
                        Menü
                    </p>

                    {isLoggedIn ? (
                        <p className={nw.menuInfoBox}>
                            Eingeloggt als: <span className="font-semibold text-[color:var(--nw-text)]">{employeeName}</span>
                        </p>
                    ) : (
                        <p className={nw.menuInfoBox}>
                            Nicht eingeloggt
                        </p>
                    )}

                    <div className="space-y-1">
                        <Link
                            href="/"
                            onClick={() => setOpen(false)}
                            className={nw.menuLink}
                        >
                            Zur Aufgabenübersicht
                        </Link>

                        {isLoggedIn ? (
                            <Link
                                href="/profile"
                                onClick={() => setOpen(false)}
                                className={nw.menuLink}
                            >
                                Zu meinem Profil
                            </Link>
                        ) : null}

                        {isLoggedIn && isAdmin ? (
                            <Link
                                href="/admin"
                                onClick={() => setOpen(false)}
                                className={nw.menuLink}
                            >
                                Zum Adminbereich
                            </Link>
                        ) : null}

                        {isLoggedIn ? (
                            <button
                                type="button"
                                onClick={logout}
                                className={`${nw.buttonDangerMd} block w-full text-left`}
                            >
                                Ausloggen
                            </button>
                        ) : (
                            <Link
                                href="/"
                                onClick={() => setOpen(false)}
                                className={nw.menuLink}
                            >
                                Einloggen
                            </Link>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
