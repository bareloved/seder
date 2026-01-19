"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Merge, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DuplicateGroup } from "../types";
import { mergeClientNamesAction } from "../actions";

interface ClientMergeToolProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: DuplicateGroup[];
  onMergeComplete: () => Promise<void>;
}

export function ClientMergeTool({
  isOpen,
  onClose,
  duplicates,
  onMergeComplete,
}: ClientMergeToolProps) {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [selectedTargets, setSelectedTargets] = React.useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = React.useState(false);
  const [mergedGroups, setMergedGroups] = React.useState<Set<string>>(new Set());

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setExpandedGroups(new Set(duplicates.slice(0, 3).map((d) => d.normalizedName)));
      setSelectedTargets(new Map());
      setMergedGroups(new Set());

      // Auto-select the most used variant as default target
      const defaults = new Map<string, string>();
      for (const group of duplicates) {
        const sorted = [...group.clients].sort((a, b) => b.count - a.count);
        if (sorted[0]) {
          defaults.set(group.normalizedName, sorted[0].name);
        }
      }
      setSelectedTargets(defaults);
    }
  }, [isOpen, duplicates]);

  const toggleGroup = (normalizedName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(normalizedName)) {
      newExpanded.delete(normalizedName);
    } else {
      newExpanded.add(normalizedName);
    }
    setExpandedGroups(newExpanded);
  };

  const selectTarget = (normalizedName: string, clientName: string) => {
    const newTargets = new Map(selectedTargets);
    newTargets.set(normalizedName, clientName);
    setSelectedTargets(newTargets);
  };

  const handleMergeGroup = async (group: DuplicateGroup) => {
    const targetName = selectedTargets.get(group.normalizedName);
    if (!targetName) return;

    setIsLoading(true);
    try {
      const sourceNames = group.clients
        .filter((c) => c.name !== targetName)
        .map((c) => c.name);

      const result = await mergeClientNamesAction(targetName, sourceNames);
      if (result.success) {
        setMergedGroups((prev) => new Set([...prev, group.normalizedName]));
      } else {
        alert(result.error || "אירעה שגיאה במיזוג");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMergeAll = async () => {
    setIsLoading(true);
    try {
      for (const group of duplicates) {
        if (mergedGroups.has(group.normalizedName)) continue;

        const targetName = selectedTargets.get(group.normalizedName);
        if (!targetName) continue;

        const sourceNames = group.clients
          .filter((c) => c.name !== targetName)
          .map((c) => c.name);

        const result = await mergeClientNamesAction(targetName, sourceNames);
        if (result.success) {
          setMergedGroups((prev) => new Set([...prev, group.normalizedName]));
        }
      }
      await onMergeComplete();
    } finally {
      setIsLoading(false);
    }
  };

  const pendingGroups = duplicates.filter(
    (g) => !mergedGroups.has(g.normalizedName)
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            מיזוג לקוחות כפולים
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {pendingGroups.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <Check className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
              <p>כל הכפילויות טופלו!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                נמצאו {pendingGroups.length} קבוצות של שמות דומים. בחר את השם הנכון
                לכל קבוצה ולחץ "מזג" כדי לאחד את כל העבודות תחת שם אחד.
              </p>

              {duplicates.map((group) => {
                const isExpanded = expandedGroups.has(group.normalizedName);
                const isMerged = mergedGroups.has(group.normalizedName);
                const selectedTarget = selectedTargets.get(group.normalizedName);
                const totalCount = group.clients.reduce((sum, c) => sum + c.count, 0);

                return (
                  <div
                    key={group.normalizedName}
                    className={cn(
                      "border rounded-lg transition-colors",
                      isMerged
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                        : "border-slate-200 dark:border-border"
                    )}
                  >
                    {/* Group Header */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.normalizedName)}
                      className="w-full p-3 flex items-center justify-between text-right"
                      disabled={isMerged}
                    >
                      <div className="flex items-center gap-2">
                        {isMerged ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                        <span className="font-medium text-slate-900 dark:text-white">
                          {group.clients[0]?.name || group.normalizedName}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ({group.clients.length} וריאנטים, {totalCount} עבודות)
                        </span>
                      </div>
                      {isMerged && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          מוזג
                        </span>
                      )}
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && !isMerged && (
                      <div className="px-3 pb-3 space-y-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          בחר את השם שישמש:
                        </p>
                        <div className="space-y-1">
                          {group.clients.map((client) => (
                            <button
                              key={client.name}
                              type="button"
                              onClick={() =>
                                selectTarget(group.normalizedName, client.name)
                              }
                              className={cn(
                                "w-full p-2 rounded-md text-right text-sm flex items-center justify-between transition-colors",
                                selectedTarget === client.name
                                  ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
                                  : "bg-slate-50 dark:bg-muted hover:bg-slate-100 dark:hover:bg-slate-700"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                    selectedTarget === client.name
                                      ? "border-blue-500 bg-blue-500"
                                      : "border-slate-300 dark:border-slate-600"
                                  )}
                                >
                                  {selectedTarget === client.name && (
                                    <Check className="h-2.5 w-2.5 text-white" />
                                  )}
                                </div>
                                <span>{client.name}</span>
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {client.count} עבודות
                              </span>
                            </button>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleMergeGroup(group)}
                          disabled={isLoading || !selectedTarget}
                          className="w-full mt-2"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          ) : (
                            <Merge className="h-4 w-4 ml-2" />
                          )}
                          מזג קבוצה זו
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-200 dark:border-border pt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {pendingGroups.length === 0 ? "סגור" : "ביטול"}
          </Button>
          {pendingGroups.length > 0 && (
            <Button onClick={handleMergeAll} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ממזג...
                </>
              ) : (
                <>
                  <Merge className="h-4 w-4 ml-2" />
                  מזג הכל ({pendingGroups.length})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
