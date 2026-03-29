import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createVendorPO,
  deleteVendorPO,
  fetchClientVendorPOs,
} from "@/lib/vendorPoApi";
import type { CreateVendorPOPayload } from "@/lib/types/vendorPo";

export function useClientVendorPOs(clientName: string) {
  return useQuery({
    queryKey: ["vendor-pos", clientName],
    queryFn: () => fetchClientVendorPOs(clientName),
    enabled: !!clientName,
  });
}

export function useCreateVendorPO(clientName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVendorPOPayload) => createVendorPO(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-pos", clientName] });
    },
  });
}

export function useDeleteVendorPO(clientName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (poId: string) => deleteVendorPO(poId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-pos", clientName] });
    },
  });
}
