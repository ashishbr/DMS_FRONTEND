"use client";

import { useState } from "react";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VendorWithInvoices, VendorInvoiceRecord } from "@/lib/types/financial";

function fmt(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-500/20 text-yellow-200 border-yellow-500/30",
    APPROVED: "bg-blue-500/20 text-blue-200 border-blue-500/30",
    PAID: "bg-green-500/20 text-green-200 border-green-500/30",
    FLAGGED: "bg-rose-500/20 text-rose-200 border-rose-500/30",
    OVERBILLING_DETECTED: "bg-rose-500/20 text-rose-200 border-rose-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        map[status] ?? "bg-slate-700/50 text-slate-300 border-slate-600"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function MatchingBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-slate-500">—</span>;
  const map: Record<string, string> = {
    TWO_WAY_MATCHED: "bg-green-500/20 text-green-200 border-green-500/30",
    THREE_WAY_MATCHED: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
    UNMATCHED: "bg-slate-700/50 text-slate-300 border-slate-600",
    DUPLICATE: "bg-rose-500/20 text-rose-200 border-rose-500/30",
  };
  const label: Record<string, string> = {
    TWO_WAY_MATCHED: "2-Way",
    THREE_WAY_MATCHED: "3-Way",
    UNMATCHED: "Unmatched",
    DUPLICATE: "Duplicate",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        map[status] ?? "bg-slate-700/50 text-slate-300 border-slate-600"
      )}
    >
      {label[status] ?? status.replace(/_/g, " ")}
    </span>
  );
}

function OverbillingCell({ invoice }: { invoice: VendorInvoiceRecord }) {
  if (!invoice.overbilling_flag) {
    return <span className="text-xs text-slate-500">—</span>;
  }
  return (
    <span
      className="group relative inline-flex items-center gap-1 text-xs text-rose-300"
      title={
        invoice.overbilling_amount != null
          ? `Overbilled by ${fmt(invoice.overbilling_amount, invoice.currency)}`
          : "Overbilling detected"
      }
    >
      <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
      {invoice.overbilling_amount != null
        ? fmt(invoice.overbilling_amount, invoice.currency)
        : "Yes"}
    </span>
  );
}

export function VendorRow({ vendor }: { vendor: VendorWithInvoices }) {
  const [open, setOpen] = useState(false);

  const pct =
    vendor.total_allocated > 0
      ? Math.min((vendor.total_invoiced / vendor.total_allocated) * 100, 100)
      : 0;
  const isOver = vendor.total_allocated > 0 && vendor.total_invoiced > vendor.total_allocated;
  const isNearing =
    !isOver &&
    vendor.total_allocated > 0 &&
    vendor.total_invoiced / vendor.total_allocated > 0.8;

  const barColor = isOver
    ? "bg-rose-500"
    : isNearing
    ? "bg-amber-400"
    : "bg-green-500";

  return (
    <div className="rounded-lg bg-slate-800/50 border border-slate-700/50">
      {/* Vendor header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{vendor.vendor_name}</span>
            {vendor.invoices.length > 0 && (
              <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                {vendor.invoices.length} invoice{vendor.invoices.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
              <div
                className={cn("h-full rounded-full transition-all", barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-slate-400">
              {fmt(vendor.total_invoiced, "USD")} invoiced of{" "}
              {fmt(vendor.total_allocated, "USD")} allocated
            </span>
          </div>
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-90"
          )}
        />
      </button>

      {/* Invoice table */}
      {open && vendor.invoices.length > 0 && (
        <div className="border-t border-slate-700/50 px-4 pb-3 pt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/60">
                  <th className="py-2 pr-4 text-left font-medium text-slate-500">Invoice #</th>
                  <th className="py-2 pr-4 text-right font-medium text-slate-500">Amount</th>
                  <th className="py-2 pr-4 text-left font-medium text-slate-500">Status</th>
                  <th className="py-2 pr-4 text-left font-medium text-slate-500">Matching</th>
                  <th className="py-2 text-left font-medium text-slate-500">Overbilling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {vendor.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2 pr-4 font-mono text-slate-200">{inv.invoice_number}</td>
                    <td className="py-2 pr-4 text-right text-slate-200">
                      {fmt(inv.invoice_amount, inv.currency)}
                    </td>
                    <td className="py-2 pr-4">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="py-2 pr-4">
                      <MatchingBadge status={inv.matching_status} />
                    </td>
                    <td className="py-2">
                      <OverbillingCell invoice={inv} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && vendor.invoices.length === 0 && (
        <div className="border-t border-slate-700/50 px-4 py-3 text-xs text-slate-500">
          No invoices for this vendor yet.
        </div>
      )}
    </div>
  );
}
