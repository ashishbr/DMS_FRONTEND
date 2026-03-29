"use client";
import { useState } from "react";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useClientVendorPOs } from "@/hooks/useVendorPO";
import { VendorPOGeneratorModal } from "./VendorPOGeneratorModal";
import { GeneratedPORow } from "./GeneratedPORow";

export function ClientGeneratedPOs({ clientName }: { clientName: string }) {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { data: pos = [], isLoading } = useClientVendorPOs(clientName);

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3
          bg-slate-800/60 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown size={15} className="text-slate-400" />
          ) : (
            <ChevronRight size={15} className="text-slate-400" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Generated Vendor POs
          </span>
          {pos.length > 0 && (
            <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30
              px-1.5 py-0.5 rounded-full font-medium">
              {pos.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setModalOpen(true);
          }}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300
            bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-lg transition-colors"
        >
          <Plus size={13} /> Generate PO
        </button>
      </button>

      {open && (
        <div className="p-3 space-y-1.5 bg-slate-900/50">
          {isLoading && (
            <p className="text-xs text-slate-500 text-center py-3">Loading…</p>
          )}
          {!isLoading && pos.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">
              No generated POs yet.{" "}
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="text-blue-400 hover:underline"
              >
                Create one
              </button>
            </p>
          )}
          {pos.map((po) => (
            <GeneratedPORow key={po.id} po={po} clientName={clientName} />
          ))}
        </div>
      )}

      <VendorPOGeneratorModal
        clientName={clientName}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
