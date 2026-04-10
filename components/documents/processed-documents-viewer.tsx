"use client";

import { useState, useEffect } from "react";
import { FileText, Calendar, User, Building, Mail, Phone, MapPin, Trash2, Pencil, X, Check, Loader2 } from "lucide-react";
import { updateDocumentFields, type DocumentFieldsUpdate } from "@/lib/api";

interface ProcessedDocument {
  document_id: string;
  document_type: string;
  confidence: number;
  extracted_data: {
    title: string;
    client: string;
    vendor?: string;
    amount: number;
    currency: string;
    date: string;
    due_date?: string;
    po_number?: string;
    invoice_number?: string;
    msa_number?: string;
    summary: string;
    key_terms: string[];
    contact_info: {
      emails?: string[];
      phones?: string[];
      addresses?: string[];
    };
  };
  full_text?: string;
  processing_time: string;
}

// Fields the user can correct — mirrors the DB Document model
interface EditForm {
  title: string;
  client: string;
  vendor: string;
  amount: string;          // string for controlled input
  currency: string;
  po_number: string;
  invoice_number: string;
  msa_number: string;
  due_date: string;        // YYYY-MM-DD
}

function initEditForm(doc: ProcessedDocument): EditForm {
  return {
    title: doc.extracted_data.title ?? "",
    client: doc.extracted_data.client ?? "",
    vendor: doc.extracted_data.vendor ?? "",
    amount: String(doc.extracted_data.amount ?? ""),
    currency: doc.extracted_data.currency ?? "USD",
    po_number: doc.extracted_data.po_number ?? "",
    invoice_number: doc.extracted_data.invoice_number ?? "",
    msa_number: doc.extracted_data.msa_number ?? "",
    due_date: doc.extracted_data.due_date
      ? doc.extracted_data.due_date.slice(0, 10)
      : "",
  };
}

const FIELD_LABEL: Record<keyof EditForm, string> = {
  title: "Title",
  client: "Client",
  vendor: "Vendor",
  amount: "Amount",
  currency: "Currency",
  po_number: "PO Number",
  invoice_number: "Invoice Number",
  msa_number: "MSA Number",
  due_date: "Due Date",
};

