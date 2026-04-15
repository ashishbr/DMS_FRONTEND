"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Search, Users, FileText, GripVertical, CheckCircle2,
  ChevronDown, ChevronUp, Pencil, Check, X, Trash2, Tag,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useClientsOverview } from "@/lib/queries";
import {
  linkDocumentToClient, unlinkDocument, updateDocumentCategory,
  renameClient, isUnknownClient,
} from "@/lib/api";
import { useAuth } from "@/lib/auth/use-auth";
import type { ApiDocument } from "@/lib/api";

// ─── Constants ───────────────────────────────────────────────────────────────

const DOCUMENT_CATEGORIES = [
  "Client PO",
  "Vendor PO",
  "Client Invoice",
  "Vendor Invoice",
  "MSA",
  "Contract",
  "Other",
] as const;

type DocCategory = (typeof DOCUMENT_CATEGORIES)[number] | "All";

// Categories that define the client relationship (not auto-classified as linked)
const SELF_DEFINING_CATEGORIES = new Set(["Client PO", "Vendor PO", "MSA", "Contract"]);

// ─── Data fetching ────────────────────────────────────────────────────────────

function useApiDocuments() {
  return useQuery<ApiDocument[]>({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents/");
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      return data.documents as ApiDocument[];
    },
    staleTime: 1000 * 60,
  });
}

// ─── Inline category selector ─────────────────────────────────────────────────

