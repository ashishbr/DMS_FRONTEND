"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Calendar, DollarSign, User, Building, Eye, Trash2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

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

export function RecentDocuments() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const fetchRecentDocuments = useCallback(async () => {
    try {
      const response = await fetch(`/api/processed-documents/`);
      const data = await response.json();
      const allDocuments = data.documents || [];
      
      // Deduplicate documents by document_id, title+amount, or title+client+amount
      const seen = new Set<string>();
      const deduplicated = allDocuments.filter((doc: ProcessedDocument) => {
        // Create unique key for deduplication
        const key1 = doc.document_id;
        const key2 = `${doc.extracted_data.title}_${doc.extracted_data.amount}_${doc.extracted_data.client}`;
        
        if (seen.has(key1) || seen.has(key2)) {
          return false; // Skip duplicate
        }
        
        seen.add(key1);
        seen.add(key2);
        return true;
      });
      
      // Get only the 3 most recent documents
      setDocuments(deduplicated.slice(0, 3));
    } catch (error) {
      console.error("Error fetching recent documents:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentDocuments();
    
    // Auto-refresh every 15 seconds
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchRecentDocuments();
    }, 15000);
    
    return () => clearInterval(interval);
  }, [fetchRecentDocuments]);

  // Also refresh when dashboard query is invalidated
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] === "dashboard" && event.type === "updated") {
        setRefreshing(true);
        fetchRecentDocuments();
      }
    });
    
    return () => unsubscribe();
  }, [queryClient, fetchRecentDocuments]);

  const deleteDocument = async (documentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      // Delete from database first
      const dbDeleteResponse = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      });

      // Also delete the processed JSON file
      const jsonDeleteResponse = await fetch(`/api/processed-documents/${documentId}`, {
        method: 'DELETE'
      });

      if (dbDeleteResponse.ok || jsonDeleteResponse.ok) {
        setDocuments(documents.filter(doc => doc.document_id !== documentId));
        
        // Invalidate queries to refresh dashboard
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["documents"] });
        queryClient.invalidateQueries({ queryKey: ["alerts"] });
        
        // Refresh the list
        fetchRecentDocuments();
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
        <div className="text-center text-slate-300">Loading recent documents...</div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-900/60 bg-slate-900/70 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Recent Documents</h3>
          <Link 
            href="/documents"
            className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            View all
          </Link>
        </div>
        <div className="text-center py-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 mx-auto mb-4">
            <FileText className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-slate-400">No processed documents yet</p>
          <p className="text-sm text-slate-500 mt-1">Upload PDFs to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-900/60 bg-slate-900/70 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">Recent Documents</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchRecentDocuments();
            }}
            disabled={refreshing}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link 
            href="/documents"
            className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            View all
          </Link>
        </div>
      </div>
      
      <div className="space-y-4">
        {documents.map((doc) => (
          <div
            key={doc.document_id}
            className="rounded-lg border border-slate-800 bg-slate-800/40 p-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium text-white text-sm">
                    {(doc.extracted_data.title ?? '').replace('--- Page 1 ---', '').trim() || 'Document'}
                  </h4>
                  <p className="text-xs text-slate-400">{doc.document_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-400">
                  {(doc.confidence * 100).toFixed(0)}%
                </div>
                <button
                  onClick={(e) => deleteDocument(doc.document_id, e)}
                  className="flex h-6 w-6 items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  title="Delete document"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              {doc.extracted_data.client && doc.extracted_data.client !== 'Unknown Client' && (
                <div className="flex items-center gap-2 text-xs">
                  <User className="h-3 w-3 text-slate-400" />
                  <span className="text-slate-300 truncate">{doc.extracted_data.client}</span>
                </div>
              )}
              {doc.extracted_data.amount > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <DollarSign className="h-3 w-3 text-slate-400" />
                  <span className="text-slate-300">
                    {doc.extracted_data.currency} {doc.extracted_data.amount.toLocaleString()}
                  </span>
                </div>
              )}
              {doc.extracted_data.date && (
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <span className="text-slate-300" title="Document Date">{doc.extracted_data.date}</span>
                </div>
              )}
              {doc.extracted_data.due_date && (
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3 text-amber-400" />
                  <span className="text-amber-300 truncate" title="Due Date">Due: {doc.extracted_data.due_date}</span>
                </div>
              )}
              {doc.extracted_data.vendor && (
                <div className="flex items-center gap-2 text-xs">
                  <Building className="h-3 w-3 text-slate-400" />
                  <span className="text-slate-300 truncate">{doc.extracted_data.vendor}</span>
                </div>
              )}
            </div>

            {doc.extracted_data.summary && (
              <div className="mb-3">
                <p className="text-xs text-slate-300 line-clamp-2">
                  {doc.extracted_data.summary.replace('--- Page 1 ---', '').trim().substring(0, 100)}...
                </p>
              </div>
            )}

            {doc.extracted_data.key_terms && doc.extracted_data.key_terms.length > 0 && (() => {
              const terms = Array.isArray(doc.extracted_data.key_terms)
                ? doc.extracted_data.key_terms
                : String(doc.extracted_data.key_terms).split(',').map((t: string) => t.trim()).filter(Boolean);
              return terms.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {terms.slice(0, 3).map((term: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full"
                    >
                      {term}
                    </span>
                  ))}
                  {terms.length > 3 && (
                    <span className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded-full">
                      +{terms.length - 3}
                    </span>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {new Date(doc.processing_time).toLocaleDateString()}
              </div>
              <Link
                href={`/documents`}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                <Eye className="h-3 w-3" />
                View details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
