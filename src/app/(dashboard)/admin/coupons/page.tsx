"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Edit2, X, Loader2, Tag, CheckCircle,
  Copy, ToggleLeft, ToggleRight, BarChart2, Clock, Users
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
  per_user_limit: number | null;
  usage_count: number;
  expires_at: string | null;
  applicable_plans: string[] | null;
  min_amount: number;
  created_at: string;
}

interface Redemption {
  coupon_id: string;
  business_id: string;
  plan_id: string;
  discount_amount: number;
  final_amount: number;
  redeemed_at: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [showAnalytics, setShowAnalytics] = useState<Coupon | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchCoupons(); }, []);

  async function fetchCoupons() {
    try {
      const res = await fetch("/api/admin/coupons");
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
        setRedemptions(data.redemptions || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  async function handleCreateOrEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const plans = fd.getAll("plans") as string[];

    const payload = {
      code: fd.get("code"),
      description: fd.get("description") || null,
      discount_type: fd.get("discount_type"),
      discount_value: Number(fd.get("discount_value")),
      usage_limit: fd.get("usage_limit") ? Number(fd.get("usage_limit")) : null,
      per_user_limit: fd.get("per_user_limit") ? Number(fd.get("per_user_limit")) : 1,
      expires_at: fd.get("expires_at") || null,
      applicable_plans: plans.length > 0 ? plans : null,
      min_amount: fd.get("min_amount") ? Number(fd.get("min_amount")) : 0,
    };

    try {
      let res: Response;
      if (editingCoupon) {
        res = await fetch("/api/admin/coupons", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingCoupon.id, ...payload }),
        });
      } else {
        res = await fetch("/api/admin/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setShowCreate(false);
        setEditingCoupon(null);
        setSuccessMsg(editingCoupon ? "Coupon updated!" : "Coupon created!");
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
    if (!confirm("Delete this coupon and all its redemption history? This cannot be undone.")) return;
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

  function getCouponRedemptions(couponId: string) {
    return redemptions.filter((r) => r.coupon_id === couponId);
  }

  function getTotalDiscount(couponId: string) {
    return getCouponRedemptions(couponId).reduce((sum, r) => sum + Number(r.discount_amount), 0);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const totalRedemptions = redemptions.length;
  const totalDiscountGiven = redemptions.reduce((sum, r) => sum + Number(r.discount_amount), 0);
  const activeCoupons = coupons.filter((c) => c.is_active).length;

  return (
    <div>
      <PageHeader title="Coupon Management" description="Create and manage discount coupons — fully dynamic, no code changes needed" actionLabel="Create Coupon" actionIcon={Plus} onAction={() => { setEditingCoupon(null); setShowCreate(true); }} />

      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card><p className="text-xs text-text-muted">Total Coupons</p><p className="text-xl font-bold">{coupons.length}</p></Card>
        <Card><p className="text-xs text-text-muted">Active</p><p className="text-xl font-bold text-emerald-600">{activeCoupons}</p></Card>
        <Card><p className="text-xs text-text-muted">Total Redemptions</p><p className="text-xl font-bold text-indigo-600">{totalRedemptions}</p></Card>
        <Card><p className="text-xs text-text-muted">Total Discount Given</p><p className="text-xl font-bold text-amber-600">${totalDiscountGiven.toFixed(2)}</p></Card>
      </div>

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <Tag className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No coupons yet</h3>
            <p className="text-sm text-text-muted mb-4">Create your first coupon. All coupons are managed here — no code changes required.</p>
            <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create Coupon</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const couponRedemptions = getCouponRedemptions(coupon.id);
            const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
            return (
              <Card key={coupon.id} className={`${!coupon.is_active || isExpired ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${coupon.is_active && !isExpired ? "bg-primary/10" : "bg-gray-100"}`}>
                      <Tag className={`w-5 h-5 ${coupon.is_active && !isExpired ? "text-primary" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-sm font-bold bg-gray-100 px-2 py-0.5 rounded">{coupon.code}</code>
                        <button onClick={() => copyCode(coupon.code)} className="p-1 hover:bg-gray-100 rounded"><Copy className="w-3 h-3 text-text-muted" /></button>
                        <Badge variant={coupon.is_active && !isExpired ? "success" : "danger"}>
                          {isExpired ? "Expired" : coupon.is_active ? "Active" : "Disabled"}
                        </Badge>
                        {coupon.discount_type === "percentage"
                          ? <span className="text-xs font-medium text-primary">{coupon.discount_value}% Off</span>
                          : <span className="text-xs font-medium text-primary">${coupon.discount_value} Off</span>
                        }
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {coupon.applicable_plans ? `Plans: ${coupon.applicable_plans.join(", ")}` : "All plans"}
                        {coupon.description && ` • ${coupon.description}`}
                        {` • ${coupon.per_user_limit === null ? "Unlimited" : coupon.per_user_limit}× per user`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block mr-2">
                      <p className="text-xs text-text-muted">
                        Used: {coupon.usage_count}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : " / ∞"}
                      </p>
                      {coupon.expires_at && (
                        <p className="text-xs text-text-muted flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />{new Date(coupon.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button onClick={() => setShowAnalytics(coupon)} className="p-2 rounded-lg hover:bg-gray-100 text-text-muted" title="Analytics">
                      <BarChart2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setEditingCoupon(coupon); setShowCreate(true); }} className="p-2 rounded-lg hover:bg-gray-100 text-text-muted" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleActive(coupon)} className="p-2 rounded-lg hover:bg-gray-100" title={coupon.is_active ? "Disable" : "Enable"}>
                      {coupon.is_active ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    </button>
                    <button onClick={() => handleDelete(coupon.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Coupon Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => { setShowCreate(false); setEditingCoupon(null); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">{editingCoupon ? "Edit Coupon" : "Create Coupon"}</h3>
                <button onClick={() => { setShowCreate(false); setEditingCoupon(null); }}><X className="w-5 h-5 text-text-muted" /></button>
              </div>
              <form onSubmit={handleCreateOrEdit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Coupon Code *</label>
                  <input name="code" required defaultValue={editingCoupon?.code || ""} disabled={!!editingCoupon} className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 uppercase disabled:bg-gray-50 disabled:text-text-muted" placeholder="e.g. WELCOME50" />
                  {editingCoupon && <p className="text-xs text-text-muted mt-1">Code cannot be changed after creation.</p>}
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Description</label>
                  <input name="description" defaultValue={editingCoupon?.description || ""} className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="e.g. Welcome offer for new users" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Discount Type *</label>
                    <select name="discount_type" required defaultValue={editingCoupon?.discount_type || "percentage"} className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10">
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Discount Value *</label>
                    <input name="discount_value" type="number" required min="0.01" step="0.01" defaultValue={editingCoupon?.discount_value || ""} className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="e.g. 40" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Total Usage Limit</label>
                    <input name="usage_limit" type="number" min="1" defaultValue={editingCoupon?.usage_limit || ""} className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="Unlimited" />
                    <p className="text-xs text-text-muted mt-1">Leave blank for unlimited total uses.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Per-User Limit</label>
                    <input name="per_user_limit" type="number" min="1" defaultValue={editingCoupon?.per_user_limit ?? 1} className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="1" />
                    <p className="text-xs text-text-muted mt-1">How many times one user can use this coupon.</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Expiry Date</label>
                  <input name="expires_at" type="date" defaultValue={editingCoupon?.expires_at ? editingCoupon.expires_at.split("T")[0] : ""} className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10" />
                  <p className="text-xs text-text-muted mt-1">Leave blank for no expiry.</p>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Applicable Plans</label>
                  <div className="flex gap-3">
                    {["starter", "growth", "business"].map((p) => (
                      <label key={p} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" name="plans" value={p} defaultChecked={editingCoupon?.applicable_plans?.includes(p) || false} className="rounded border-border text-primary focus:ring-primary" />
                        <span className="capitalize">{p}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted mt-1">Leave all unchecked = valid for all plans.</p>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Min. Order Amount ($)</label>
                  <input name="min_amount" type="number" min="0" step="0.01" defaultValue={editingCoupon?.min_amount || ""} className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="0 (no minimum)" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCoupon ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {submitting ? "Saving..." : editingCoupon ? "Save Changes" : "Create Coupon"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Analytics/Redemption History Modal */}
      <AnimatePresence>
        {showAnalytics && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowAnalytics(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">Coupon Analytics</h3>
                    <code className="text-sm text-primary font-bold">{showAnalytics.code}</code>
                  </div>
                  <button onClick={() => setShowAnalytics(null)}><X className="w-5 h-5 text-text-muted" /></button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-3 rounded-lg bg-gray-50 text-center">
                    <p className="text-lg font-bold">{showAnalytics.usage_count}</p>
                    <p className="text-xs text-text-muted">Redeemed</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 text-center">
                    <p className="text-lg font-bold text-emerald-600">${getTotalDiscount(showAnalytics.id).toFixed(2)}</p>
                    <p className="text-xs text-text-muted">Total Discount</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 text-center">
                    <p className="text-lg font-bold">{showAnalytics.usage_limit ?? "∞"}</p>
                    <p className="text-xs text-text-muted">Limit</p>
                  </div>
                </div>

                {/* Redemption History */}
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Redemption History</h4>
                {getCouponRedemptions(showAnalytics.id).length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-6">No redemptions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {getCouponRedemptions(showAnalytics.id).map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 text-sm">
                        <div>
                          <p className="font-medium capitalize">{r.plan_id.replace("_", " ")}</p>
                          <p className="text-xs text-text-muted">{new Date(r.redeemed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-600 font-medium">-${Number(r.discount_amount).toFixed(2)}</p>
                          <p className="text-xs text-text-muted">Paid: ${Number(r.final_amount).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