function CategoryBadge({
  doc,
  onChanged,
}: {
  doc: ApiDocument;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function select(cat: string) {
    if (cat === doc.category) { setOpen(false); return; }
    setSaving(true);
    try {
      await updateDocumentCategory(doc.id, cat);
      onChanged();
    } catch {
      alert("Failed to update category.");
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        disabled={saving}
        className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300 hover:border-brand-400 hover:text-brand-300 transition-colors disabled:opacity-50"
        title="Change category"
      >
        <Tag className="h-2.5 w-2.5" />
        {saving ? "…" : doc.category}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-700 bg-slate-900 shadow-xl py-1">
          {DOCUMENT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => select(cat)}
              className={`w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-slate-800 ${
                cat === doc.category ? "text-brand-300 font-semibold" : "text-slate-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Draggable document card ──────────────────────────────────────────────────

function DraggableDocumentCard({
  doc,
  onCategoryChanged,
}: {
  doc: ApiDocument;
  onCategoryChanged: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: doc.id });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 select-none transition-opacity ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <button
        {...listeners}
        className="mt-0.5 cursor-grab text-slate-600 hover:text-slate-400 active:cursor-grabbing"
        aria-label="Drag handle"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium text-white truncate">
          {doc.title || doc.po_number || doc.invoice_number || doc.msa_number || "Untitled"}
        </p>
        <div className="flex items-center gap-2">
          <CategoryBadge doc={doc} onChanged={onCategoryChanged} />
          {(doc.po_number || doc.invoice_number) && (
            <span className="text-[10px] text-slate-500 truncate">
              {doc.po_number || doc.invoice_number}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Floating preview while dragging
function DragPreviewCard({ doc }: { doc: ApiDocument }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-brand-500/60 bg-slate-800 p-3 shadow-2xl w-64 rotate-2 opacity-95">
      <GripVertical className="h-4 w-4 mt-0.5 text-brand-400" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {doc.title || doc.po_number || doc.invoice_number || "Untitled"}
        </p>
        <p className="text-xs text-slate-400">{doc.category}</p>
      </div>
    </div>
  );
}

// ─── Client drop zone ─────────────────────────────────────────────────────────

function ClientDropZone({
  clientName,
  mappedDocs,
  isOver,
  onRenamed,
  onUnlink,
}: {
  clientName: string;
  mappedDocs: ApiDocument[];
  isOver: boolean;
  onRenamed: () => void;
  onUnlink: (docId: string) => Promise<void>;
}) {
  const { setNodeRef } = useDroppable({ id: clientName });
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(clientName);
  const [saving, setSaving] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const unknown = isUnknownClient(clientName);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleRename = async () => {
    if (!nameInput.trim() || nameInput.trim() === clientName) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await renameClient(clientName, nameInput.trim());
      onRenamed();
      setEditing(false);
    } catch {
      alert("Failed to rename client. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const visible = expanded ? mappedDocs : mappedDocs.slice(0, 3);
  const hasMore = mappedDocs.length > 3;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-4 transition-colors min-h-[100px] ${
        isOver
          ? "border-brand-400 bg-brand-500/10"
          : unknown
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Users className="h-4 w-4 text-slate-400 shrink-0" />
          {editing ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                ref={inputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") { setNameInput(clientName); setEditing(false); }
                }}
                disabled={saving}
                className="flex-1 min-w-0 rounded-lg border border-brand-400 bg-slate-800 px-2 py-1 text-xs font-semibold text-white focus:outline-none disabled:opacity-60"
              />
              <button onClick={handleRename} disabled={saving} className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-60">
                <Check className="h-3 w-3" />
              </button>
              <button onClick={() => { setNameInput(clientName); setEditing(false); }} disabled={saving} className="rounded p-1 text-slate-400 hover:bg-slate-700 disabled:opacity-60">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 min-w-0">
              <p className={`text-sm font-semibold truncate max-w-[140px] ${unknown ? "text-amber-300" : "text-white"}`}>
                {clientName}
              </p>
              {unknown && (
                <button
                  onClick={() => setEditing(true)}
                  className="shrink-0 rounded p-1 text-amber-400 hover:bg-amber-500/10"
                  title="Rename client"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
        {!editing && <span className="text-xs text-slate-500 shrink-0">{mappedDocs.length} doc(s)</span>}
      </div>

      {mappedDocs.length === 0 ? (
        <div
          className={`flex flex-col items-center justify-center rounded-xl border border-dashed py-6 text-center transition-colors ${
            isOver ? "border-brand-400/60 bg-brand-500/10" : "border-slate-700"
          }`}
        >
          <FileText className="h-5 w-5 text-slate-600 mb-1" />
          <p className="text-xs text-slate-500">Drop a document here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 rounded-lg border border-slate-800/60 bg-slate-900/60 px-3 py-2"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 truncate">
                  {doc.title || doc.po_number || doc.invoice_number || "Untitled"}
                </p>
                <p className="text-[10px] text-slate-500">{doc.category}</p>
              </div>
              <button
                onClick={() => {
                  setUnlinkingId(doc.id);
                  onUnlink(doc.id).finally(() => setUnlinkingId(null));
                }}
                disabled={unlinkingId === doc.id}
                className="shrink-0 rounded p-1 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-40 transition-colors"
                title="Unlink document"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mt-1 pl-1"
            >
              {expanded
                ? <><ChevronUp className="h-3 w-3" /> Show less</>
                : <><ChevronDown className="h-3 w-3" /> +{mappedDocs.length - 3} more</>}
            </button>
          )}
          {isOver && (
            <div className="rounded-lg border border-dashed border-brand-400/60 bg-brand-500/10 px-3 py-2 text-xs text-brand-300 text-center">
              Drop to assign
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Category filter chips ────────────────────────────────────────────────────

const FILTER_CATEGORIES: DocCategory[] = ["All", ...DOCUMENT_CATEGORIES];

function CategoryFilterChips({
  active,
  onChange,
  counts,
}: {
  active: DocCategory;
  onChange: (c: DocCategory) => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTER_CATEGORIES.map((cat) => {
        const count = cat === "All"
          ? Object.values(counts).reduce((a, b) => a + b, 0)
          : (counts[cat] ?? 0);
        const isActive = active === cat;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              isActive
                ? "border-brand-400 bg-brand-500/20 text-brand-300"
                : "border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            {cat}
            {count > 0 && (
              <span className={`ml-1 ${isActive ? "text-brand-400" : "text-slate-500"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DocumentClientMapper() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading: docsLoading } = useApiDocuments();
  const { data: clientsData, isLoading: clientsLoading } = useClientsOverview();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DocCategory>("All");
  const [activeDoc, setActiveDoc] = useState<ApiDocument | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  // Explicit user actions this session override auto-classification
  const [explicitlyLinkedIds, setExplicitlyLinkedIds] = useState<Set<string>>(new Set());
  const [explicitlyUnlinkedIds, setExplicitlyUnlinkedIds] = useState<Set<string>>(new Set());

  const hasAccess = user.role === "admin" || user.role === "finance";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const clientNames: string[] = useMemo(
    () => (clientsData?.clients ?? []).map((c) => c.client_name),
    [clientsData]
  );

  // Invoice numbers and PO numbers that are recorded in the financial tables
  // under a known client — used as a fallback when doc.client is stale/blank.
  const linkedInvoiceNumbers = useMemo(() => {
    const s = new Set<string>();
    for (const client of clientsData?.clients ?? []) {
      for (const inv of client.client_invoices ?? []) {
        if (inv.invoice_number) s.add(inv.invoice_number.trim().toLowerCase());
      }
    }
    return s;
  }, [clientsData]);

  const linkedPoNumbers = useMemo(() => {
    const s = new Set<string>();
    for (const client of clientsData?.clients ?? []) {
      for (const po of client.client_pos ?? []) {
        if (po.po_number) s.add(po.po_number.trim().toLowerCase());
      }
    }
    return s;
  }, [clientsData]);

  // Vendor PO numbers that are linked to a client (via vendor_pos under each client's vendors)
  const linkedVendorPoNumbers = useMemo(() => {
    const s = new Set<string>();
    for (const client of clientsData?.clients ?? []) {
      for (const vendor of client.vendors ?? []) {
        for (const vpo of vendor.vendor_pos ?? []) {
          if (vpo.vendor_po_number) s.add(vpo.vendor_po_number.trim().toLowerCase());
        }
      }
    }
    return s;
  }, [clientsData]);

  // Vendor invoice numbers that are linked to a client (via invoices under each vendor)
  const linkedVendorInvoiceNumbers = useMemo(() => {
    const s = new Set<string>();
    for (const client of clientsData?.clients ?? []) {
      for (const vendor of client.vendors ?? []) {
        for (const inv of vendor.invoices ?? []) {
          if (inv.invoice_number) s.add(inv.invoice_number.trim().toLowerCase());
        }
      }
    }
    return s;
  }, [clientsData]);

  // ── Filtered + split doc lists ─────────────────────────────────────────────

  const { unlinked, linked, categoryCounts } = useMemo(() => {
    const lower = search.toLowerCase();
    const knownClients = new Set(clientNames.map((n) => n.trim().toLowerCase()));

    const unlinked: ApiDocument[] = [];
    const linked: ApiDocument[] = [];
    const categoryCounts: Record<string, number> = {};

    for (const doc of documents) {
      // Count for filter chips (before search/category filter)
      categoryCounts[doc.category] = (categoryCounts[doc.category] ?? 0) + 1;

      // Search filter
      if (lower) {
        const matchesSearch =
          doc.title?.toLowerCase().includes(lower) ||
          doc.category?.toLowerCase().includes(lower) ||
          doc.po_number?.toLowerCase().includes(lower) ||
          doc.invoice_number?.toLowerCase().includes(lower) ||
          doc.client?.toLowerCase().includes(lower);
        if (!matchesSearch) continue;
      }

      // Category filter
      if (categoryFilter !== "All" && doc.category !== categoryFilter) continue;

      const c = doc.client?.trim() ?? "";

      // Check if this document is registered in the financial tables under a
      // known client — this catches cases where doc.client is stale or blank.
      const invoiceLinked =
        doc.category === "Client Invoice" &&
        !!doc.invoice_number &&
        linkedInvoiceNumbers.has(doc.invoice_number.trim().toLowerCase());
      const poLinked =
        doc.category === "Client PO" &&
        !!doc.po_number &&
        linkedPoNumbers.has(doc.po_number.trim().toLowerCase());
      const vendorPoLinked =
        doc.category === "Vendor PO" &&
        !!doc.po_number &&
        linkedVendorPoNumbers.has(doc.po_number.trim().toLowerCase());
      const vendorInvoiceLinked =
        doc.category === "Vendor Invoice" &&
        !!doc.invoice_number &&
        linkedVendorInvoiceNumbers.has(doc.invoice_number.trim().toLowerCase());

      if (explicitlyLinkedIds.has(doc.id)) {
        linked.push(doc);
      } else if (explicitlyUnlinkedIds.has(doc.id)) {
        unlinked.push(doc);
      } else if (c && knownClients.has(c.toLowerCase())) {
        linked.push(doc);
      } else if (invoiceLinked || poLinked || vendorPoLinked || vendorInvoiceLinked) {
        linked.push(doc);
      } else {
        unlinked.push(doc);
      }
    }

    return { unlinked, linked, categoryCounts };
  }, [documents, search, categoryFilter, clientNames, linkedInvoiceNumbers, linkedPoNumbers, linkedVendorPoNumbers, linkedVendorInvoiceNumbers, explicitlyLinkedIds, explicitlyUnlinkedIds]);

  const mappedByClient = useMemo(() => {
    const map: Record<string, ApiDocument[]> = {};
    for (const name of clientNames) map[name] = [];
    for (const doc of documents) {
      if (explicitlyUnlinkedIds.has(doc.id)) continue;
      const c = doc.client?.trim();
      if (c && clientNames.includes(c)) {
        map[c] = map[c] ?? [];
        map[c].push(doc);
      }
    }
    return map;
  }, [documents, clientNames, explicitlyUnlinkedIds]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function showToast(message: string, error = false) {
    setToast({ message, error });
    setTimeout(() => setToast(null), 3000);
  }

  function markLinked(docId: string) {
    setExplicitlyLinkedIds((prev) => new Set(prev).add(docId));
    setExplicitlyUnlinkedIds((prev) => { const s = new Set(prev); s.delete(docId); return s; });
  }

  function markUnlinked(docId: string) {
    setExplicitlyUnlinkedIds((prev) => new Set(prev).add(docId));
    setExplicitlyLinkedIds((prev) => { const s = new Set(prev); s.delete(docId); return s; });
  }

  async function invalidateAll() {
    await queryClient.invalidateQueries({ queryKey: ["documents"] });
    await queryClient.invalidateQueries({ queryKey: ["clients-overview"] });
    await queryClient.invalidateQueries({ queryKey: ["msa-buckets"] });
  }

  // ── Drag ──────────────────────────────────────────────────────────────────

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDoc(null);
    setOverId(null);

    if (!over) return;

    const docId = String(active.id);
    const clientName = String(over.id);

    if (!clientNames.includes(clientName)) return;

    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    if (doc.client === clientName && !explicitlyUnlinkedIds.has(docId)) return;

    setLinkingId(docId);
    try {
      await linkDocumentToClient(docId, clientName, user.role);
      markLinked(docId);
      await invalidateAll();
      showToast(`Linked to ${clientName}`);
    } catch {
      showToast("Failed to link document. Please try again.", true);
    } finally {
      setLinkingId(null);
    }
  }

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
        Document mapping is available to finance and admin roles only.
      </div>
    );
  }

  const isLoading = docsLoading || clientsLoading;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <p className="text-xs uppercase text-slate-500">Manual mapping</p>
          <h2 className="text-2xl font-semibold text-white">Document → Client</h2>
        </div>
        <p className="text-xs text-slate-500 max-w-sm text-right">
          Drag an unlinked document onto a client to assign it. Use the category badge on each card to reclassify.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-900/60 bg-slate-900/70 p-6 text-sm text-slate-400 animate-pulse">
          Loading documents and clients…
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={(e: DragStartEvent) => {
            const doc = documents.find((d) => d.id === e.active.id);
            setActiveDoc(doc ?? null);
          }}
          onDragOver={(e) => setOverId(e.over ? String(e.over.id) : null)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => { setActiveDoc(null); setOverId(null); }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            {/* ── Left: Document list ── */}
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search documents…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
                />
              </div>

              {/* Category filter chips */}
              <CategoryFilterChips
                active={categoryFilter}
                onChange={setCategoryFilter}
                counts={categoryCounts}
              />

              {/* Unlinked section */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase text-amber-300 mb-2">
                  Unlinked ({unlinked.length})
                </p>
                {unlinked.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    {search || categoryFilter !== "All"
                      ? "No unlinked documents match your filters."
                      : "All documents are linked to a client."}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {unlinked.map((doc) => (
                      <div key={doc.id} className={linkingId === doc.id ? "opacity-50 pointer-events-none" : ""}>
                        <DraggableDocumentCard
                          doc={doc}
                          onCategoryChanged={async () => {
                            await invalidateAll();
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Already linked section */}
              {linked.length > 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
                    Already linked ({linked.length})
                  </p>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {linked.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-start gap-2 rounded-xl border border-slate-800/60 bg-slate-900/50 p-3 opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {doc.title || doc.po_number || doc.invoice_number || "Untitled"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {doc.category} &middot; {doc.client}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Client drop zones ── */}
            <div>
              {clientNames.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 py-16 text-center">
                  <Users className="h-8 w-8 text-slate-600 mb-3" />
                  <p className="text-sm text-slate-400">No clients found.</p>
                  <p className="text-xs text-slate-500 mt-1">Process a Client PO to add clients.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {clientNames.map((name) => (
                    <ClientDropZone
                      key={name}
                      clientName={name}
                      mappedDocs={mappedByClient[name] ?? []}
                      isOver={overId === name}
                      onRenamed={invalidateAll}
                      onUnlink={async (docId) => {
                        await unlinkDocument(docId);
                        markUnlinked(docId);
                        await invalidateAll();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeDoc ? <DragPreviewCard doc={activeDoc} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm shadow-xl transition-all ${
            toast.error
              ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {toast.message}
        </div>
      )}
    </section>
  );
}
