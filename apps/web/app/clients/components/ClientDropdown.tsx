"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Plus, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Client } from "@/db/schema";
import { createClientAction } from "../actions";

interface ClientDropdownProps {
  clients: Client[];
  selectedClientId?: string | null;
  selectedClientName?: string;
  onSelect: (client: Client | null, name: string) => void;
  placeholder?: string;
  className?: string;
  allowCreate?: boolean;
  compact?: boolean;
  hideArrow?: boolean;
}

export function ClientDropdown({
  clients,
  selectedClientId,
  selectedClientName = "",
  onSelect,
  placeholder = "בחר לקוח",
  className,
  allowCreate = true,
  compact = false,
  hideArrow = false,
}: ClientDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Find selected client
  const selectedClient = selectedClientId
    ? clients.find((c) => c.id === selectedClientId)
    : null;

  const displayValue = selectedClient?.name || selectedClientName || "";

  // Filter clients based on search
  const filteredClients = React.useMemo(() => {
    if (!searchValue.trim()) {
      return clients.filter((c) => !c.isArchived).slice(0, 10);
    }
    const query = searchValue.toLowerCase();
    return clients
      .filter((c) => !c.isArchived && c.name.toLowerCase().includes(query))
      .slice(0, 10);
  }, [clients, searchValue]);

  // Check if search matches any existing client exactly
  const exactMatch = clients.find(
    (c) => c.name.toLowerCase() === searchValue.trim().toLowerCase()
  );

  // Focus input when popover opens
  React.useEffect(() => {
    if (isOpen) {
      setSearchValue("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelect = (client: Client | null, name: string = "") => {
    onSelect(client, name);
    setIsOpen(false);
    setSearchValue("");
  };

  const handleCreateNew = async () => {
    if (!searchValue.trim()) return;

    setIsCreating(true);
    try {
      const result = await createClientAction({ name: searchValue.trim() });
      if (result.success && result.client) {
        handleSelect(result.client, result.client.name);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchValue.trim()) {
      e.preventDefault();
      if (filteredClients.length > 0) {
        handleSelect(filteredClients[0], filteredClients[0].name);
      } else if (allowCreate && !exactMatch) {
        handleCreateNew();
      }
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            "justify-between font-normal",
            compact ? "h-8 px-2 text-sm" : "h-10 px-3",
            !displayValue && "text-slate-400",
            className
          )}
        >
          <span className="truncate">
            {displayValue || placeholder}
          </span>
          {!hideArrow && <ChevronDown className={cn("shrink-0 opacity-50", compact ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2")} />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <div className="p-2 border-b border-slate-100 dark:border-border">
          <Input
            ref={inputRef}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="חפש או הוסף לקוח..."
            className="h-9"
          />
        </div>

        <div className="max-h-[250px] overflow-y-auto overscroll-contain p-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Clear Option */}
          <button
            type="button"
            onClick={() => handleSelect(null, "")}
            className="w-full px-2 py-1.5 text-sm text-right rounded-md hover:bg-slate-100 dark:hover:bg-muted/50 transition-colors text-slate-500"
          >
            ללא לקוח
          </button>

          {/* Client List */}
          {filteredClients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => handleSelect(client, client.name)}
              className={cn(
                "w-full px-2 py-1.5 text-sm text-right rounded-md hover:bg-slate-100 dark:hover:bg-muted/50 transition-colors flex items-center justify-between",
                selectedClientId === client.id && "bg-blue-50 dark:bg-blue-900/20"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{client.name}</span>
              </div>
              {selectedClientId === client.id && (
                <Check className="h-4 w-4 text-blue-600 shrink-0" />
              )}
            </button>
          ))}

          {/* No Results */}
          {filteredClients.length === 0 && searchValue.trim() && (
            <div className="px-2 py-3 text-sm text-center text-slate-500">
              לא נמצאו לקוחות
            </div>
          )}

          {/* Create New Option */}
          {allowCreate && searchValue.trim() && !exactMatch && (
            <>
              <div className="border-t border-slate-100 dark:border-border my-1" />
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={isCreating}
                className="w-full px-2 py-1.5 text-sm text-right rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>
                  {isCreating ? "יוצר..." : `צור "${searchValue.trim()}"`}
                </span>
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
