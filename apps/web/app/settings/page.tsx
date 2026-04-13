"use client";

import * as React from "react";
import { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { SettingsLayout, SettingsTab } from "./components/SettingsLayout";
import { AccountSection } from "./components/AccountSection";
import { PreferencesSection } from "./components/PreferencesSection";
import { CalendarSection } from "./components/CalendarSection";
import { DataSection } from "./components/DataSection";
import { DangerSection } from "./components/DangerSection";
import { NotificationsSection } from "./components/NotificationsSection";
import { getNudgeSettingsAction } from "./actions";
import type { NudgePushPreferences } from "@/lib/nudges/types";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";

function SettingsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = React.useState<SettingsTab>("account");
    const [nudgeSettings, setNudgeSettings] = React.useState<{
        nudgeWeeklyDay: number;
        nudgePushEnabled: NudgePushPreferences;
    } | null>(null);

    const { data: session } = authClient.useSession();

    React.useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab && ["account", "preferences", "notifications", "calendar", "data", "danger"].includes(tab)) {
            setActiveTab(tab as SettingsTab);
        }
    }, [searchParams]);

    React.useEffect(() => {
        if (activeTab === "notifications" && !nudgeSettings) {
            getNudgeSettingsAction().then(setNudgeSettings);
        }
    }, [activeTab, nudgeSettings]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab as SettingsTab);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.replace(`/settings?${params.toString()}`);
    };

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#F0F2F5] dark:bg-slate-950/50 pb-24 md:pb-20 font-sans" dir="rtl">
            <Navbar user={session.user} />

            <main className="max-w-7xl mx-auto px-4 sm:px-12 lg:px-20 py-5 md:py-8 space-y-4 md:space-y-6">
                <div className="flex flex-col gap-1 md:gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">הגדרות</h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">נהל את החשבון, ההעדפות והנתונים שלך.</p>
                </div>

                <SettingsLayout activeTab={activeTab} onTabChange={handleTabChange}>
                    {activeTab === "account" && <AccountSection user={session.user} />}
                    {activeTab === "preferences" && <PreferencesSection />}
                    {activeTab === "notifications" && nudgeSettings && (
                        <NotificationsSection initialSettings={nudgeSettings} />
                    )}
                    {activeTab === "calendar" && <CalendarSection />}
                    {activeTab === "data" && <DataSection />}
                    {activeTab === "danger" && <DangerSection />}
                </SettingsLayout>
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#F0F2F5] dark:bg-slate-950/50 flex items-center justify-center" dir="rtl">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        }>
            <SettingsContent />
        </Suspense>
    );
}
