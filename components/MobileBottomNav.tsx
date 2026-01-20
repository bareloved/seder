"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, Users, BarChart3, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  hidden?: boolean;
}

const navItems = [
  { label: "הכנסות", href: "/income", icon: Wallet },
  { label: "לקוחות", href: "/clients", icon: Users },
  { label: "דוחות", href: "/analytics", icon: BarChart3 },
  { label: "הוצאות", href: "/expenses", icon: Receipt, comingSoon: true },
];

export function MobileBottomNav({ hidden = false }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 md:hidden transition-transform duration-300",
        "bg-white dark:bg-card border-t border-slate-200 dark:border-border",
        "pb-[env(safe-area-inset-bottom)]",
        hidden ? "translate-y-full" : "translate-y-0"
      )}
      dir="rtl"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.comingSoon) {
            return (
              <span
                key={item.href}
                className="flex flex-col items-center justify-center gap-1 min-w-[64px] h-full px-3 opacity-40 cursor-not-allowed"
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-normal text-slate-400">
                  {item.label}
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] h-full px-3",
                "transition-colors",
                isActive
                  ? "text-brand-primary dark:text-emerald-400"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className={cn("text-xs", isActive ? "font-medium" : "font-normal")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
