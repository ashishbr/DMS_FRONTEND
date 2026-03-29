import type { CreateVendorPOPayload, GeneratedVendorPO } from "@/lib/types/vendorPo";

export async function fetchClientVendorPOs(clientName: string): Promise<GeneratedVendorPO[]> {
  const res = await fetch(
    `/api/vendor-po?client_name=${encodeURIComponent(clientName)}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error("Failed to fetch vendor POs");
  return res.json();
}

export async function createVendorPO(payload: CreateVendorPOPayload): Promise<GeneratedVendorPO> {
  // Strip empty strings and undefined so Pydantic sees null, not ""
  const clean = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== "" && v !== undefined)
  );

  const res = await fetch("/api/vendor-po/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(clean),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? "Failed to create vendor PO");
  }
  return res.json();
}

export async function deleteVendorPO(poId: string): Promise<void> {
  const res = await fetch(`/api/vendor-po/${poId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete vendor PO");
}

export function getVendorPOPdfUrl(poId: string): string {
  return `/api/vendor-po/${poId}/pdf`;
}
