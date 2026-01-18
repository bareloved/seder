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
import { ClientAnalyticsPanel } from "./components/ClientAnalyticsPanel";
import { ClientMergeTool } from "./components/ClientMergeTool";
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
}

export function ClientsPageClient({
  initialClients,
  initialDuplicates,
}: ClientsPageClientProps) {
  const [clients, setClients] = React.useState(initialClients);
  const [duplicates, setDuplicates] = React.useState(initialDuplicates);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState<ClientWithAnalytics | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<ClientWithAnalytics | null>(null);
  const [isMergeToolOpen, setIsMergeToolOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const filteredClients = React.useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query)
    );
  }, [clients, searchQuery]);

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
      // Update existing client
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
        // Update selected client if it was the one being edited
        if (selectedClient?.id === data.id) {
          const updated = clients.find((c) => c.id === data.id);
          if (updated) setSelectedClient(updated);
        }
      }
      return result;
    } else {
      // Create new client
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              לקוחות
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              נהל את רשימת הלקוחות שלך ועקוב אחר הנתונים שלהם
            </p>
          </div>
          <div className="flex items-center gap-2">
            {duplicates.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setIsMergeToolOpen(true)}
                className="gap-2"
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
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleImportExisting}>
                  ייבא לקוחות מעבודות קיימות
                  <RefreshCw className="h-4 w-4" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setIsFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              לקוח חדש
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              {/* Search */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חפש לקוח..."
                    className="pr-9"
                  />
                </div>
              </div>

              {/* Client Table */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredClients.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                    {searchQuery ? "לא נמצאו לקוחות תואמים" : "אין לקוחות עדיין"}
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={cn(
                        "p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50",
                        selectedClient?.id === client.id &&
                          "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-white truncate">
                            {client.name}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <span>{client.jobCount} עבודות</span>
                            <span>{formatCurrency(client.totalEarned)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {client.outstandingAmount > 0 && (
                            <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded">
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
                                עריכה
                                <Edit2 className="h-4 w-4" />
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchiveClient(client.id);
                                }}
                                className="text-red-600"
                              >
                                העבר לארכיון
                                <Archive className="h-4 w-4" />
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Analytics Panel */}
          <div className="lg:col-span-1">
            <ClientAnalyticsPanel client={selectedClient} />
          </div>
        </div>
      </div>

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
