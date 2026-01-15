"use client";

import Link from "next/link";
import { User, ClipboardList, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

interface NavbarProps {
    user?: {
        name?: string | null;
        email?: string;
        image?: string | null;
    };
}

export function Navbar({ user }: NavbarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/sign-in");
                },
            },
        });
    };

    const navItems = [
        { label: "תשלומים", href: "/income" },
        { label: "הוצאות", href: "/expenses" },
        { label: "סטטיסטיקות", href: "/statistics" },
    ];

    return (
        <header className="bg-brand-primary text-white shadow-sm sticky top-0 z-50 h-[80px]" dir="rtl">
            <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 h-full flex items-center justify-between">

                {/* Right Side: Logo & Navigation */}
                <div className="flex items-center gap-14">
                    {/* Logo Icon */}
                    <div className="flex items-center justify-center">
                        <ClipboardList className="w-8 h-8 text-white" />
                    </div>

                    {/* Navigation Links */}
                    <nav className="hidden md:flex items-center gap-14">
                        {navItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "text-xl font-normal transition-opacity hover:opacity-100",
                                        isActive ? "opacity-100 font-medium" : "opacity-80"
                                    )}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Left Side: User Profile Dropdown */}
                <div className="flex items-center pl-2">
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/30 bg-white/10 flex items-center justify-center cursor-pointer hover:border-white/50 transition-colors">
                                {user?.image ? (
                                    <img
                                        src={user.image}
                                        alt={user.name || "User"}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-orange-300 flex items-center justify-center">
                                        <User className="w-6 h-6 text-white/90" />
                                    </div>
                                )}
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="start">
                            <DropdownMenuLabel className="font-normal" dir="ltr">
                                <div className="flex flex-col space-y-1 text-left">
                                    <p className="text-sm font-medium leading-none">{user?.name || "משתמש"}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {user?.email || ""}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/profile" className="flex justify-between items-center cursor-pointer w-full" dir="rtl">
                                    <span>הפרופיל שלי</span>
                                    <User className="h-4 w-4 opacity-70" />
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/settings" className="flex justify-between items-center cursor-pointer w-full" dir="rtl">
                                    <span>הגדרות</span>
                                    <Settings className="h-4 w-4 opacity-70" />
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="flex justify-between items-center cursor-pointer text-red-600 focus:text-red-600"
                                onClick={handleLogout}
                                dir="rtl"
                            >
                                <span>התנתקות</span>
                                <LogOut className="h-4 w-4 opacity-70" />
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
