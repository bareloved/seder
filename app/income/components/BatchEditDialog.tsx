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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { Category, Client } from "@/db/schema";
import { CategoryChip } from "./CategoryChip";
import { cn } from "@/lib/utils";

type EditType = "client" | "category";

interface BatchEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editType: EditType | null;
  selectedCount: number;
  clients: string[];
  clientRecords?: Client[];
  categories: Category[];
  onConfirm: (value: string | null) => void;
  isLoading?: boolean;
}

export function BatchEditDialog({
  isOpen,
  onClose,
  editType,
  selectedCount,
  clients,
  clientRecords,
  categories,
  onConfirm,
  isLoading = false,
}: BatchEditDialogProps) {
  const [clientValue, setClientValue] = React.useState("");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes or type changes
  React.useEffect(() => {
    if (isOpen) {
      setClientValue("");
      setSelectedCategoryId(null);
      setShowSuggestions(false);
    }
  }, [isOpen, editType]);

  // Focus input when editing client
  React.useEffect(() => {
    if (isOpen && editType === "client" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, editType]);

  const filteredClients = React.useMemo(() => {
    if (!clientValue.trim()) return clients.slice(0, 8);
    return clients
      .filter((c) => c.toLowerCase().includes(clientValue.toLowerCase()))
      .slice(0, 8);
  }, [clients, clientValue]);

  const handleConfirm = () => {
    if (editType === "client") {
      onConfirm(clientValue.trim() || null);
    } else if (editType === "category") {
      onConfirm(selectedCategoryId);
    }
  };

  const selectClient = (client: string) => {
    setClientValue(client);
    setShowSuggestions(false);
  };

  const title = editType === "client"
    ? `שינוי לקוח ל-${selectedCount} עבודות`
    : `שינוי קטגוריה ל-${selectedCount} עבודות`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {editType === "client" && (
            <div className="space-y-3">
              <Label htmlFor="client-input">שם לקוח</Label>
              <div className="relative">
                <Input
                  ref={inputRef}
                  id="client-input"
                  value={clientValue}
                  onChange={(e) => {
                    setClientValue(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="הזן שם לקוח..."
                  className="w-full text-right"
                  dir="rtl"
                />
                {showSuggestions && filteredClients.length > 0 && (
                  <div className="absolute z-20 top-full right-0 left-0 mt-1 bg-white dark:bg-slate-800 shadow-lg rounded-md border border-slate-200 dark:border-slate-700 max-h-[200px] overflow-y-auto">
                    {filteredClients.map((client) => (
                      <button
                        key={client}
                        type="button"
                        className="w-full px-3 py-2 text-sm text-right hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectClient(client);
                        }}
                      >
                        {client}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                השאר ריק כדי לרוקן את שדה הלקוח
              </p>
            </div>
          )}

          {editType === "category" && (
            <div className="space-y-3">
              <Label>בחר קטגוריה</Label>
              <div className="grid grid-cols-2 gap-2">
                {/* Option to clear category */}
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(null)}
                  className={cn(
                    "p-3 rounded-lg border text-sm text-right transition-colors",
                    selectedCategoryId === null
                      ? "border-slate-400 bg-slate-50 dark:bg-slate-800"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <span className="text-slate-500">ללא קטגוריה</span>
                </button>

                {/* Category options */}
                {categories.filter(c => !c.isArchived).map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={cn(
                      "p-3 rounded-lg border text-sm text-right transition-colors",
                      selectedCategoryId === category.id
                        ? "border-slate-400 bg-slate-50 dark:bg-slate-800"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <CategoryChip category={category} size="sm" withIcon />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            ביטול
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                מעדכן...
              </>
            ) : (
              "עדכן"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
