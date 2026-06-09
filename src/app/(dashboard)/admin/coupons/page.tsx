"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Edit2, X, Loader2, Tag, CheckCircle,
  AlertCircle, Copy, ToggleLeft, ToggleRight
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  is_active: boolean;
  usage_limit: number | null;
  usage_count: number;
  expires_at: string | null;
  applicable_plans: string[] | null;
  min_amount: number;
  created_at: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchCoupons(); }, []);

  async function fetchCoupons() {
    try {
      const res = await fetch("/api/admin/coupons");
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const plans = fd.getAll("plans") as string[];

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: fd.get("code"),
          description: fd.get("description") || null,
          discount_type: fd.get("discount_type"),
          discount_value: Number(fd.get("discount_value")),
          usage_limit: fd.get("usage_limit") ? Number(fd.get("usage_limit")) : null,
          expires_at: fd.get("expires_at") || null,
          applicable_plans: plans.length > 0 ? plans : null,
          min_amount: fd.get("min_amount") ? Number(fd.get("min_amount")) : 0,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setSuccessMsg("Coupon created!");
        setTimeout(() => setSuccessMsg(null), 3000);
        fetchCoupons();
      } else {
        const err = await res.json();
        setSuccessMsg(`❌ ${err.error}`);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch { /* silent */ }
    setSubmitting(false);
  }

  async function toggleActive(coupon: Coupon) {
    await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: coupon.id, is_active: !coupon.is_active }),
    });
    setCoupons((prev) => prev.map((c) => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      setSuccessMsg("Coupon deleted.");
      setTimeout(() => setSuccessMsg(null), 2000);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setSuccessMsg(`Copied: ${code}`);
    setTimeout(() => setSuccessMsg(null), 2000);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Coupon Management" description="Create and manage discount coupons" actionLabel="Create Coupon" actionIcon={Plus} onAction={() => setShowCreate(true)} />

      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <Tag className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No coupons yet</h3>
            <p className="text-sm text-text-muted mb-4">Create discount coupons for customers.</p>
            <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create Coupon</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <Card key={coupon.id} className={`${!coupon.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-bold bg-gray-100 px-2 py-0.5 rounded">{coupon.code}</code>
                      <button onClick={() => copyCode(coupon.code)} className="p-1 hover:bg-gray-100 rounded"><Copy className="w-3 h-3 text-text-muted" /></button>
                      <Badge variant={coupon.is_active ? "success" : "danger"}>
                        {coupon.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {coupon.discount_type === "percentage" ? `${coupon.discount_value}% Off` : `$${coupon.discount_value} Off`}
                      {coupon.applicable_plans ? ` • ${coupon.applicable_plans.join(", ")} only` : " • All plans"}
                      {coupon.description && ` • ${coupon.description}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-text-muted">
                      Used: {coupon.usage_count}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ""}
                    </p>
                    {coupon.expires_at && (
                      <p className="text-xs text-text-muted">
                        Expires: {new Date(coupon.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button onClick={() => toggleActive(coupon)} className="p-2 rounded-lg hover:bg-gray-100" title={coupon.is_active ? "Disable" : "Enable"}>
                    {coupon.is_active ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                  </button>
                  <button onClick={() => handleDelete(coupon.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Coupon Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">Create Coupon</h3>
                <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-text-muted" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Coupon Code *</label>
                  <input name="code" required className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 uppercase" placeholder="e.g. INDIA40" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Description</label>
                  <input name="description" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="e.g. 40% Off for Indian customers" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Discount Type *</label>
                    <select name="discount_type" required className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10">
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Discount Value *</label>
                    <input name="discount_value" type="number" required min="1" step="0.01" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="e.g. 40" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Usage Limit</label>
                    <input name="usage_limit" type="number" min="1" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="Unlimited" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Expiry Date</label>
                    <input name="expires_at" type="date" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Applicable Plans</label>
                  <div className="flex gap-3">
                    {["starter", "growth", "business"].map((p) => (
                      <label key={p} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" name="plans" value={p} className="rounded border-border text-primary focus:ring-primary" />
                        <span className="capitalize">{p}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted mt-1">Leave all unchecked for all plans.</p>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Min. Order Amount ($)</label>
                  <input name="min_amount" type="number" min="0" step="0.01" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="0" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {submitting ? "Creating..." : "Create Coupon"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
