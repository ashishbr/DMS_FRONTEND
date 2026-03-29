import { useQuery } from "@tanstack/react-query";
import {
  fetchAlerts,
  fetchDashboardInsights,
  fetchDocumentById,
  fetchDocuments,
  fetchExceptions,
  fetchMsaBuckets
} from "@/lib/api";
import type { ClientsOverviewResponse } from "@/lib/types/financial";

export function useDashboardQuery() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardInsights,
    staleTime: 1000 * 10, // 10 seconds - consider data stale quickly
    refetchInterval: 1000 * 30, // Auto-refresh every 30 seconds for real-time updates
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnMount: true // Always refetch on mount
  });
}

export function useDocumentsQuery() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { documents } = await fetchDocuments();
      return documents;
    },
    staleTime: 1000 * 60
  });
}

export function useDocumentQuery(id: string) {
  return useQuery({
    queryKey: ["documents", id],
    queryFn: () => fetchDocumentById(id),
    enabled: Boolean(id)
  });
}

export function useExceptionsQuery() {
  return useQuery({
    queryKey: ["exceptions"],
    queryFn: async () => {
      const { exceptions } = await fetchExceptions();
      return exceptions;
    },
    staleTime: 1000 * 30
  });
}

export function useAlertsQuery() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { alerts } = await fetchAlerts();
      return alerts;
    },
    staleTime: 1000 * 10, // 10 seconds - refresh more frequently for real-time alerts
    refetchInterval: 1000 * 30 // Auto-refresh every 30 seconds
  });
}

export function useMsaBucketsQuery() {
  return useQuery({
    queryKey: ["msa-buckets"],
    queryFn: fetchMsaBuckets,
    staleTime: 1000 * 60
  });
}

export function useClientsOverview() {
  return useQuery<ClientsOverviewResponse>({
    queryKey: ["clients-overview"],
    queryFn: async () => {
      const r = await fetch("/api/financial/clients-overview");
      if (!r.ok) throw new Error(`Backend API returned ${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
