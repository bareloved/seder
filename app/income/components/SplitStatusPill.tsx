"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, FileX, Send, Banknote } from "lucide-react";
import {
  WorkStatus,
  MoneyStatus,
  WORK_STATUS_CONFIG,
  MONEY_STATUS_CONFIG,
} from "../types";

// Icon mapping
const WORK_ICONS = {
  Clock,
  CheckCircle2,
} as const;

const MONEY_ICONS = {
  FileX,
  Send,
  Banknote,
} as const;

interface SplitStatusPillProps {
  workStatus: WorkStatus;
  moneyStatus: MoneyStatus;
  isInteractive?: boolean; // Enable money status dropdown
  onMoneyStatusChange?: (newStatus: MoneyStatus) => void;
  className?: string;
}

export function SplitStatusPill({
  workStatus,
  moneyStatus,
  isInteractive = true,
  onMoneyStatusChange,
  className,
}: SplitStatusPillProps) {
  const workConfig = WORK_STATUS_CONFIG[workStatus];
  const moneyConfig = MONEY_STATUS_CONFIG[moneyStatus];

  const WorkIcon = WORK_ICONS[workConfig.icon];
  const MoneyIcon = MONEY_ICONS[moneyConfig.icon];

  // Work status icon (right side in RTL - read-only)
  const WorkIcon_ = (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-full",
            workConfig.bgClass,
            workConfig.textClass
          )}
        >
          <WorkIcon className="h-3.5 w-3.5" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {workConfig.tooltip}
      </TooltipContent>
    </Tooltip>
  );

  // Money status icon (left side in RTL - interactive)
  const MoneyIconContent = (
    <div
      className={cn(
        "flex items-center justify-center w-7 h-7 rounded-full",
        moneyConfig.bgClass,
        moneyConfig.textClass,
        isInteractive && "cursor-pointer hover:opacity-80 transition-opacity"
      )}
    >
      <MoneyIcon className="h-3.5 w-3.5" />
    </div>
  );

  const MoneyIcon_ = isInteractive && onMoneyStatusChange ? (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              className="focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              {MoneyIconContent}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {moneyConfig.tooltip}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="center"
        className="p-1 min-w-[44px]"
        sideOffset={4}
        avoidCollisions={true}
      >
        {(["no_invoice", "invoice_sent", "paid"] as MoneyStatus[])
          .filter((status) => status !== moneyStatus)
          .map((status) => {
            const config = MONEY_STATUS_CONFIG[status];
            const StatusIcon = MONEY_ICONS[config.icon];
            return (
              <Tooltip key={status}>
                <TooltipTrigger asChild>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoneyStatusChange(status);
                    }}
                    className="p-1 focus:bg-transparent justify-center"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-full",
                        config.bgClass,
                        config.textClass
                      )}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                    </div>
                  </DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {config.tooltip}
                </TooltipContent>
              </Tooltip>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>{MoneyIconContent}</div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {moneyConfig.tooltip}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1",
        className
      )}
      dir="rtl"
    >
      {/* In RTL: Work status on right (start), Money status on left (end) */}
      {WorkIcon_}
      {MoneyIcon_}
    </div>
  );
}
