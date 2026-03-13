export interface VendorPORecord {
  id: string;
  document_id: string;
  vendor_po_number: string;
  vendor_name: string;
  client_po_id: string | null;
  allocated_value: number;
  currency: string;
  service_description: string | null;
  issue_date: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string; // DRAFT | APPROVED | ACTIVE | CLOSED
  created_at: string;
}

export interface VendorInvoiceRecord {
  id: string;
  document_id: string;
  vendor_po_id: string | null;
  invoice_number: string;
  vendor_name: string;
  invoice_amount: number;
  currency: string;
  invoice_date: string | null;
  due_date: string | null;
  unit_rate: number | null;
  quantity: number | null;
  status: string; // PENDING | APPROVED | PAID | FLAGGED | OVERBILLING_DETECTED
  matching_status: string | null; // TWO_WAY_MATCHED | THREE_WAY_MATCHED | UNMATCHED | DUPLICATE
  overbilling_flag: boolean;
  overbilling_amount: number | null;
  is_duplicate: boolean;
  created_at: string;
}

export interface ClientPORecord {
  id: string;
  document_id: string;
  po_number: string;
  client_name: string;
  total_value: number;
  currency: string;
  service_scope: string | null;
  issue_date: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string; // DRAFT | APPROVED | ACTIVE | CLOSED
  msa_number: string | null;
  created_at: string;
}

export interface ClientInvoiceRecord {
  id: string;
  document_id: string;
  client_po_id: string | null;
  invoice_number: string;
  client_name: string;
  invoice_amount: number;
  currency: string;
  invoice_date: string | null;
  due_date: string | null;
  status: string; // PENDING | APPROVED | PAID
  created_at: string;
}

export interface VendorWithInvoices {
  vendor_name: string;
  vendor_pos: VendorPORecord[];
  total_allocated: number;
  total_invoiced: number;
  invoices: VendorInvoiceRecord[];
}

export interface ClientWithVendors {
  client_name: string;
  total_po_value: number;
  total_client_invoiced: number;
  client_pos: ClientPORecord[];
  client_invoices: ClientInvoiceRecord[];
  vendors: VendorWithInvoices[];
}

export interface ClientsOverviewResponse {
  clients: ClientWithVendors[];
  total_clients: number;
}
