"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus, Trash2, FileText } from "lucide-react";
import { useCreateVendorPO } from "@/hooks/useVendorPO";
import { getVendorPOPdfUrl } from "@/lib/vendorPoApi";
import type { VendorPOItemForm } from "@/lib/types/vendorPo";

interface Props {
  clientName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const emptyItem = (): VendorPOItemForm => ({
  description: "",
  quantity: 1,
  unit_price: 0,
});

export function VendorPOGeneratorModal({ clientName, open, onOpenChange }: Props) {
  const { mutateAsync, isPending } = useCreateVendorPO(clientName);

  const [form, setForm] = useState({
    vendor_name: "",
    vendor_address: "",
    vendor_email: "",
    vendor_phone: "",
    delivery_date: "",
    payment_terms: "Net 30",
    tax: 0,
    discount: 0,
    notes: "",
  });
  const [items, setItems] = useState<VendorPOItemForm[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [createdPOId, setCreatedPOId] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = subtotal + form.tax - form.discount;

  function updateItem(idx: number, field: keyof VendorPOItemForm, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.vendor_name.trim()) return setError("Vendor name is required.");
    if (items.some((i) => !i.description.trim())) return setError("All items need a description.");

    try {
      const po = await mutateAsync({
        vendor_name:    form.vendor_name,
        vendor_address: form.vendor_address || undefined,
        vendor_email:   form.vendor_email   || undefined,
        vendor_phone:   form.vendor_phone   || undefined,
        delivery_date:  form.delivery_date ? `${form.delivery_date}T00:00:00` : undefined,
        payment_terms:  form.payment_terms  || undefined,
        notes:          form.notes          || undefined,
        tax:            Number(form.tax),
        discount:       Number(form.discount),
        client_name:    clientName,
        line_items:     items,
      });
      setCreatedPOId(po.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function handleClose() {
    setForm({
      vendor_name: "", vendor_address: "", vendor_email: "", vendor_phone: "",
      delivery_date: "", payment_terms: "Net 30", tax: 0, discount: 0, notes: "",
    });
    setItems([emptyItem()]);
    setError(null);
    setCreatedPOId(null);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          w-full max-w-3xl max-h-[90vh] overflow-y-auto z-50
          bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <div>
              <Dialog.Title className="text-lg font-semibold text-white">
                Generate Vendor PO
              </Dialog.Title>
              <p className="text-sm text-slate-400 mt-0.5">Client: {clientName}</p>
            </div>
            <Dialog.Close asChild>
              <button className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          {/* Success State */}
          {createdPOId ? (
            <div className="p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <FileText className="text-emerald-400" size={28} />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">PO Generated Successfully!</p>
                <p className="text-slate-400 text-sm mt-1">
                  Your purchase order PDF is ready to download.
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href={getVendorPOPdfUrl(createdPOId)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm
                    rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <FileText size={16} /> Download PDF
                </a>
                <button
                  onClick={handleClose}
                  className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white
                    text-sm rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">

              {/* Vendor Details */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Vendor Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-slate-300 mb-1">Vendor Name *</label>
                    <input
                      value={form.vendor_name}
                      onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                      placeholder="Acme Corp"
                      className="w-full bg-slate-800 border border-slate-600 text-white
                        rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-slate-300 mb-1">Address</label>
                    <textarea
                      value={form.vendor_address}
                      onChange={(e) => setForm({ ...form, vendor_address: e.target.value })}
                      rows={2}
                      placeholder="123 Main St, City, Country"
                      className="w-full bg-slate-800 border border-slate-600 text-white
                        rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={form.vendor_email}
                      onChange={(e) => setForm({ ...form, vendor_email: e.target.value })}
                      placeholder="vendor@example.com"
                      className="w-full bg-slate-800 border border-slate-600 text-white
                        rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Phone</label>
                    <input
                      value={form.vendor_phone}
                      onChange={(e) => setForm({ ...form, vendor_phone: e.target.value })}
                      placeholder="+1 555 000 0000"
                      className="w-full bg-slate-800 border border-slate-600 text-white
                        rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </section>

              {/* PO Meta */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Order Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Delivery Date</label>
                    <input
                      type="date"
                      value={form.delivery_date}
                      onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 text-white
                        rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Payment Terms</label>
                    <select
                      value={form.payment_terms}
                      onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 text-white
                        rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    >
                      {["Net 15", "Net 30", "Net 45", "Net 60", "Due on Receipt"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Line Items */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Line Items
                  </h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>

                <div className="grid grid-cols-[1fr_80px_100px_90px_32px] gap-2 px-2 mb-1">
                  {["Description", "Qty", "Unit Price", "Total", ""].map((h) => (
                    <span key={h} className="text-xs text-slate-500 font-medium">{h}</span>
                  ))}
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_80px_100px_90px_32px] gap-2 items-center
                        bg-slate-800/50 rounded-lg px-2 py-2"
                    >
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        placeholder="Service or item description"
                        className="bg-slate-800 border border-slate-600 text-white rounded
                          px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-full"
                      />
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                        className="bg-slate-800 border border-slate-600 text-white rounded
                          px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-right w-full"
                      />
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                        className="bg-slate-800 border border-slate-600 text-white rounded
                          px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-right w-full"
                      />
                      <span className="text-sm text-slate-300 text-right pr-1">
                        ${(item.quantity * item.unit_price).toLocaleString("en", { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                        className="text-slate-500 hover:text-red-400 transition-colors
                          disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Financials */}
              <section className="border-t border-slate-700 pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Tax ($)</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={form.tax}
                          onChange={(e) => setForm({ ...form, tax: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-800 border border-slate-600 text-white
                            rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Discount ($)</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={form.discount}
                          onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-800 border border-slate-600 text-white
                            rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-slate-400 pt-1">
                      <span>Subtotal</span>
                      <span>${subtotal.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-white font-semibold pt-2 border-t border-slate-600">
                      <span>Total</span>
                      <span>${total.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Notes */}
              <section>
                <label className="block text-sm text-slate-300 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Any special instructions or terms..."
                  className="w-full bg-slate-800 border border-slate-600 text-white
                    rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500"
                />
              </section>

              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20
                  rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm text-slate-300 hover:text-white
                      bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600
                    hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-60
                    flex items-center gap-2"
                >
                  {isPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30
                        border-t-white rounded-full animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <><FileText size={15} /> Generate PO</>
                  )}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
