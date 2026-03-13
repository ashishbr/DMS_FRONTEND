"use client";

import { useState, useEffect } from "react";
import { FileText, Calendar, User, Building, Mail, Phone, MapPin, Trash2 } from "lucide-react";

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
    summary: string;
    key_terms: string[];
    contact_info: {
      emails?: string[];
      phones?: string[];
      addresses?: string[];
    };
  };
  full_text: string;
  processing_time: string;
}

export function ProcessedDocumentsViewer() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<ProcessedDocument | null>(null);

  const sanitizeTitle = (value?: string) => value?.replace('--- Page 1 ---', '').trim();
  const getDisplayTitle = (doc: ProcessedDocument) => {
    return (
      doc.extracted_data.client?.trim() ||
      doc.extracted_data.po_number?.trim() ||
      doc.extracted_data.invoice_number?.trim() ||
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
      
      // Deduplicate documents by document_id, title+amount, or title+client+amount
      const seen = new Set<string>();
      const deduplicated = allDocuments.filter((doc: ProcessedDocument) => {
        // Create unique key for deduplication
        const key1 = doc.document_id;
        const key2 = `${getDisplayTitle(doc)}_${doc.extracted_data.amount}_${doc.extracted_data.client}`;
        
        if (seen.has(key1) || seen.has(key2)) {
          return false; // Skip duplicate
        }
        
        seen.add(key1);
        seen.add(key2);
        return true;
      });
      
      setDocuments(deduplicated);
    } catch (error) {
      console.error("Error fetching processed documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (documentId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent opening the modal
    
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete from database first (using document_id from the processed document)
      const dbDeleteResponse = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      });

      // Also delete the processed JSON file
      const jsonDeleteResponse = await fetch(`/api/processed-documents/${documentId}`, {
        method: 'DELETE'
      });

      if (dbDeleteResponse.ok || jsonDeleteResponse.ok) {
        // Remove the document from the local state
        setDocuments(documents.filter(doc => doc.document_id !== documentId));
        // Close modal if the deleted document was selected
        if (selectedDocument?.document_id === documentId) {
          setSelectedDocument(null);
        }
        
        // Refresh the dashboard to update graphs
        // Invalidate all queries to force refresh
        if (typeof window !== 'undefined') {
          // Use a small delay to ensure deletion is complete
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
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
            onClick={() => setSelectedDocument(doc)}
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
              {/* Show due_date if it exists, otherwise show regular date */}
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
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Document Details</h3>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
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
                  {selectedDocument.extracted_data.due_date && (
                    <div>
                      <label className="text-sm text-slate-400">Due Date</label>
                      <p className="text-amber-300">{selectedDocument.extracted_data.due_date}</p>
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                {selectedDocument.extracted_data.contact_info && (
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
                <div>
                  <h4 className="text-lg font-medium text-white mb-3">Full Text Content</h4>
                  <div className="bg-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-slate-300 whitespace-pre-wrap">
                      {selectedDocument.full_text}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
