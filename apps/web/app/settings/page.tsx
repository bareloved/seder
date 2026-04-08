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
import { FeedbackModal } from "@/components/FeedbackModal";
import { MessageSquare } from "lucide-react";

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

            <main className="max-w-7xl mx-auto px-2 sm:px-12 lg:px-20 py-8 space-y-6">
                <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">הגדרות</h1>
                        <p className="text-slate-500">נהל את החשבון, ההעדפות והנתונים שלך במקום אחד.</p>
                    </div>
                    <FeedbackModal
                        trigger={
                            <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
                                <MessageSquare className="h-4 w-4" />
                                שליחת משוב
                            </button>
                        }
                    />
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
