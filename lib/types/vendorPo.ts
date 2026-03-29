export interface VendorPOItem {
  id: string;
  vendor_po_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface GeneratedVendorPO {
  id: string;
  po_number: string;
  vendor_name: string;
  vendor_address: string | null;
  vendor_email: string | null;
  vendor_phone: string | null;
  client_name: string | null;
  issue_date: string | null;
  delivery_date: string | null;
  payment_terms: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total_amount: number;
  notes: string | null;
  pdf_path: string | null;
  status: "DRAFT" | "SENT" | "APPROVED" | "CLOSED";
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  items: VendorPOItem[];
}

export interface VendorPOItemForm {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface CreateVendorPOPayload {
  vendor_name: string;
  vendor_address?: string;
  vendor_email?: string;
  vendor_phone?: string;
  client_name?: string;
  po_number?: string;
  issue_date?: string;
  delivery_date?: string;
  payment_terms?: string;
  line_items: VendorPOItemForm[];
  tax?: number;
  discount?: number;
  notes?: string;
  created_by?: string;
}
