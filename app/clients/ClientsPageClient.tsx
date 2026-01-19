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
  TrendingUp,
  Calendar,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  FileText,
  DollarSign,
  Briefcase,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ClientWithAnalytics, DuplicateGroup } from "./types";
import { ClientForm } from "./components/ClientForm";
import { ClientMergeTool } from "./components/ClientMergeTool";
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
  const [sortBy, setSortBy] = React.useState<"name" | "jobs" | "outstanding" | "total">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("clients-sort-by");
      if (saved && ["name", "jobs", "outstanding", "total"].includes(saved)) {
        return saved as "name" | "jobs" | "outstanding" | "total";
      }
    }
    return "name";
  });
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("clients-sort-direction");
      if (saved && ["asc", "desc"].includes(saved)) {
        return saved as "asc" | "desc";
      }
    }
    return "asc";
  });

  // Persist sorting preferences to localStorage
  React.useEffect(() => {
    localStorage.setItem("clients-sort-by", sortBy);
  }, [sortBy]);

  React.useEffect(() => {
    localStorage.setItem("clients-sort-direction", sortDirection);
  }, [sortDirection]);

  const sortOptions = [
    { value: "name" as const, label: "שם" },
    { value: "jobs" as const, label: "מספר עבודות" },
    { value: "outstanding" as const, label: "ממתין לתשלום" },
    { value: "total" as const, label: "סה״כ הכנסות" },
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

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-slate-950/50 pb-20 font-sans" dir="rtl">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-8 space-y-6">
        {/* Main Content Card */}
        <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden">
          {/* Toolbar */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search & Sort */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חפש לקוח..."
                    className="ps-9 h-9"
                  />
                </div>

                {/* Sort Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-9 shrink-0">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{currentSortLabel}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {sortOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setSortBy(option.value)}
                        className={cn(
                          sortBy === option.value && "bg-slate-100 dark:bg-slate-800"
                        )}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sort Direction Toggle */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}
                >
                  {sortDirection === "asc" ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
          </div>

          {/* Content - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-100 dark:divide-slate-800">
            {/* Client List */}
            <div className="lg:col-span-2">
              {sortedAndFilteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4">
                  <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
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
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedAndFilteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={cn(
                        "p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                        selectedClient?.id === client.id &&
                          "bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 border-s-2 border-s-blue-500"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-white truncate">
                            {client.name}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" />
                              {client.jobCount} עבודות
                            </span>
                            <span className="font-numbers" dir="ltr">
                              {formatCurrency(client.totalEarned)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {client.outstandingAmount > 0 && (
                            <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded font-medium">
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
              )}
            </div>

            {/* Analytics Panel - Embedded */}
            <div className="lg:col-span-1 bg-slate-50/50 dark:bg-slate-800/20">
              {selectedClient ? (
                <div className="p-4 space-y-4">
                  {/* Header */}
                  <div className="pb-4 border-b border-slate-200/60 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {selectedClient.name}
                    </h2>
                    <div className="mt-2 space-y-1">
                      {selectedClient.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Mail className="h-3.5 w-3.5" />
                          <a href={`mailto:${selectedClient.email}`} className="hover:text-blue-600" dir="ltr">
                            {selectedClient.email}
                          </a>
                        </div>
                      )}
                      {selectedClient.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Phone className="h-3.5 w-3.5" />
                          <a href={`tel:${selectedClient.phone}`} className="hover:text-blue-600" dir="ltr">
                            {selectedClient.phone}
                          </a>
                        </div>
                      )}
                      {selectedClient.defaultRate && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>תעריף: {formatCurrency(parseFloat(selectedClient.defaultRate))}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <TrendingUp className="h-4 w-4" />
                        סה״כ הכנסות
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white font-numbers" dir="ltr">
                        {formatCurrency(selectedClient.totalEarned)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Calendar className="h-4 w-4" />
                        החודש
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white font-numbers" dir="ltr">
                        {formatCurrency(selectedClient.thisMonthRevenue)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Calendar className="h-4 w-4" />
                        השנה
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white font-numbers" dir="ltr">
                        {formatCurrency(selectedClient.thisYearRevenue)}
                      </span>
                    </div>

                    <div className="border-t border-slate-200/60 dark:border-slate-700 pt-3" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Briefcase className="h-4 w-4" />
                        מספר עבודות
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedClient.jobCount}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <TrendingUp className="h-4 w-4" />
                        ממוצע לעבודה
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white font-numbers" dir="ltr">
                        {formatCurrency(selectedClient.averagePerJob)}
                      </span>
                    </div>

                    {selectedClient.avgDaysToPayment !== null && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Clock className="h-4 w-4" />
                          זמן תשלום ממוצע
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {Math.round(selectedClient.avgDaysToPayment)} ימים
                        </span>
                      </div>
                    )}

                    {(selectedClient.outstandingAmount > 0 || selectedClient.overdueInvoices > 0) && (
                      <>
                        <div className="border-t border-slate-200/60 dark:border-slate-700 pt-3" />

                        {selectedClient.outstandingAmount > 0 && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-4 w-4" />
                              ממתין לתשלום
                            </div>
                            <span className="font-semibold text-amber-600 dark:text-amber-400 font-numbers" dir="ltr">
                              {formatCurrency(selectedClient.outstandingAmount)}
                            </span>
                          </div>
                        )}

                        {selectedClient.overdueInvoices > 0 && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                              <AlertTriangle className="h-4 w-4" />
                              חשבוניות באיחור
                            </div>
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              {selectedClient.overdueInvoices}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Notes */}
                  {selectedClient.notes && (
                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                        <FileText className="h-4 w-4" />
                        הערות
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {selectedClient.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-4">
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
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
        <div className="flex justify-center gap-6 mb-2">
          <a href="#" className="hover:text-slate-600 transition-colors">הצהרת נגישות</a>
          <a href="#" className="hover:text-slate-600 transition-colors">מדיניות פרטיות</a>
          <a href="#" className="hover:text-slate-600 transition-colors">תנאי שימוש</a>
        </div>
        <p>© 2026 סדר - יוצאים לעצמאות</p>
      </footer>

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
    </div>
  );
}
