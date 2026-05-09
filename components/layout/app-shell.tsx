"use client";

import { ChevronDown, LogOut, Menu, Search, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardSidebar } from "@/components/navigation/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChatbotWidget } from "@/components/chat/chatbot-widget";
import { useAuth } from "@/lib/auth/use-auth";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/documents", label: "Documents" },
  { href: "/clients", label: "Clients" },
  { href: "/exceptions", label: "Exceptions" },
  { href: "/alerts", label: "Alerts" },
  { href: "/settings", label: "Settings" }
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, setRole, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-slate-950">
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search PO, vendor, client..."
                  className="h-10 w-72 rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
            </div>
            <nav className="hidden gap-3 md:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    pathname === link.href
                      ? "bg-brand-500 text-white shadow-lg shadow-brand-500/40"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5 text-slate-300" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-100 transition hover:border-slate-700 hover:bg-slate-800/80"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/30 text-brand-100">
                      <User className="h-4 w-4" />
                    </span>
                    <span className="text-left">
                      <span className="block font-medium leading-tight">{user.name}</span>
                      <span className="block text-xs text-slate-400">{user.role.toUpperCase()}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-slate-400">{user.email}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setRole("finance")}>Switch to Finance</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setRole("marketing")}>Switch to Marketing</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setRole("admin")}>Switch to Admin</DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-rose-300"
                    onSelect={() => { logout(); router.replace("/login"); }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
      <ChatbotWidget />
    </div>
  );
}