export function ProcessedDocumentsViewer() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<ProcessedDocument | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fullText, setFullText] = useState<string | null>(null);
  const [fullTextLoading, setFullTextLoading] = useState(false);

  const sanitizeTitle = (value?: string) => value?.replace('--- Page 1 ---', '').trim();
  const getDisplayTitle = (doc: ProcessedDocument) => {
    return (
      doc.extracted_data.po_number?.trim() ||
      doc.extracted_data.invoice_number?.trim() ||
      doc.extracted_data.client?.trim() ||
      sanitizeTitle(doc.extracted_data.title) ||
      "Document"
    );
  };

  useEffect(() => {
    fetchProcessedDocuments();
  }, []);

  const fetchProcessedDocuments = async () => {
    try {
      const response = await fetch(`/api/processed-documents/`);
      const data = await response.json();
      const allDocuments = data.documents || [];

      const seen = new Set<string>();
      const deduplicated = allDocuments.filter((doc: ProcessedDocument) => {
        if (seen.has(doc.document_id)) return false;
        seen.add(doc.document_id);
        return true;
      });

      setDocuments(deduplicated);
    } catch (error) {
      console.error("Error fetching processed documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (doc: ProcessedDocument) => {
    setSelectedDocument(doc);
    setIsEditing(false);
    setEditForm(null);
    setSaveError(null);
    setFullText(null);
    // Fetch full_text lazily — the list response strips it for performance
    setFullTextLoading(true);
    fetch(`/api/processed-documents/${doc.document_id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setFullText(data.full_text ?? ""))
      .catch(() => setFullText(""))
      .finally(() => setFullTextLoading(false));
  };

  const closeModal = () => {
    setSelectedDocument(null);
    setIsEditing(false);
    setEditForm(null);
    setSaveError(null);
    setFullText(null);
  };

  const startEditing = () => {
    if (!selectedDocument) return;
    setEditForm(initEditForm(selectedDocument));
    setIsEditing(true);
    setSaveError(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm(null);
    setSaveError(null);
  };

  const handleFieldChange = (field: keyof EditForm, value: string) => {
    setEditForm(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const saveEdits = async () => {
    if (!selectedDocument || !editForm) return;
    setSaving(true);
    setSaveError(null);

    try {
      // Build the payload from changed fields only
      const orig = selectedDocument.extracted_data;
      const payload: DocumentFieldsUpdate = {};

      const titleVal = editForm.title.trim();
      if (titleVal !== (orig.title ?? "").trim()) payload.title = titleVal;

      const clientVal = editForm.client.trim();
      if (clientVal !== (orig.client ?? "").trim()) payload.client = clientVal;

      const vendorVal = editForm.vendor.trim();
      if (vendorVal !== (orig.vendor ?? "").trim()) payload.vendor = vendorVal;

      const parsedAmount = parseFloat(editForm.amount);
      if (!isNaN(parsedAmount) && parsedAmount !== orig.amount) payload.amount = parsedAmount;

      const currencyVal = editForm.currency.trim().toUpperCase();
      if (currencyVal && currencyVal !== (orig.currency ?? "").toUpperCase()) payload.currency = currencyVal;

      const poVal = editForm.po_number.trim();
      if (poVal !== (orig.po_number ?? "").trim()) payload.po_number = poVal || undefined;

      const invVal = editForm.invoice_number.trim();
      if (invVal !== (orig.invoice_number ?? "").trim()) payload.invoice_number = invVal || undefined;

      const msaVal = editForm.msa_number.trim();
      if (msaVal !== (orig.msa_number ?? "").trim()) payload.msa_number = msaVal || undefined;

      const origDueDate = orig.due_date ? orig.due_date.slice(0, 10) : "";
      if (editForm.due_date !== origDueDate) {
        payload.due_date = editForm.due_date || null;
      }

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        setEditForm(null);
        return;
      }

      await updateDocumentFields(selectedDocument.document_id, payload);

      // Optimistically update local state so the card reflects changes immediately
      const updatedDoc: ProcessedDocument = {
        ...selectedDocument,
        extracted_data: {
          ...selectedDocument.extracted_data,
          ...(payload.title !== undefined && { title: payload.title }),
          ...(payload.client !== undefined && { client: payload.client }),
          ...(payload.vendor !== undefined && { vendor: payload.vendor }),
          ...(payload.amount !== undefined && { amount: payload.amount }),
          ...(payload.currency !== undefined && { currency: payload.currency }),
          ...(payload.po_number !== undefined && { po_number: payload.po_number }),
          ...(payload.invoice_number !== undefined && { invoice_number: payload.invoice_number }),
          ...(payload.msa_number !== undefined && { msa_number: payload.msa_number }),
          ...(payload.due_date !== undefined && { due_date: payload.due_date ?? undefined }),
        },
      };

      setDocuments(prev =>
        prev.map(d => d.document_id === updatedDoc.document_id ? updatedDoc : d)
      );
      setSelectedDocument(updatedDoc);
      setIsEditing(false);
      setEditForm(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteDocument = async (documentId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      const dbDeleteResponse = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
      const jsonDeleteResponse = await fetch(`/api/processed-documents/${documentId}`, { method: 'DELETE' });

      if (dbDeleteResponse.ok || jsonDeleteResponse.ok) {
        setDocuments(documents.filter(doc => doc.document_id !== documentId));
        if (selectedDocument?.document_id === documentId) closeModal();
        setTimeout(() => { window.location.reload(); }, 500);
      } else {
        const errorData = await dbDeleteResponse.json().catch(() => ({ detail: 'Unknown error' }));
        alert(`Failed to delete document: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert('Failed to delete document. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-900/60 bg-slate-900/70 p-6">
        <div className="text-center text-slate-300">Loading processed documents...</div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Document Inventory</h1>
            <p className="text-sm text-slate-400 mt-1">Central repository of processed documents with OCR content</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-900/60 bg-slate-900/70 p-12">
          <div className="text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 mx-auto mb-6">
              <FileText className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No processed documents yet</h3>
            <p className="text-slate-400 mb-6">Upload PDF documents to see their processed content here.</p>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                OCR Processing
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                Data Extraction
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                Content Analysis
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Document Inventory</h1>
          <p className="text-sm text-slate-400 mt-1">Central repository of processed documents with OCR content</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{documents.length} documents</span>
          <button
            onClick={fetchProcessedDocuments}
            className="px-3 py-1.5 bg-slate-800 text-slate-300 text-sm rounded-lg hover:bg-slate-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {documents.map((doc) => (
          <div
            key={doc.document_id}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 hover:border-slate-700 transition-colors cursor-pointer"
            onClick={() => openModal(doc)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-white text-lg">{getDisplayTitle(doc)}</h3>
                  <p className="text-sm text-slate-400">{doc.document_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-slate-400">Confidence:</div>
                    <div className="text-sm font-medium text-white">
                      {(doc.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(doc.processing_time).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => deleteDocument(doc.document_id, e)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  title="Delete document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {doc.extracted_data.client && doc.extracted_data.client !== 'Unknown Client' && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-300">{doc.extracted_data.client}</span>
                </div>
              )}
              {doc.extracted_data.amount > 0 && (
                <div className="text-sm text-slate-300">
                  {doc.extracted_data.currency} {doc.extracted_data.amount.toLocaleString()}
                </div>
              )}
              {doc.extracted_data.due_date ? (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-300" title="Due Date">Due: {doc.extracted_data.due_date}</span>
                </div>
              ) : doc.extracted_data.date ? (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-300" title="Document Date">{doc.extracted_data.date}</span>
                </div>
              ) : null}
              {doc.extracted_data.vendor && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-300">{doc.extracted_data.vendor}</span>
                </div>
              )}
            </div>

            {doc.extracted_data.summary && (
              <div className="mb-4">
                <p className="text-sm text-slate-300 line-clamp-3">
                  {doc.extracted_data.summary.replace('--- Page 1 ---', '').trim()}
                </p>
              </div>
            )}

            {doc.extracted_data.key_terms && doc.extracted_data.key_terms.length > 0 && (() => {
              const terms = Array.isArray(doc.extracted_data.key_terms)
                ? doc.extracted_data.key_terms
                : String(doc.extracted_data.key_terms).split(',').map((t: string) => t.trim()).filter(Boolean);
              return terms.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {terms.slice(0, 6).map((term: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-full hover:bg-slate-700 transition-colors"
                    >
                      {term}
                    </span>
                  ))}
                  {terms.length > 6 && (
                    <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-full">
                      +{terms.length - 6} more
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        ))}
      </div>

      {/* Document Detail Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-xl border border-slate-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Document Details</h3>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <button
                      onClick={startEditing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/20 text-brand-400 text-sm rounded-lg hover:bg-brand-500/30 transition-colors"
                      title="Edit extracted fields"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={saveEdits}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 text-sm rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                      >
                        {saving
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Check className="h-3.5 w-3.5" />}
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-300 text-sm rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </div>
                  )}
                  <button onClick={closeModal} className="text-slate-400 hover:text-white ml-2">
                    ✕
                  </button>
                </div>
              </div>

              {saveError && (
                <div className="mb-4 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  {saveError}
                </div>
              )}

              <div className="space-y-6">
                {/* Basic Info — read or edit */}
                {isEditing && editForm ? (
                  <div>
                    <p className="text-xs text-slate-500 mb-3">
                      Corrections are saved to the database and cascade to the matching financial record. Re-linking runs automatically.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(Object.keys(FIELD_LABEL) as Array<keyof EditForm>).map((field) => (
                        <div key={field}>
                          <label className="block text-xs text-slate-400 mb-1">{FIELD_LABEL[field]}</label>
                          <input
                            type={field === "due_date" ? "date" : field === "amount" ? "number" : "text"}
                            value={editForm[field]}
                            onChange={e => handleFieldChange(field, e.target.value)}
                            placeholder={
                              field === "po_number" ? "e.g. PO-2024-001"
                              : field === "invoice_number" ? "e.g. INV-0042"
                              : field === "msa_number" ? "e.g. MSA-2024-001"
                              : field === "currency" ? "USD"
                              : ""
                            }
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-400">Title</label>
                      <p className="text-white">{getDisplayTitle(selectedDocument)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Type</label>
                      <p className="text-white">{selectedDocument.document_type}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Client</label>
                      <p className="text-white">{selectedDocument.extracted_data.client}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Amount</label>
                      <p className="text-white">
                        {selectedDocument.extracted_data.currency} {selectedDocument.extracted_data.amount.toLocaleString()}
                      </p>
                    </div>
                    {selectedDocument.extracted_data.po_number && (
                      <div>
                        <label className="text-sm text-slate-400">PO Number</label>
                        <p className="text-white font-mono">{selectedDocument.extracted_data.po_number}</p>
                      </div>
                    )}
                    {selectedDocument.extracted_data.invoice_number && (
                      <div>
                        <label className="text-sm text-slate-400">Invoice Number</label>
                        <p className="text-white font-mono">{selectedDocument.extracted_data.invoice_number}</p>
                      </div>
                    )}
                    {selectedDocument.extracted_data.due_date && (
                      <div>
                        <label className="text-sm text-slate-400">Due Date</label>
                        <p className="text-amber-300">{selectedDocument.extracted_data.due_date}</p>
                      </div>
                    )}
                    {selectedDocument.extracted_data.vendor && (
                      <div>
                        <label className="text-sm text-slate-400">Vendor</label>
                        <p className="text-white">{selectedDocument.extracted_data.vendor}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Info */}
                {!isEditing && selectedDocument.extracted_data.contact_info && (
                  <div>
                    <h4 className="text-lg font-medium text-white mb-3">Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedDocument.extracted_data.contact_info.emails && (
                        <div>
                          <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Emails
                          </label>
                          <div className="text-white">
                            {selectedDocument.extracted_data.contact_info.emails.map((email, index) => (
                              <p key={index} className="text-sm">{email}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedDocument.extracted_data.contact_info.phones && (
                        <div>
                          <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Phones
                          </label>
                          <div className="text-white">
                            {selectedDocument.extracted_data.contact_info.phones.map((phone, index) => (
                              <p key={index} className="text-sm">{phone}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedDocument.extracted_data.contact_info.addresses && (
                        <div>
                          <label className="text-sm text-slate-400 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Addresses
                          </label>
                          <div className="text-white">
                            {selectedDocument.extracted_data.contact_info.addresses.map((address, index) => (
                              <p key={index} className="text-sm">{address}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Full Text */}
                {!isEditing && (
                  <div>
                    <h4 className="text-lg font-medium text-white mb-3">Full Text Content</h4>
                    <div className="bg-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                      {fullTextLoading ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading…
                        </div>
                      ) : (
                        <pre className="text-sm text-slate-300 whitespace-pre-wrap">
                          {fullText || "(no text content)"}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
