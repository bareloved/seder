"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogOut, Download, Tags } from "lucide-react";
import Link from "next/link";

interface UserButtonProps {
  onExportCSV?: () => void;
}

export default function UserButton({ onExportCSV }: UserButtonProps) {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  if (!session) {
    return null;
  }

  return (
    <DropdownMenu>
        <Tooltip>
        <TooltipTrigger asChild>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 overflow-hidden border">
          {session.user.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={session.user.image}
                alt={session.user.name || "User"}
                className="h-full w-full object-cover"
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-200">
              {session.user.name?.charAt(0) || "U"}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>חשבון משתמש</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent className="w-56" align="start" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onExportCSV && (
          <DropdownMenuItem onClick={onExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            <span>ייצוא ל-CSV</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/categories" className="flex items-center">
            <Tags className="mr-2 h-4 w-4" />
            <span>ניהול קטגוריות</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>התנתקות</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
