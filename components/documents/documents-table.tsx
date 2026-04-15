"use client";

import { useMemo, useState, useRef, FormEvent } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UploadWidget } from "@/components/documents/upload-widget";
import { useDocumentsQuery, useClientNamesQuery } from "@/lib/queries";
import { linkDocumentToClient, unlinkDocument, isUnknownClient } from "@/lib/api";

import type { DocumentRecord, DocumentCategory } from "@/lib/data/sample-data";

const statusVariant: Record<string, "info" | "success" | "warning" | "danger"> = {
  Draft: "info",
  Approved: "success",
  "Pending Review": "warning",
  Flagged: "danger"
};

// ---------------------------------------------------------------------------
// Link-to-client modal
// ---------------------------------------------------------------------------
function LinkClientModal({
  doc,
  clientNames,
  onClose,
}: {
  doc: DocumentRecord;
  clientNames: string[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(
    isUnknownClient(doc.client) ? "" : doc.client
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrentlyLinked = !isUnknownClient(doc.client);
  const listId = `client-names-${doc.id}`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = value.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      await linkDocumentToClient(doc.id, name);
      await qc.invalidateQueries({ queryKey: ["documents"] });
      await qc.invalidateQueries({ queryKey: ["clients-overview"] });
      await qc.invalidateQueries({ queryKey: ["client-names"] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link document");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlink() {
    setSaving(true);
    setError(null);
    try {
      await unlinkDocument(doc.id);
      await qc.invalidateQueries({ queryKey: ["documents"] });
      await qc.invalidateQueries({ queryKey: ["clients-overview"] });
      await qc.invalidateQueries({ queryKey: ["client-names"] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlink document");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-base font-semibold text-white">Assign to Client</h2>
        <p className="mt-1 text-sm text-slate-400 truncate">
          {doc.title}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Client Name
            </label>
            {/* datalist gives free-text + autocomplete without a custom combobox */}
            <input
              ref={inputRef}
              list={listId}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Type or select a client…"
              autoFocus
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <datalist id={listId}>
              {clientNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <p className="mt-1.5 text-xs text-slate-500">
              Choose an existing client or type a new name to create one.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            {isCurrentlyLinked && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleUnlink}
                disabled={saving}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                Unlink
              </Button>
            )}
            <div className={cn("flex gap-2", !isCurrentlyLinked && "ml-auto")}>
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !value.trim()}>
                {saving ? "Saving…" : "Assign"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documents table
// ---------------------------------------------------------------------------
export function DocumentsTable() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "all">("all");
  const [linkingDoc, setLinkingDoc] = useState<DocumentRecord | null>(null);

  const { data, isLoading, isError, error } = useDocumentsQuery();
  const { data: clientNames = [] } = useClientNamesQuery();

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    const documents = data ?? [];
    return documents.filter((doc) => {
      const matchesCategory = category === "all" || doc.category === category;
      const matchesQuery =
        doc.title.toLowerCase().includes(term) ||
        doc.id.toLowerCase().includes(term) ||
        doc.client.toLowerCase().includes(term) ||
        (doc.vendor ? doc.vendor.toLowerCase().includes(term) : false);
      return matchesCategory && matchesQuery;
    });
  }, [search, category, data]);

  return (
    <div className="space-y-6">
      {linkingDoc && (
        <LinkClientModal
          doc={linkingDoc}
          clientNames={clientNames}
          onClose={() => setLinkingDoc(null)}
        />
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Document Inventory</h1>
          <p className="text-sm text-slate-400">
            Central repository of purchase orders, invoices, and agreements.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by ID, client, vendor..."
          />
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value as typeof category)}
          >
            <option value="all">All categories</option>
            <option value="Client PO">Client POs</option>
            <option value="Vendor PO">Vendor POs</option>
            <option value="Client Invoice">Client Invoices</option>
            <option value="Vendor Invoice">Vendor Invoices</option>
            <option value="Service Agreement">Service Agreements</option>
          </Select>
        </div>
      </div>

      <UploadWidget />

      <div className="overflow-hidden rounded-2xl border border-slate-900/60 bg-slate-900/70 shadow-xl shadow-slate-950/30">
        {isLoading && (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            Loading documents...
          </div>
        )}
        {isError && (
          <div className="px-6 py-10 text-center text-sm text-rose-200">
            Unable to load documents. {error instanceof Error ? error.message : null}
          </div>
        )}
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/90 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Client / Vendor</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Confidence</th>
              <th className="px-4 py-3 text-left">Linked</th>
              <th className="px-4 py-3 text-left">Client</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-slate-200">
            {filtered.map((doc) => (
              <tr
                key={doc.id}
                className="transition hover:bg-slate-800/40"
              >
                <td className="px-4 py-3 font-medium text-brand-200">
                  <Link href={`/documents/${doc.id}`}>{doc.id}</Link>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-slate-400">
                      Created {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge>{doc.category}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-slate-400">
                    <p className="text-sm text-slate-200">{doc.client}</p>
                    {doc.vendor && <p>Vendor: {doc.vendor}</p>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-medium">
                    {doc.currency} {doc.amount.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[doc.status]}>{doc.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-800">
                      <div
                        className={cn(
                          "h-1.5 rounded-full",
                          doc.confidence > 0.9
                            ? "bg-emerald-400"
                            : doc.confidence > 0.8
                            ? "bg-amber-400"
                            : "bg-rose-400"
                        )}
                        style={{ width: `${Math.round(doc.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">
                      {Math.round(doc.confidence * 100)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {doc.linkedTo ? (
                    <Link className="text-sm text-brand-300 hover:text-brand-200" href={`/documents/${doc.linkedTo}`}>
                      {doc.linkedTo}
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-500">Unlinked</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setLinkingDoc(doc)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium transition",
                      isUnknownClient(doc.client)
                        ? "border border-slate-700 text-slate-400 hover:border-brand-500 hover:text-brand-300"
                        : "border border-brand-500/40 bg-brand-500/10 text-brand-300 hover:bg-brand-500/20"
                    )}
                  >
                    {isUnknownClient(doc.client) ? "+ Add Client" : doc.client}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && !isError && !filtered.length && (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            No documents found. Adjust filters and try again.
          </div>
        )}
      </div>
    </div>
  );
}
