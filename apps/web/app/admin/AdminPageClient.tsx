"use client";

import * as React from "react";
import { setFeedbackStatus, deleteFeedback, replyToFeedback, triggerBackup, fetchSentryHealth } from "./actions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  MessageSquare, Users, Send, Check, ChevronDown, ChevronUp,
  Mail, LayoutDashboard, ExternalLink, Database, Loader2,
  UserPlus, Activity, Bell, Sun, Moon, Calendar, Smartphone,
  FolderOpen, Tag, X, CheckCircle2, Trash2, EyeOff, Reply,
  Wrench, CircleCheckBig,
} from "lucide-react";
import { useTheme } from "next-themes";

interface FeedbackItem {
  id: string;
  message: string;
  category: string;
  platform: string;
  status: string;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  entryCount: number;
}

interface UserDetail {
  lastActive: string | null;
  googleConnected: boolean;
  onboardingCompleted: boolean;
  categoryCount: number;
  clientCount: number;
  mobileRegistered: boolean;
}

interface Stats {
  totalUsers: number;
  newUsersThisWeek: number;
  activeUsersThisMonth: number;
  unreadFeedback: number;
}

interface AdminPageClientProps {
  feedback: FeedbackItem[];
  users: UserItem[];
  userDetails: Record<string, UserDetail>;
  stats: Stats;
}

const QUICK_LINKS = [
  { name: "Sentry", url: "https://sentry.io/organizations/barel-oved/issues/", icon: "🐛" },
  { name: "Vercel Analytics", url: "https://vercel.com/barels-projects-e3362d85/sedder/observability", icon: "📊" },
  { name: "Neon Console", url: "https://console.neon.tech/app/projects/damp-salad-64131166", icon: "🗄️" },
  { name: "Upstash Dashboard", url: "https://console.upstash.com", icon: "⚡" },
  { name: "Google Cloud", url: "https://console.cloud.google.com/apis/dashboard?authuser=1&project=income-tracker-479716", icon: "☁️" },
];

