const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface ApiDocument {
  id: string;
  title: string;
  category: string;
  client: string;
  vendor?: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  due_date?: string | null;
  confidence: number;
  linked_to?: string | null;
  pdf_url?: string | null;
  po_number?: string | null;
  invoice_number?: string | null;
  msa_number?: string | null;
}

export interface MsaBucket {
  msa_number: string;
  msa_documents: ApiDocument[];
  po_documents: ApiDocument[];
  invoice_documents: ApiDocument[];
  other_documents: ApiDocument[];
  total_msa_value: number;
  total_po_value: number;
  total_invoice_value: number;
  expires_on?: string | null;
  days_until_expiry?: number | null;
  expiring_soon: boolean;
}

export interface MsaBucketResponse {
  buckets: MsaBucket[];
  unlinked_documents: ApiDocument[];
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // Use Next.js API routes as proxy (they now forward to backend)
  // This allows for better error handling and CORS management
  const url = path.startsWith('/api/') ? path : `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    credentials: "include",
    cache: "no-store" // Always fetch fresh data
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request to ${path} failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchDashboardInsights() {
  return apiFetch<import("@/lib/data/sample-data").DashboardInsights>("/api/dashboard/");
}

export function fetchDocuments() {
  return apiFetch<{ documents: import("@/lib/data/sample-data").DocumentRecord[] }>(
    "/api/documents/"
  );
}

export function fetchDocumentById(id: string) {
  return apiFetch<{
    document: import("@/lib/data/sample-data").DocumentRecord;
    relatedExceptions: import("@/lib/data/sample-data").ExceptionRecord[];
    relatedAlerts: import("@/lib/data/sample-data").AlertRecord[];
  }>(`/api/documents/${id}`);
}

export function fetchExceptions() {
  return apiFetch<{ exceptions: import("@/lib/data/sample-data").ExceptionRecord[] }>(
    "/api/exceptions/"
  );
}

export function fetchAlerts() {
  return apiFetch<{ alerts: import("@/lib/data/sample-data").AlertRecord[] }>("/api/alerts/");
}

export function fetchMsaBuckets() {
  return apiFetch<MsaBucketResponse>("/api/documents/msa-buckets");
}

const UNKNOWN_CLIENT_NAMES = new Set([
  "unknown",
  "unknown client",
  "unknown vendor",
  "n/a",
  "",
]);

export function isUnknownClient(name: string) {
  return UNKNOWN_CLIENT_NAMES.has(name.trim().toLowerCase());
}

export async function renameClient(oldName: string, newName: string) {
  const res = await fetch(
    `/api/financial/clients/${encodeURIComponent(oldName)}/rename`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_name: newName }),
    }
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || "Failed to rename client");
  }
  return res.json() as Promise<{ updated: number; old_name: string; new_name: string }>;
}

/** Manually assign a document to a client (records in audit log + cascades). */
export function linkDocumentToClient(
  documentId: string,
  clientName: string,
  linkedBy?: string
) {
  return apiFetch<ApiDocument>(`/api/documents/${documentId}/link`, {
    method: "POST",
    body: JSON.stringify({ client_name: clientName, linked_by: linkedBy ?? null }),
  });
}

/** Remove the client assignment for a document (records unlink in audit log). */
export function unlinkDocument(documentId: string) {
  return apiFetch<ApiDocument>(`/api/documents/${documentId}/link`, {
    method: "DELETE",
  });
}

/** Update only the category of a document. */
export function updateDocumentCategory(documentId: string, category: string) {
  return apiFetch<ApiDocument>(`/api/documents/${documentId}/category`, {
    method: "PATCH",
    body: JSON.stringify({ category }),
  });
}

export interface DocumentLinkRecord {
  id: string;
  document_id: string;
  client_name: string;
  linked_at: string;
  unlinked_at: string | null;
  is_active: boolean;
  linked_by: string | null;
}

/** Fetch full link/unlink audit history for a document. */
export function fetchLinkHistory(documentId: string) {
  return apiFetch<DocumentLinkRecord[]>(`/api/documents/${documentId}/link-history`);
}

export interface DocumentFieldsUpdate {
  title?: string;
  client?: string;
  vendor?: string;
  amount?: number;
  currency?: string;
  po_number?: string;
  invoice_number?: string;
  msa_number?: string;
  due_date?: string | null;
  status?: string;
}

/** Correct extracted fields post-processing. Cascades to the financial record
 *  (ClientPO / VendorPO / ClientInvoice / VendorInvoice) and re-runs relink. */
export function updateDocumentFields(documentId: string, fields: DocumentFieldsUpdate) {
  return apiFetch<ApiDocument>(`/api/documents/${documentId}/fields`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

/** Returns a sorted list of all known client names (from ClientPO + active links). */
export function fetchClientNames(): Promise<string[]> {
  return apiFetch<string[]>("/api/financial/clients");
}

export function sendChatMessage(
  message: string,
  context?: Array<{ role: "user" | "assistant"; content: string }>
) {
  return apiFetch<{ reply: string }>("/api/chat/", {
    method: "POST",
    body: JSON.stringify({ message, context })
  });
}
