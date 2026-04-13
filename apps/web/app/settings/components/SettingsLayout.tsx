"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { User, Settings, Calendar, Database, AlertOctagon, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SettingsLayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export type SettingsTab = "account" | "preferences" | "notifications" | "calendar" | "data" | "danger";

const tabs: { id: SettingsTab; label: string; icon: React.ElementType; color?: string }[] = [
    { id: "account", label: "חשבון", icon: User },
    { id: "preferences", label: "העדפות", icon: Settings },
    { id: "notifications", label: "תזכורות", icon: Bell },
    { id: "calendar", label: "לוח שנה", icon: Calendar },
    { id: "data", label: "ניהול נתונים", icon: Database },
    { id: "danger", label: "מחיקת חשבון", icon: AlertOctagon, color: "text-red-500 hover:text-red-600 hover:bg-red-50" },
];

export function SettingsLayout({ children, activeTab, onTabChange }: SettingsLayoutProps) {
    const navRef = React.useRef<HTMLElement>(null);
    const activeButtonRef = React.useRef<HTMLButtonElement>(null);

    // Scroll active tab into view on mount/change
    React.useEffect(() => {
        if (activeButtonRef.current && navRef.current) {
            const nav = navRef.current;
            const button = activeButtonRef.current;
            const navRect = nav.getBoundingClientRect();
            const buttonRect = button.getBoundingClientRect();

            // Only scroll on mobile (horizontal layout)
            if (window.innerWidth < 768) {
                const scrollLeft = button.offsetLeft - navRect.width / 2 + buttonRect.width / 2;
                nav.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    }, [activeTab]);

    return (
        <div className="flex flex-col md:flex-row gap-4 md:gap-10 min-h-[600px]">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 flex-shrink-0">
                <div className="relative">
                    {/* Fade indicators for scroll affordance on mobile */}
                    <div className="md:hidden absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#F0F2F5] dark:from-slate-950/50 to-transparent pointer-events-none z-10" />
                    <div className="md:hidden absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#F0F2F5] dark:from-slate-950/50 to-transparent pointer-events-none z-10" />

                    <nav
                        ref={navRef}
                        className="flex flex-row md:flex-col gap-1 md:gap-1 overflow-x-auto md:overflow-visible scrollbar-none -mx-1 px-1 md:mx-0"
                    >
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <Button
                                    key={tab.id}
                                    ref={isActive ? activeButtonRef : undefined}
                                    variant="ghost"
                                    onClick={() => onTabChange(tab.id)}
                                    className={cn(
                                        "flex-shrink-0 justify-start gap-2 md:gap-3 h-9 md:h-11 px-3 md:px-4 text-sm rounded-full md:rounded-lg transition-colors whitespace-nowrap",
                                        isActive
                                            ? "bg-brand-primary text-white font-medium hover:bg-[#27ae60] hover:text-white md:bg-white md:shadow-sm md:text-brand-primary md:hover:bg-white"
                                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
                                        tab.color && !isActive ? tab.color : "",
                                        tab.color && isActive ? "bg-red-500 text-white hover:bg-red-600 hover:text-white md:bg-red-50 md:text-red-600 md:hover:bg-red-50" : ""
                                    )}
                                >
                                    <Icon className={cn("h-4 w-4", isActive ? "opacity-100" : "opacity-70")} />
                                    {tab.label}
                                </Button>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* Main Content Areas */}
            <div className="flex-1 min-w-0">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 p-4 md:p-8">
                    {children}
                </div>
            </div>
        </div>
    );
}
