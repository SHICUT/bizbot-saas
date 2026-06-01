"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Image, FileText, Loader2, X, Upload, Search } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";

interface MediaItem {
  id: string;
  name: string;
  type: string;
  url: string;
  trigger_keywords: string[];
  created_at: string;
}

const CATEGORIES_BY_TYPE: Record<string, Array<{ id: string; label: string; emoji: string }>> = {
  gym: [
    { id: "pricing", label: "Pricing", emoji: "💰" },
    { id: "membership", label: "Membership Plans", emoji: "🎫" },
    { id: "timetable", label: "Timetable", emoji: "📅" },
    { id: "offers", label: "Offers", emoji: "🎉" },
    { id: "gallery", label: "Gallery", emoji: "🖼️" },
    { id: "trainers", label: "Trainers", emoji: "💪" },
  ],
  salon: [
    { id: "services", label: "Services", emoji: "✂️" },
    { id: "pricing", label: "Pricing", emoji: "💰" },
    { id: "offers", label: "Offers", emoji: "🎉" },
    { id: "before_after", label: "Before/After", emoji: "✨" },
    { id: "gallery", label: "Gallery", emoji: "🖼️" },
    { id: "products", label: "Products", emoji: "🧴" },
  ],
  restaurant: [
    { id: "menu", label: "Menu", emoji: "🍽️" },
    { id: "offers", label: "Offers", emoji: "🎉" },
    { id: "gallery", label: "Gallery", emoji: "🖼️" },
    { id: "events", label: "Events", emoji: "🎶" },
  ],
  clinic: [
    { id: "services", label: "Services", emoji: "🏥" },
    { id: "doctors", label: "Doctors", emoji: "👨‍⚕️" },
    { id: "pricing", label: "Pricing", emoji: "💰" },
    { id: "certificates", label: "Certificates", emoji: "📜" },
    { id: "gallery", label: "Gallery", emoji: "🖼️" },
  ],
  real_estate: [
    { id: "brochure", label: "Brochure", emoji: "📄" },
    { id: "pricing", label: "Price Sheet", emoji: "💰" },
    { id: "floor_plans", label: "Floor Plans", emoji: "🏗️" },
    { id: "gallery", label: "Gallery", emoji: "🖼️" },
    { id: "location", label: "Location", emoji: "📍" },
    { id: "amenities", label: "Amenities", emoji: "🏊" },
  ],
  coaching: [
    { id: "courses", label: "Courses", emoji: "📚" },
    { id: "pricing", label: "Fee Structure", emoji: "💰" },
    { id: "timetable", label: "Batch Timings", emoji: "📅" },
    { id: "results", label: "Results", emoji: "🏆" },
    { id: "faculty", label: "Faculty", emoji: "👨‍🏫" },
  ],
  other: [
    { id: "pricing", label: "Pricing", emoji: "💰" },
    { id: "services", label: "Services", emoji: "📋" },
    { id: "offers", label: "Offers", emoji: "🎉" },
    { id: "brochure", label: "Brochure", emoji: "📄" },
    { id: "gallery", label: "Gallery", emoji: "🖼️" },
  ],
};

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filter, setFilter] = useState("all");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState("other");

  const categories = CATEGORIES_BY_TYPE[businessType] || CATEGORIES_BY_TYPE.other;

  useEffect(() => {
    fetchMedia();
    // Get business type
    fetch("/api/dashboard").then((r) => r.json()).then((d) => {
      if (d.business?.type) setBusinessType(d.business.type);
    }).catch(() => {});
  }, []);

  async function fetchMedia() {
    const res = await fetch("/api/media");
    const data = await res.json();
    setMedia(data.media || []);
    setLoading(false);
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const keywords = (fd.get("keywords") as string || "").split(",").map((k) => k.trim()).filter(Boolean);

    const res = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        type: fd.get("category"),
        url: fd.get("url"),
        category: fd.get("category"),
        trigger_keywords: keywords,
      }),
    });

    if (res.ok) {
      setShowUpload(false);
      setSuccessMsg("Media added! AI will use it in conversations.");
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchMedia();
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/media?id=${id}`, { method: "DELETE" });
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  const filtered = filter === "all" ? media : media.filter((m) => m.type === filter);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Media Library" description="Upload images and documents for AI to share with customers" actionLabel="Upload Media" actionIcon={Plus} onAction={() => setShowUpload(true)} />

      {successMsg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">✓ {successMsg}</motion.div>}

      {/* Info */}
      <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100">
        <p className="text-sm text-blue-800 font-medium mb-1">How it works</p>
        <p className="text-xs text-blue-700">Upload pricing charts, menus, offer banners, or brochures. When a customer asks about pricing or services, AI will automatically send the relevant media along with a text explanation.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === "all" ? "bg-primary text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}>All ({media.length})</button>
        {categories.map((c) => {
          const count = media.filter((m) => m.type === c.id).length;
          return <button key={c.id} onClick={() => setFilter(c.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === c.id ? "bg-primary text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}>{c.emoji} {c.label} ({count})</button>;
        })}
      </div>

      {/* Media Grid */}
      {filtered.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <Image className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">No media uploaded</h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto mb-4">Upload pricing charts, menus, or offer banners. AI will send them to customers automatically.</p>
            <Button onClick={() => setShowUpload(true)}><Upload className="w-4 h-4" /> Upload First Media</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="group relative">
                {/* Preview */}
                <div className="h-32 rounded-lg bg-gray-100 mb-3 flex items-center justify-center overflow-hidden">
                  {item.url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <FileText className="w-8 h-8 text-text-muted/40" />
                  )}
                </div>
                {/* Info */}
                <h4 className="text-sm font-semibold truncate">{item.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="default">{item.type}</Badge>
                  {item.trigger_keywords.length > 0 && <span className="text-[10px] text-text-muted">{item.trigger_keywords.length} keywords</span>}
                </div>
                {/* Delete */}
                <button onClick={() => handleDelete(item.id)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowUpload(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">Upload Media</h3>
              <button onClick={() => setShowUpload(false)}><X className="w-5 h-5 text-text-muted" /></button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div><label className="text-sm font-medium block mb-1.5">Title *</label><input name="name" required className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="e.g. Membership Plans Chart" /></div>
              <div><label className="text-sm font-medium block mb-1.5">Category *</label>
                <select name="category" required className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10">
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium block mb-1.5">File URL *</label><input name="url" type="url" required className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="https://..." />
                <p className="text-xs text-text-muted mt-1">Upload to Supabase Storage or any CDN, then paste the URL here.</p>
              </div>
              <div><label className="text-sm font-medium block mb-1.5">AI Trigger Keywords</label><input name="keywords" className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="price, cost, plan, membership (comma separated)" />
                <p className="text-xs text-text-muted mt-1">AI sends this media when customer mentions these words.</p>
              </div>
              <Button type="submit" className="w-full"><Upload className="w-4 h-4" /> Add to Library</Button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
