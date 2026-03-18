"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  MoreHorizontal,
  Archive,
  Edit2,
  Merge,
  RefreshCw,
  Users,
  Briefcase,
  ArrowUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { ClientWithAnalytics, DuplicateGroup } from "./types";
import { ClientForm } from "./components/ClientForm";
import { ClientMergeTool } from "./components/ClientMergeTool";
import { ClientDetailPanel } from "./components/ClientDetailPanel";
import { Navbar } from "@/components/Navbar";
import {
  createClientAction,
  updateClientAction,
  archiveClientAction,
  getClientsWithAnalyticsAction,
  findDuplicatesAction,
  createClientsFromExistingAction,
  linkEntriesToClientsAction,
} from "./actions";
import { MobileBottomNav } from "@/components/MobileBottomNav";

interface ClientsPageClientProps {
  initialClients: ClientWithAnalytics[];
  initialDuplicates: DuplicateGroup[];
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

export function ClientsPageClient({
  initialClients,
  initialDuplicates,
  user,
}: ClientsPageClientProps) {
  const [clients, setClients] = React.useState(initialClients);
  const [duplicates, setDuplicates] = React.useState(initialDuplicates);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState<ClientWithAnalytics | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<ClientWithAnalytics | null>(null);
  const [isMergeToolOpen, setIsMergeToolOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<"name" | "jobs" | "outstanding" | "total" | "lastActivity">("name");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);

  // Load sorting preferences from localStorage after hydration
  React.useEffect(() => {
    const savedSortBy = localStorage.getItem("clients-sort-by");
    if (savedSortBy && ["name", "jobs", "outstanding", "total", "lastActivity"].includes(savedSortBy)) {
      setSortBy(savedSortBy as "name" | "jobs" | "outstanding" | "total" | "lastActivity");
    }
    const savedSortDirection = localStorage.getItem("clients-sort-direction");
    if (savedSortDirection && ["asc", "desc"].includes(savedSortDirection)) {
      setSortDirection(savedSortDirection as "asc" | "desc");
    }
    setIsHydrated(true);
  }, []);

  // Persist sorting preferences to localStorage (only after hydration)
  React.useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("clients-sort-by", sortBy);
    }
  }, [sortBy, isHydrated]);

  React.useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("clients-sort-direction", sortDirection);
    }
  }, [sortDirection, isHydrated]);

  const sortOptions = [
    { value: "name" as const, label: "שם" },
    { value: "jobs" as const, label: "מספר עבודות" },
    { value: "outstanding" as const, label: "ממתין לתשלום" },
    { value: "total" as const, label: "סה״כ הכנסות" },
    { value: "lastActivity" as const, label: "פעילות אחרונה" },
  ];

  const sortedAndFilteredClients = React.useMemo(() => {
    let result = clients;

    // Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone?.includes(query)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name, "he");
          break;
        case "jobs":
          comparison = a.jobCount - b.jobCount;
          break;
        case "outstanding":
          comparison = a.outstandingAmount - b.outstandingAmount;
          break;
        case "total":
          comparison = a.totalEarned - b.totalEarned;
          break;
        case "lastActivity": {
          const dateA = a.lastGigDate ? new Date(a.lastGigDate).getTime() : 0;
          const dateB = b.lastGigDate ? new Date(b.lastGigDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        }
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [clients, searchQuery, sortBy, sortDirection]);

  const currentSortLabel = sortOptions.find(o => o.value === sortBy)?.label;

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [clientsResult, duplicatesResult] = await Promise.all([
        getClientsWithAnalyticsAction(),
        findDuplicatesAction(),
      ]);
      if (clientsResult.success) {
        setClients(clientsResult.clients);
      }
      if (duplicatesResult.success) {
        setDuplicates(duplicatesResult.duplicates);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientSubmit = async (data: {
    id?: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
    defaultRate?: number | null;
  }) => {
    if (data.id) {
      const result = await updateClientAction({
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        notes: data.notes,
        defaultRate: data.defaultRate,
      });
      if (result.success) {
        await refreshData();
        setEditingClient(null);
        if (selectedClient?.id === data.id) {
          const updated = clients.find((c) => c.id === data.id);
          if (updated) setSelectedClient(updated);
        }
      }
      return result;
    } else {
      const result = await createClientAction({
        name: data.name,
        email: data.email,
        phone: data.phone,
        notes: data.notes,
        defaultRate: data.defaultRate,
      });
      if (result.success) {
        await refreshData();
        setIsFormOpen(false);
      }
      return result;
    }
  };

  const handleArchiveClient = async (id: string) => {
    const result = await archiveClientAction(id);
    if (result.success) {
      await refreshData();
      if (selectedClient?.id === id) {
        setSelectedClient(null);
      }
    }
  };

  const handleImportExisting = async () => {
    setIsLoading(true);
    try {
      const createResult = await createClientsFromExistingAction();
      const linkResult = await linkEntriesToClientsAction();
      await refreshData();
      alert(
        `יובאו ${createResult.createdCount} לקוחות חדשים וקושרו ${linkResult.linkedCount} עבודות`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  function healthDotColor(health: "good" | "warning" | "bad") {
    switch (health) {
      case "good": return "bg-green-400";
      case "warning": return "bg-amber-400";
      case "bad": return "bg-red-400";
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background/50 pb-24 md:pb-20 font-sans" dir="rtl">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-2 sm:px-12 lg:px-20 pt-1.5 sm:pt-3 pb-3 sm:pb-8 space-y-1.5 sm:space-y-2">
        {/* Toolbar */}
        <section className="p-2 rounded-xl bg-white dark:bg-card shadow-sm border border-slate-200/40 dark:border-slate-700/40">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            {/* Search & Sort */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חפש לקוח..."
                  className="ps-9 h-9"
                />
              </div>

              {/* Sort Dropdown — combined with direction toggle like iOS */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-9 shrink-0 bg-white dark:bg-card border-slate-200 dark:border-border">
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                    <span className="hidden sm:inline text-xs">{currentSortLabel}</span>
                    <span className="text-[10px] opacity-50">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {sortOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={cn(
                        "justify-between",
                        sortBy === option.value && "bg-slate-50 dark:bg-muted"
                      )}
                    >
                      <span>{option.label}</span>
                      {sortBy === option.value && (
                        <span className="text-emerald-500 text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}>
                    {sortDirection === "asc" ? "מהגדול לקטן ↓" : "מהקטן לגדול ↑"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              {duplicates.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMergeToolOpen(true)}
                  className="gap-2 h-9"
                >
                  <Merge className="h-4 w-4" />
                  <span className="hidden sm:inline">מיזוג כפילויות</span>
                  <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs px-1.5 py-0.5 rounded">
                    {duplicates.length}
                  </span>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={handleImportExisting} disabled={isLoading}>
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    ייבא לקוחות מעבודות קיימות
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => setIsFormOpen(true)}
                className="gap-2 h-9 bg-[#2ecc71] hover:bg-[#27ae60] text-white"
              >
                <Plus className="h-4 w-4" />
                לקוח חדש
              </Button>
            </div>
          </div>
        </section>

        {/* Content - Two Column Layout */}
        <section className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200/40 dark:border-slate-700/40 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-100 dark:divide-slate-800">
            {/* Client List */}
            <div>
              {sortedAndFilteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4">
                  <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-muted flex items-center justify-center mb-4">
                    <Users className="h-7 w-7 text-slate-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {searchQuery ? "לא נמצאו לקוחות תואמים" : "אין לקוחות עדיין"}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center">
                    {searchQuery
                      ? "נסה לחפש עם מילות מפתח אחרות"
                      : "התחל להוסיף לקוחות כדי לעקוב אחר ההכנסות שלך"
                    }
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => setIsFormOpen(true)}
                      className="bg-[#2ecc71] hover:bg-[#27ae60] text-white"
                    >
                      <Plus className="h-4 w-4 ms-2" />
                      הוסף לקוח ראשון
                    </Button>
                  )}
                </div>
              ) : (
                <>
                <div className="px-4 py-2 text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 text-center">
                  (נתונים לשנת {new Date().getFullYear()})
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedAndFilteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(client);
                        // Open drawer on mobile (< lg breakpoint)
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                          setIsMobileDrawerOpen(true);
                        }
                      }}
                      className={cn(
                        "p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-muted/50",
                        selectedClient?.id === client.id &&
                          "bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 border-s-2 border-s-blue-500"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar circle — like iOS */}
                        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                            {client.name.charAt(0)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                              {client.name}
                            </h3>
                          </div>
                          {client.email && (
                            <p className="text-sm text-slate-400 dark:text-slate-500 truncate mt-0.5">{client.email}</p>
                          )}
                          {client.phone && (
                            <p className="text-sm text-slate-400 dark:text-slate-500">{client.phone}</p>
                          )}
                          <div className="flex items-center gap-3 mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5" />
                              {client.thisYearJobCount} עבודות
                            </span>
                            {client.thisYearRevenue > 0 && (
                              <span className="text-sm font-medium font-numbers text-[#059669] dark:text-[#34d399]" dir="ltr">
                                {formatCurrency(client.thisYearRevenue)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {client.outstandingAmount > 0 && (
                            <span className="text-xs bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-md font-medium">
                              {formatCurrency(client.outstandingAmount)} ממתין
                            </span>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingClient(client);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                                עריכה
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchiveClient(client.id);
                                }}
                                className="text-red-600"
                              >
                                <Archive className="h-4 w-4" />
                                העבר לארכיון
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
            </div>

            {/* Analytics Panel - Desktop only */}
            <div className="hidden lg:block bg-slate-50/50 dark:bg-muted/20">
              {selectedClient ? (
                <div className="p-4">
                  <ClientDetailPanel client={selectedClient} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-4">
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-muted flex items-center justify-center mb-3">
                    <Briefcase className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                    בחר לקוח כדי לראות את הנתונים שלו
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-400">
        <p>© 2026 סדר</p>
      </footer>

      {/* Mobile Client Analytics Sheet */}
      <Sheet open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto p-4" dir="rtl" aria-describedby={undefined}>
          <SheetHeader className="sr-only">
            <SheetTitle>{selectedClient?.name}</SheetTitle>
          </SheetHeader>
          {selectedClient && (
            <ClientDetailPanel client={selectedClient} />
          )}
        </SheetContent>
      </Sheet>

      {/* Create/Edit Form Dialog */}
      <ClientForm
        isOpen={isFormOpen || editingClient !== null}
        onClose={() => {
          setIsFormOpen(false);
          setEditingClient(null);
        }}
        client={editingClient}
        onSubmit={handleClientSubmit}
      />

      {/* Merge Tool Dialog */}
      <ClientMergeTool
        isOpen={isMergeToolOpen}
        onClose={() => setIsMergeToolOpen(false)}
        duplicates={duplicates}
        onMergeComplete={refreshData}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
