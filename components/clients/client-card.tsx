"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientWithVendors } from "@/lib/types/financial";
import { VendorRow } from "./vendor-row";

function fmt(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function POStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "bg-slate-700/50 text-slate-300 border-slate-600",
    APPROVED: "bg-blue-500/20 text-blue-200 border-blue-500/30",
    ACTIVE: "bg-green-500/20 text-green-200 border-green-500/30",
    CLOSED: "bg-slate-700/30 text-slate-500 border-slate-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        map[status] ?? "bg-slate-700/50 text-slate-300 border-slate-600"
      )}
    >
      {status}
    </span>
  );
}

function ClientInvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-500/20 text-yellow-200 border-yellow-500/30",
    APPROVED: "bg-blue-500/20 text-blue-200 border-blue-500/30",
    PAID: "bg-green-500/20 text-green-200 border-green-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        map[status] ?? "bg-slate-700/50 text-slate-300 border-slate-600"
      )}
    >
      {status}
    </span>
  );
}

export function ClientCard({ client }: { client: ClientWithVendors }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      {/* Card header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg font-semibold text-white truncate">{client.client_name}</span>
          {client.client_pos.length > 0 && (
            <span className="shrink-0 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
              {client.client_pos.length} PO{client.client_pos.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="rounded-lg bg-slate-800/80 border border-slate-700/60 px-3 py-1 text-xs text-slate-300">
            PO Value:{" "}
            <span className="font-semibold text-slate-100">{fmt(client.total_po_value)}</span>
          </span>
          <span className="rounded-lg bg-slate-800/80 border border-slate-700/60 px-3 py-1 text-xs text-slate-300">
            Invoiced:{" "}
            <span className="font-semibold text-slate-100">
              {fmt(client.total_client_invoiced)}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-slate-800 px-5 py-4 space-y-6">
          {/* Purchase Orders */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Purchase Orders
            </p>
            {client.client_pos.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-800/30">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/60">
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500">PO Number</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500">Status</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-500">Total Value</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500">Issue Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {client.client_pos.map((po) => (
                      <tr key={po.id}>
                        <td className="px-4 py-2.5 font-mono text-slate-200">{po.po_number}</td>
                        <td className="px-4 py-2.5">
                          <POStatusBadge status={po.status} />
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-200">
                          {fmt(po.total_value, po.currency)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">
                          {po.issue_date
                            ? new Date(po.issue_date).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No purchase orders yet.</p>
            )}
          </div>

          {/* Vendors */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Vendors
            </p>
            {client.vendors.length > 0 ? (
              <div className="space-y-2">
                {client.vendors.map((vendor) => (
                  <VendorRow key={vendor.vendor_name} vendor={vendor} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No vendors linked to this client.</p>
            )}
          </div>

          {/* Client Invoices */}
          {client.client_invoices.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Client Invoices
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-800/30">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/60">
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500">Invoice #</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-500">Amount</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500">Status</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500">Invoice Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {client.client_invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="px-4 py-2.5 font-mono text-slate-200">{inv.invoice_number}</td>
                        <td className="px-4 py-2.5 text-right text-slate-200">
                          {fmt(inv.invoice_amount, inv.currency)}
                        </td>
                        <td className="px-4 py-2.5">
                          <ClientInvoiceStatusBadge status={inv.status} />
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">
                          {inv.invoice_date
                            ? new Date(inv.invoice_date).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
