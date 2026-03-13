"use client";

import { Building2 } from "lucide-react";
import { useClientsOverview } from "@/lib/queries";
import { useAuth } from "@/lib/auth/use-auth";
import { ClientCard } from "./client-card";

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-xl bg-slate-800"
        />
      ))}
    </div>
  );
}

export function ClientsOverview() {
  const { data, isLoading, isError, error } = useClientsOverview();
  const { user } = useAuth();

  const hasAccess = user.role === "admin" || user.role === "finance";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-white">Clients</h1>
        {data && (
          <p className="text-sm text-slate-400">
            {data.total_clients} client{data.total_clients !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Access gate */}
      {!hasAccess && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          The Clients view is available to finance and admin roles. You are currently logged in as{" "}
          <span className="font-semibold">{user.role}</span>.
        </div>
      )}

      {hasAccess && (
        <>
          {isLoading && <LoadingSkeleton />}

          {isError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
              Unable to load clients overview.{" "}
              {error instanceof Error ? error.message : "Please check your backend connection."}
            </div>
          )}

          {!isLoading && !isError && data && data.clients.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 py-16 text-center">
              <Building2 className="mb-4 h-10 w-10 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">No clients yet.</p>
              <p className="mt-1 text-xs text-slate-500">
                Process a Client PO document to get started.
              </p>
            </div>
          )}

          {!isLoading && !isError && data && data.clients.length > 0 && (
            <div className="space-y-3">
              {data.clients.map((client) => (
                <ClientCard key={client.client_name} client={client} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
