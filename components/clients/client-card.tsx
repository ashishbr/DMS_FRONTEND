"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientWithVendors, LinkedDocumentSummary } from "@/lib/types/financial";
import { FileText } from "lucide-react";
import { VendorRow } from "./vendor-row";
import { ClientGeneratedPOs } from "./ClientGeneratedPOs";
import { isUnknownClient, renameClient } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

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
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(client.client_name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const unknown = isUnknownClient(client.client_name);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleRename = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nameInput.trim() || nameInput.trim() === client.client_name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await renameClient(client.client_name, nameInput.trim());
      await queryClient.invalidateQueries({ queryKey: ["clients-overview"] });
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      setEditing(false);
    } catch {
      alert("Failed to rename client. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNameInput(client.client_name);
    setEditing(false);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      {/* Card header */}
      <button
        type="button"
        onClick={() => !editing && setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(e as unknown as React.MouseEvent);
                  if (e.key === "Escape") handleCancel(e as unknown as React.MouseEvent);
                }}
                disabled={saving}
                className="rounded-lg border border-brand-400 bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white focus:outline-none disabled:opacity-60 w-48"
              />
              <button
                onClick={handleRename}
                disabled={saving}
                className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 p-1.5 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg bg-slate-700/50 border border-slate-600 p-1.5 text-slate-400 hover:bg-slate-700 disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("text-lg font-semibold truncate", unknown ? "text-amber-300" : "text-white")}>
                {client.client_name}
              </span>
              {unknown && (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                  className="shrink-0 rounded-md p-1 text-amber-400 hover:bg-amber-500/10"
                  title="Rename client"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
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

          {/* All Linked Documents */}
          {client.linked_documents?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Linked Documents ({client.linked_documents.length})
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-800/30">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/60">
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500">Title</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500">Category</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500">Reference</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-500">Amount</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {client.linked_documents.map((doc: LinkedDocumentSummary) => (
                      <tr key={doc.id}>
                        <td className="px-4 py-2.5 text-slate-200 max-w-[180px] truncate">
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3 w-3 text-slate-500 shrink-0" />
                            <span className="truncate">{doc.title || "Untitled"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">{doc.category}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">
                          {doc.po_number || doc.invoice_number || doc.msa_number || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-200">
                          {fmt(doc.amount, doc.currency)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300">
                            {doc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Generated Vendor POs */}
          <ClientGeneratedPOs clientName={client.client_name} />
        </div>
      )}
    </div>
  );
}
