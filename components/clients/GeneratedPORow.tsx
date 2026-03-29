"use client";
import { FileText, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeleteVendorPO } from "@/hooks/useVendorPO";
import { getVendorPOPdfUrl } from "@/lib/vendorPoApi";
import type { GeneratedVendorPO } from "@/lib/types/vendorPo";

const STATUS_STYLES: Record<string, string> = {
  DRAFT:    "bg-slate-700/50 text-slate-300 border-slate-600",
  SENT:     "bg-blue-500/20 text-blue-200 border-blue-500/30",
  APPROVED: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
  CLOSED:   "bg-slate-700/30 text-slate-500 border-slate-700",
};

export function GeneratedPORow({
  po,
  clientName,
}: {
  po: GeneratedVendorPO;
  clientName: string;
}) {
  const { mutate: deletePO, isPending } = useDeleteVendorPO(clientName);

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg
      bg-slate-800/60 hover:bg-slate-800 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <FileText size={15} className="text-slate-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{po.po_number}</p>
          <p className="text-xs text-slate-400 truncate">{po.vendor_name}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-medium text-white">
          ${po.total_amount.toLocaleString("en", { minimumFractionDigits: 2 })}
        </span>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full font-medium border",
          STATUS_STYLES[po.status] ?? STATUS_STYLES.DRAFT
        )}>
          {po.status}
        </span>
        <a
          href={getVendorPOPdfUrl(po.id)}
          target="_blank"
          rel="noreferrer"
          className="text-slate-500 hover:text-blue-400 transition-colors opacity-0
            group-hover:opacity-100"
          title="Download PDF"
        >
          <Download size={15} />
        </a>
        <button
          onClick={() => deletePO(po.id)}
          disabled={isPending}
          className="text-slate-500 hover:text-red-400 transition-colors opacity-0
            group-hover:opacity-100 disabled:opacity-30"
          title="Delete PO"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