function DetailRow({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-border last:border-0">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color || "text-slate-400"}`} />
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function StatusDot({ status }: { status: boolean }) {
  return status ? (
    <span className="flex items-center gap-1 text-green-600">
      <CheckCircle2 className="w-4 h-4" />
      <span className="text-sm">כן</span>
    </span>
  ) : (
    <span className="flex items-center gap-1 text-slate-400">
      <X className="w-4 h-4" />
      <span className="text-sm">לא</span>
    </span>
  );
}

export default function AdminPageClient({ feedback, users, userDetails, stats }: AdminPageClientProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"overview" | "feedback" | "users">("overview");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "unread" | "read" | "in_progress" | "done" | "replied">("all");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState("");
  const [isReplying, setIsReplying] = React.useState(false);
  const [showReplyFor, setShowReplyFor] = React.useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const [backupResult, setBackupResult] = React.useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [sentryHealth, setSentryHealth] = React.useState<{ errorCount24h: number; status: string } | null>(null);

  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    fetchSentryHealth().then(setSentryHealth).catch(() => setSentryHealth(null));
  }, []);

  const filteredFeedback = statusFilter === "all"
    ? feedback
    : feedback.filter((f) => f.status === statusFilter);

  const unreadCount = feedback.filter((f) => f.status === "unread").length;

  const selectedUser = selectedUserId ? users.find((u) => u.id === selectedUserId) : null;
  const selectedDetail = selectedUserId ? userDetails[selectedUserId] : null;
  const selectedUserFeedback = selectedUserId ? feedback.filter((f) => f.userId === selectedUserId) : [];

  const handleExpand = async (item: FeedbackItem) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      setReplyText("");
      setShowReplyFor(null);
      return;
    }
    setExpandedId(item.id);
    setReplyText("");
    setShowReplyFor(null);
    if (item.status === "unread") {
      await setFeedbackStatus(item.id, "read");
      router.refresh();
    }
  };

  const handleReply = async (feedbackId: string) => {
    if (!replyText.trim()) return;
    setIsReplying(true);
    try {
      await replyToFeedback(feedbackId, replyText);
      setReplyText("");
      setExpandedId(null);
      router.refresh();
    } catch (err) {
      console.error("Failed to reply:", err);
    } finally {
      setIsReplying(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    setBackupResult(null);
    try {
      await triggerBackup();
      setBackupResult("הגיבוי בוצע בהצלחה!");
    } catch {
      setBackupResult("הגיבוי נכשל. בדקו את ההגדרות.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const formatRelativeDate = (iso: string | null) => {
    if (!iso) return "לא ידוע";
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "עכשיו";
    if (minutes < 60) return `לפני ${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `לפני ${hours} שעות`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `לפני ${days} ימים`;
    return formatDate(iso);
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      unread: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      read: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
      in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      replied: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    };
    const labels: Record<string, string> = { unread: "חדש", read: "נקרא", in_progress: "בטיפול", done: "טופל", replied: "נענה" };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.read}`}>
        {labels[status] || status}
      </span>
    );
  };

  const categoryBadge = (cat: string) => {
    const styles: Record<string, string> = {
      general: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
      bug: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      feature: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    };
    const labels: Record<string, string> = { general: "כללי", bug: "באג", feature: "פיצ׳ר" };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[cat] || styles.general}`}>
        {labels[cat] || cat}
      </span>
    );
  };

  const platformBadge = (platform: string) => (
    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
      {platform}
    </span>
  );

  const healthColor = (status: string) => {
    if (status === "green") return { dot: "bg-green-500", bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-200 dark:border-green-800" };
    if (status === "amber") return { dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800" };
    return { dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800" };
  };

  const tabs = [
    { id: "overview" as const, label: "סקירה", icon: LayoutDashboard },
    { id: "feedback" as const, label: "משוב", icon: MessageSquare, badge: unreadCount },
    { id: "users" as const, label: "משתמשים", icon: Users, count: users.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-card border-b border-slate-200 dark:border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">ניהול</h1>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="החלף ערכת נושא"
          >
            {mounted && (theme === "dark" ? <Sun className="w-4 h-4 text-slate-400" /> : <Moon className="w-4 h-4 text-slate-400" />)}
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-green-600 text-green-700 dark:text-green-400"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && tab.badge > 0 ? (
                  <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {tab.badge}
                  </span>
                ) : tab.count !== undefined ? (
                  <span className="text-xs text-slate-400">({tab.count})</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "משתמשים", value: stats.totalUsers, icon: Users, color: "text-blue-600" },
                { label: "חדשים השבוע", value: stats.newUsersThisWeek, icon: UserPlus, color: "text-green-600" },
                { label: "פעילים החודש", value: stats.activeUsersThisMonth, icon: Activity, color: "text-amber-600" },
                { label: "משוב חדש", value: stats.unreadFeedback, icon: Bell, color: stats.unreadFeedback > 0 ? "text-red-600" : "text-slate-400" },
              ].map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="bg-white dark:bg-card rounded-lg border border-slate-200 dark:border-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${kpi.color}`} />
                      <span className="text-xs text-slate-500">{kpi.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpi.value}</p>
                  </div>
                );
              })}
            </div>

            {/* System Health */}
            <div>
              <h2 className="text-sm font-medium text-slate-500 mb-3">בריאות המערכת</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sentryHealth ? (
                  <a
                    href="https://sentry.io/organizations/barel-oved/issues/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`rounded-lg border p-4 transition-colors hover:opacity-80 ${healthColor(sentryHealth.status).bg} ${healthColor(sentryHealth.status).border}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${healthColor(sentryHealth.status).dot}`} />
                        <span className="text-xs text-slate-500">Sentry (24h)</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-slate-300" />
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {sentryHealth.errorCount24h === -1 ? "—" : `${sentryHealth.errorCount24h} שגיאות`}
                    </p>
                  </a>
                ) : (
                  <div className="rounded-lg border border-slate-200 dark:border-border p-4 animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-2" />
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h2 className="text-sm font-medium text-slate-500 mb-3">קישורים מהירים</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {QUICK_LINKS.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white dark:bg-card rounded-lg border border-slate-200 dark:border-border p-4 hover:border-green-300 dark:hover:border-green-700 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">{link.icon}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-green-500 transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{link.name}</p>
                  </a>
                ))}
              </div>
            </div>

            {/* DB Backup */}
            <div>
              <h2 className="text-sm font-medium text-slate-500 mb-3">גיבוי מסד נתונים</h2>
              <div className="bg-white dark:bg-card rounded-lg border border-slate-200 dark:border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Neon DB Backup</p>
                      <p className="text-xs text-slate-400">יוצר branch חדש ב-Neon כגיבוי</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {backupResult && (
                      <span className={`text-xs ${backupResult.includes("בהצלחה") ? "text-green-600" : "text-red-500"}`}>
                        {backupResult}
                      </span>
                    )}
                    <Button
                      onClick={handleBackup}
                      disabled={isBackingUp}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                      {isBackingUp ? "מגבה..." : "גיבוי עכשיו"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== FEEDBACK TAB ===== */}
        {activeTab === "feedback" && (
          <div className="space-y-3">
            <div className="flex gap-2 mb-4">
              {(["all", "unread", "in_progress", "done", "replied"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    statusFilter === f
                      ? "bg-green-600 text-white"
                      : "bg-white dark:bg-card text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-border hover:bg-slate-50"
                  }`}
                >
                  {{ all: "הכל", unread: "חדש", in_progress: "בטיפול", done: "טופל", replied: "נענה" }[f]}
                  {f === "unread" && unreadCount > 0 && ` (${unreadCount})`}
                </button>
              ))}
            </div>

            {filteredFeedback.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>אין משוב {statusFilter !== "all" ? "בסינון הנוכחי" : "עדיין"}</p>
              </div>
            ) : (
              filteredFeedback.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-card rounded-lg border transition-colors ${
                    item.status === "unread"
                      ? "border-amber-200 dark:border-amber-800"
                      : "border-slate-200 dark:border-border"
                  }`}
                >
                  <button
                    onClick={() => handleExpand(item)}
                    className="w-full text-start px-4 py-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {item.userName || item.userEmail || "אנונימי"}
                        </span>
                        {statusBadge(item.status)}
                        {categoryBadge(item.category)}
                        {platformBadge(item.platform)}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{item.message}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                      {expandedId === item.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {expandedId === item.id && (
                    <div className="px-4 pb-4 border-t border-slate-100 dark:border-border pt-3 space-y-3">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">הודעה מלאה:</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                          {item.message}
                        </p>
                      </div>
                      {item.userEmail && (
                        <p className="text-xs text-slate-400">
                          <Mail className="w-3 h-3 inline ms-1" />
                          {item.userEmail}
                        </p>
                      )}
                      {item.adminReply && (
                        <div>
                          <p className="text-xs text-green-600 mb-1 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            תגובה שנשלחה ({item.repliedAt ? formatDate(item.repliedAt) : ""}):
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                            {item.adminReply}
                          </p>
                        </div>
                      )}

                      {/* Reply (toggled) */}
                      {showReplyFor === item.id ? (
                        <div className="flex gap-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="כתבו תגובה..."
                            className="flex-1 text-sm border border-slate-200 dark:border-border rounded-lg p-2.5 resize-none bg-white dark:bg-background text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                            rows={2}
                            dir="rtl"
                            autoFocus
                          />
                          <div className="flex flex-col gap-1 self-end">
                            <Button
                              onClick={() => handleReply(item.id)}
                              disabled={!replyText.trim() || isReplying}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => { setShowReplyFor(null); setReplyText(""); }}
                              size="sm"
                              variant="ghost"
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-1 flex-wrap">
                        {showReplyFor !== item.id && (
                          <button
                            onClick={() => { setShowReplyFor(item.id); setReplyText(""); }}
                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition-colors"
                          >
                            <Reply className="w-3.5 h-3.5" />
                            השב
                          </button>
                        )}
                        {item.status !== "in_progress" && (
                          <button
                            onClick={async () => { await setFeedbackStatus(item.id, "in_progress"); router.refresh(); }}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            בטיפול
                          </button>
                        )}
                        {item.status !== "done" && (
                          <button
                            onClick={async () => { await setFeedbackStatus(item.id, "done"); router.refresh(); }}
                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition-colors"
                          >
                            <CircleCheckBig className="w-3.5 h-3.5" />
                            טופל
                          </button>
                        )}
                        {item.status !== "unread" && (
                          <button
                            onClick={async () => { await setFeedbackStatus(item.id, "unread"); router.refresh(); }}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            לא נקרא
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (confirm("למחוק את המשוב?")) {
                              await deleteFeedback(item.id);
                              setExpandedId(null);
                              router.refresh();
                            }
                          }}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          מחק
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ===== USERS TAB ===== */}
        {activeTab === "users" && (
          <div className="space-y-1">
            <p className="text-sm text-slate-500 mb-4">{users.length} משתמשים</p>

            <div className="bg-white dark:bg-card rounded-lg border border-slate-200 dark:border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-start px-4 py-2.5 text-slate-500 font-medium">שם</th>
                    <th className="text-start px-4 py-2.5 text-slate-500 font-medium">אימייל</th>
                    <th className="text-start px-4 py-2.5 text-slate-500 font-medium">הרשמה</th>
                    <th className="text-start px-4 py-2.5 text-slate-500 font-medium">רשומות</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className="border-b border-slate-100 dark:border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {u.image ? (
                            <img src={u.image} alt="" className="w-7 h-7 rounded-full" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs font-medium text-green-700 dark:text-green-400">
                              {u.name?.charAt(0) || "?"}
                            </div>
                          )}
                          <span className="text-slate-900 dark:text-slate-100 font-medium">{u.name}</span>
                          {u.emailVerified && <Check className="w-3.5 h-3.5 text-green-600" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400" dir="ltr">{u.email}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${u.entryCount > 0 ? "text-green-600" : "text-slate-400"}`}>
                          {u.entryCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Sheet */}
      <Sheet open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <SheetContent side="right" dir="rtl" className="overflow-y-auto w-[400px] sm:w-[450px]">
          {selectedUser && selectedDetail && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-3">
                  {selectedUser.image ? (
                    <img src={selectedUser.image} alt="" className="w-12 h-12 rounded-full" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-lg font-semibold text-green-700 dark:text-green-400">
                      {selectedUser.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div>
                    <SheetTitle className="text-start">{selectedUser.name}</SheetTitle>
                    <SheetDescription dir="ltr" className="text-start">{selectedUser.email}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-1 mt-2">
                <DetailRow
                  icon={Activity}
                  label="פעילות אחרונה"
                  value={formatRelativeDate(selectedDetail.lastActive)}
                />
                <DetailRow
                  icon={Calendar}
                  label="Google Calendar"
                  value={<StatusDot status={selectedDetail.googleConnected} />}
                  color="text-blue-500"
                />
                <DetailRow
                  icon={CheckCircle2}
                  label="סיור הכנסה"
                  value={<StatusDot status={selectedDetail.onboardingCompleted} />}
                  color="text-green-500"
                />
                <DetailRow
                  icon={Tag}
                  label="קטגוריות"
                  value={selectedDetail.categoryCount}
                />
                <DetailRow
                  icon={FolderOpen}
                  label="לקוחות"
                  value={selectedDetail.clientCount}
                />
                <DetailRow
                  icon={Smartphone}
                  label="אפליקציית מובייל"
                  value={<StatusDot status={selectedDetail.mobileRegistered} />}
                />
                <DetailRow
                  icon={MessageSquare}
                  label="רשומות הכנסה"
                  value={selectedUser.entryCount}
                />
              </div>

              {/* Feedback history */}
              {selectedUserFeedback.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-slate-500 mb-3">היסטוריית משוב ({selectedUserFeedback.length})</h3>
                  <div className="space-y-2">
                    {selectedUserFeedback.map((f) => (
                      <div key={f.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          {statusBadge(f.status)}
                          {platformBadge(f.platform)}
                          <span className="text-xs text-slate-400 ms-auto">{formatDate(f.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">{f.message}</p>
                        {f.adminReply && (
                          <p className="text-xs text-green-600 mt-1 line-clamp-2">↩ {f.adminReply}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Signup info */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-border">
                <p className="text-xs text-slate-400">
                  נרשם {new Date(selectedUser.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
