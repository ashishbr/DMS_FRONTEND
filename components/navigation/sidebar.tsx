"use client";

import { Dialog, Transition } from "@headlessui/react";
import {
  Activity,
  AlertTriangle,
  Building2,
  FileStack,
  Layers,
  Settings,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/",
    label: "Dashboard",
    icon: Activity,
    description: "KPIs, pipeline health, and outstanding actions."
  },
  {
    href: "/documents",
    label: "Documents",
    icon: FileStack,
    description: "All purchase orders, invoices, and agreements."
  },
  {
    href: "/clients",
    label: "Clients",
    icon: Building2,
    description: "Clients, vendors, and invoice hierarchy."
  },
  {
    href: "/exceptions",
    label: "Exceptions",
    icon: AlertTriangle,
    description: "Validation failures and manual follow-ups."
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: ShieldCheck,
    description: "Threshold warnings and expiry notifications."
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Integrations, roles, and automations."
  }
];

export function DashboardSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex h-full w-80 flex-col border-r border-slate-800 bg-slate-950/95 px-6 py-8">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white shadow-lg shadow-brand-500/40">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">EMB Global</p>
          <p className="text-lg font-semibold text-white">DMS Console</p>
        </div>
      </div>

      <nav className="space-y-4">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-xl border border-transparent p-4 transition hover:border-slate-800 hover:bg-slate-900/60",
                isActive && "border-brand-500/40 bg-brand-500/10 shadow-lg shadow-brand-500/20"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-5 w-5", isActive ? "text-brand-400" : "text-slate-400")} />
                  <span className="font-medium">{item.label}</span>
                </div>
                {isActive && (
                  <span className="rounded-full bg-brand-500/20 px-2 py-1 text-xs text-brand-200">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-400">{item.description}</p>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-sm font-semibold text-slate-200">Need faster ingest?</p>
        <p className="mt-1 text-xs text-slate-400">
          Sync WhatsApp, Gmail, and Drive ingest endpoints in Settings to fully automate intake.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <Transition show={open} as={Fragment}>
        <Dialog as="div" className="relative z-40 lg:hidden" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-950/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="w-80 max-w-full">{sidebarContent}</Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      <div className="hidden lg:block">{sidebarContent}</div>
    </>
  );
}
