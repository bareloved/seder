"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { User, Settings, Calendar, Database, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SettingsLayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export type SettingsTab = "account" | "preferences" | "calendar" | "data" | "danger";

const tabs: { id: SettingsTab; label: string; icon: React.ElementType; color?: string }[] = [
    { id: "account", label: "חשבון", icon: User },
    { id: "preferences", label: "העדפות", icon: Settings },
    { id: "calendar", label: "לוח שנה", icon: Calendar },
    { id: "data", label: "ניהול נתונים", icon: Database },
    { id: "danger", label: "מחיקת חשבון", icon: AlertOctagon, color: "text-red-500 hover:text-red-600 hover:bg-red-50" },
];

export function SettingsLayout({ children, activeTab, onTabChange }: SettingsLayoutProps) {
    return (
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 min-h-[600px]">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 flex-shrink-0">
                <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <Button
                                key={tab.id}
                                variant="ghost"
                                onClick={() => onTabChange(tab.id)}
                                className={cn(
                                    "justify-start gap-3 h-10 px-4 rounded-lg transition-colors whitespace-nowrap",
                                    isActive
                                        ? "bg-white shadow-sm text-brand-primary font-medium"
                                        : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
                                    tab.color && !isActive ? tab.color : "",
                                    tab.color && isActive ? "text-red-600 bg-red-50" : ""
                                )}
                            >
                                <Icon className={cn("h-4 w-4", isActive ? "opacity-100" : "opacity-70")} />
                                {tab.label}
                            </Button>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content Areas */}
            <div className="flex-1 min-w-0">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 p-6 md:p-8">
                    {children}
                </div>
            </div>
        </div>
    );
}
