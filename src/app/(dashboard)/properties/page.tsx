"use client";

import { useState, useEffect } from "react";
import {
  Plus, Search, Loader2, Save, Trash2, X, Building,
  MapPin, Image as ImageIcon, FileText, Video, CheckCircle, AlertCircle,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";

interface Property {
  id: string;
  name: string;
  tower: string | null;
  unit_number: string | null;
  property_type: string;
  bhk: string | null;
  carpet_area: string | null;
  super_builtup_area: string | null;
  price_min: number | null;
  price_max: number | null;
  price_display: string | null;
  booking_amount: string | null;
  payment_plans: Array<{ name: string; amount: string; schedule: string }>;
  status: string;
  possession_date: string | null;
  rera_number: string | null;
  builder_name: string | null;
  address: string | null;
  city: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_link: string | null;
  images: Array<{ url: string; caption?: string }>;
  floor_plans: Array<{ url: string; caption?: string }>;
  brochure_url: string | null;
  videos: Array<{ url: string; caption?: string }>;
  amenities: string[];
  nearby: { schools?: string[]; hospitals?: string[]; metro?: string[] };
  highlights: string[];
  description: string | null;
}

const EMPTY_PROPERTY: Omit<Property, "id"> = {
  name: "", tower: null, unit_number: null, property_type: "flat", bhk: null,
  carpet_area: null, super_builtup_area: null, price_min: null, price_max: null,
  price_display: null, booking_amount: null, payment_plans: [], status: "available",
  possession_date: null, rera_number: null, builder_name: null, address: null,
  city: null, area: null, latitude: null, longitude: null, google_maps_link: null,
  images: [], floor_plans: [], brochure_url: null, videos: [], amenities: [],
  nearby: {}, highlights: [], description: null,
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Property | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => { loadProperties(); }, []);

  async function loadProperties() {
    setLoading(true);
    try {
      const res = await fetch("/api/properties");
      const data = await res.json();
      setProperties(data.properties || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function saveProperty() {
    if (!editing) return;
    setSaving(true);
    setMsg(null);
    try {
      const method = isNew ? "POST" : "PUT";
      const url = isNew ? "/api/properties" : `/api/properties/${editing.id}`;
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setMsg({ type: "success", text: isNew ? "Property added!" : "Property updated!" });
      setEditing(null); setIsNew(false);
      loadProperties();
    } catch (e) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "Save failed" });
    }
    setSaving(false);
  }

  async function deleteProperty(id: string) {
    if (!confirm("Delete this property?")) return;
    await fetch(`/api/properties/${id}`, { method: "DELETE" });
    setMsg({ type: "success", text: "Property deleted" });
    loadProperties();
  }

  const filtered = properties.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !(p.city || "").toLowerCase().includes(search.toLowerCase()) &&
      !(p.area || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  // Editor Modal
  if (editing) return (
    <div>
      <PageHeader title={isNew ? "Add Property" : "Edit Property"} description="Manage property details, media, and pricing" />
      {msg && <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${msg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg.text}</div>}
      <div className="space-y-6" onKeyDown={(e) => { const t = e.target as HTMLElement; if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") e.stopPropagation(); }}>
        {/* Basic Info */}
        <Card>
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Building className="w-4 h-4" /> Basic Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="text-xs font-medium block mb-1">Project Name *</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="e.g. Green Valley Phase 2" /></div>
            <div><label className="text-xs font-medium block mb-1">Property Type</label><select value={editing.property_type} onChange={(e) => setEditing({ ...editing, property_type: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border"><option value="flat">Flat</option><option value="villa">Villa</option><option value="plot">Plot</option><option value="commercial">Commercial</option><option value="office">Office</option><option value="penthouse">Penthouse</option></select></div>
            <div><label className="text-xs font-medium block mb-1">BHK</label><select value={editing.bhk || ""} onChange={(e) => setEditing({ ...editing, bhk: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border"><option value="">—</option><option value="Studio">Studio</option><option value="1 BHK">1 BHK</option><option value="2 BHK">2 BHK</option><option value="3 BHK">3 BHK</option><option value="4 BHK">4 BHK</option><option value="5 BHK">5 BHK</option></select></div>
            <div><label className="text-xs font-medium block mb-1">Status</label><select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-border"><option value="available">Available</option><option value="hold">Hold</option><option value="sold">Sold</option><option value="upcoming">Upcoming</option></select></div>
            <div><label className="text-xs font-medium block mb-1">Tower</label><input value={editing.tower || ""} onChange={(e) => setEditing({ ...editing, tower: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="Tower A" /></div>
            <div><label className="text-xs font-medium block mb-1">Unit Number</label><input value={editing.unit_number || ""} onChange={(e) => setEditing({ ...editing, unit_number: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="1201" /></div>
            <div><label className="text-xs font-medium block mb-1">Carpet Area</label><input value={editing.carpet_area || ""} onChange={(e) => setEditing({ ...editing, carpet_area: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="950 sq.ft." /></div>
            <div><label className="text-xs font-medium block mb-1">Super Built-up</label><input value={editing.super_builtup_area || ""} onChange={(e) => setEditing({ ...editing, super_builtup_area: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="1250 sq.ft." /></div>
            <div><label className="text-xs font-medium block mb-1">Builder</label><input value={editing.builder_name || ""} onChange={(e) => setEditing({ ...editing, builder_name: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="Builder name" /></div>
            <div><label className="text-xs font-medium block mb-1">RERA Number</label><input value={editing.rera_number || ""} onChange={(e) => setEditing({ ...editing, rera_number: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="RERA/P/2024/12345" /></div>
            <div><label className="text-xs font-medium block mb-1">Possession Date</label><input value={editing.possession_date || ""} onChange={(e) => setEditing({ ...editing, possession_date: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="Dec 2025 / Ready to Move" /></div>
            <div className="md:col-span-2 lg:col-span-3"><label className="text-xs font-medium block mb-1">Description</label><textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value || null })} rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-border resize-none" placeholder="Key highlights, USP..." /></div>
          </div>
        </Card>

        {/* Pricing */}
        <Card>
          <h3 className="text-sm font-bold mb-4">💰 Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-xs font-medium block mb-1">Price Display</label><input value={editing.price_display || ""} onChange={(e) => setEditing({ ...editing, price_display: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="₹45L – ₹65L" /></div>
            <div><label className="text-xs font-medium block mb-1">Min Price (₹)</label><input type="number" value={editing.price_min || ""} onChange={(e) => setEditing({ ...editing, price_min: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="4500000" /></div>
            <div><label className="text-xs font-medium block mb-1">Max Price (₹)</label><input type="number" value={editing.price_max || ""} onChange={(e) => setEditing({ ...editing, price_max: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="6500000" /></div>
            <div><label className="text-xs font-medium block mb-1">Booking Amount</label><input value={editing.booking_amount || ""} onChange={(e) => setEditing({ ...editing, booking_amount: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="₹2,00,000" /></div>
          </div>
        </Card>

        {/* Location */}
        <Card>
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2"><label className="text-xs font-medium block mb-1">Address</label><input value={editing.address || ""} onChange={(e) => setEditing({ ...editing, address: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="Full address" /></div>
            <div><label className="text-xs font-medium block mb-1">City</label><input value={editing.city || ""} onChange={(e) => setEditing({ ...editing, city: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="Noida" /></div>
            <div><label className="text-xs font-medium block mb-1">Area / Sector</label><input value={editing.area || ""} onChange={(e) => setEditing({ ...editing, area: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="Sector 150" /></div>
            <div><label className="text-xs font-medium block mb-1">Google Maps Link</label><input value={editing.google_maps_link || ""} onChange={(e) => setEditing({ ...editing, google_maps_link: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="https://maps.google.com/..." /></div>
            <div><label className="text-xs font-medium block mb-1">Latitude</label><input type="number" step="any" value={editing.latitude || ""} onChange={(e) => setEditing({ ...editing, latitude: e.target.value ? parseFloat(e.target.value) : null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="28.5355" /></div>
            <div><label className="text-xs font-medium block mb-1">Longitude</label><input type="number" step="any" value={editing.longitude || ""} onChange={(e) => setEditing({ ...editing, longitude: e.target.value ? parseFloat(e.target.value) : null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="77.3910" /></div>
          </div>
        </Card>

        {/* Media */}
        <Card>
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Media</h3>
          <div className="space-y-4">
            <div><label className="text-xs font-medium block mb-1">Images (one URL per line)</label><textarea value={(editing.images || []).map((i) => `${i.url}${i.caption ? ` | ${i.caption}` : ""}`).join("\n")} onChange={(e) => setEditing({ ...editing, images: e.target.value.split("\n").filter((l) => l.trim()).map((l) => { const [url, caption] = l.split("|").map((s) => s.trim()); return { url, caption: caption || undefined }; }) })} rows={3} className="w-full px-3 py-2 text-sm rounded-lg border border-border resize-none font-mono" placeholder={"https://example.com/image1.jpg | Front View\nhttps://example.com/image2.jpg | Interior"} /></div>
            <div><label className="text-xs font-medium block mb-1">Floor Plans (one URL per line)</label><textarea value={(editing.floor_plans || []).map((i) => `${i.url}${i.caption ? ` | ${i.caption}` : ""}`).join("\n")} onChange={(e) => setEditing({ ...editing, floor_plans: e.target.value.split("\n").filter((l) => l.trim()).map((l) => { const [url, caption] = l.split("|").map((s) => s.trim()); return { url, caption: caption || undefined }; }) })} rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-border resize-none font-mono" placeholder="https://example.com/floor-2bhk.jpg | 2BHK Layout" /></div>
            <div><label className="text-xs font-medium block mb-1">Brochure PDF URL</label><input value={editing.brochure_url || ""} onChange={(e) => setEditing({ ...editing, brochure_url: e.target.value || null })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="https://example.com/brochure.pdf" /></div>
            <div><label className="text-xs font-medium block mb-1">Videos (one URL per line)</label><textarea value={(editing.videos || []).map((v) => `${v.url}${v.caption ? ` | ${v.caption}` : ""}`).join("\n")} onChange={(e) => setEditing({ ...editing, videos: e.target.value.split("\n").filter((l) => l.trim()).map((l) => { const [url, caption] = l.split("|").map((s) => s.trim()); return { url, caption: caption || undefined }; }) })} rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-border resize-none font-mono" placeholder="https://example.com/walkthrough.mp4 | Virtual Tour" /></div>
          </div>
        </Card>

        {/* Amenities & Nearby */}
        <Card>
          <h3 className="text-sm font-bold mb-4">🏢 Amenities & Nearby</h3>
          <div className="space-y-4">
            <div><label className="text-xs font-medium block mb-1">Amenities (comma separated)</label><input value={(editing.amenities || []).join(", ")} onChange={(e) => setEditing({ ...editing, amenities: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="Swimming Pool, Gym, Clubhouse, Park, Security" /></div>
            <div><label className="text-xs font-medium block mb-1">Highlights (comma separated)</label><input value={(editing.highlights || []).join(", ")} onChange={(e) => setEditing({ ...editing, highlights: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="Corner Unit, Park Facing, Vastu Compliant" /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="text-xs font-medium block mb-1">Nearby Schools</label><input value={(editing.nearby?.schools || []).join(", ")} onChange={(e) => setEditing({ ...editing, nearby: { ...editing.nearby, schools: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="DPS, Ryan International" /></div>
              <div><label className="text-xs font-medium block mb-1">Nearby Hospitals</label><input value={(editing.nearby?.hospitals || []).join(", ")} onChange={(e) => setEditing({ ...editing, nearby: { ...editing.nearby, hospitals: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="Max Hospital, Fortis" /></div>
              <div><label className="text-xs font-medium block mb-1">Nearby Metro</label><input value={(editing.nearby?.metro || []).join(", ")} onChange={(e) => setEditing({ ...editing, nearby: { ...editing.nearby, metro: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })} className="w-full px-3 py-2 text-sm rounded-lg border border-border" placeholder="Sector 142 Metro, Botanical Garden" /></div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={saveProperty} disabled={saving || !editing.name.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? "Add Property" : "Save Changes"}
          </Button>
          <Button variant="secondary" onClick={() => { setEditing(null); setIsNew(false); }}>
            <X className="w-4 h-4" /> Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  // List View
  return (
    <div>
      <PageHeader title="Properties" description="Manage your real estate projects and units" />
      {msg && <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${msg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg.text}</div>}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search properties..." className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2.5 text-sm rounded-lg border border-border">
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="hold">Hold</option>
          <option value="sold">Sold</option>
          <option value="upcoming">Upcoming</option>
        </select>
        <Button onClick={() => { setEditing({ id: "new", ...EMPTY_PROPERTY } as Property); setIsNew(true); }}>
          <Plus className="w-4 h-4" /> Add Property
        </Button>
      </div>

      {/* Properties Grid */}
      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Building className="w-12 h-12 text-text-muted/20 mx-auto mb-3" />
            <h3 className="text-sm font-bold mb-1">No properties yet</h3>
            <p className="text-xs text-text-muted mb-4">Add your first property to enable AI recommendations</p>
            <Button onClick={() => { setEditing({ id: "new", ...EMPTY_PROPERTY } as Property); setIsNew(true); }}><Plus className="w-4 h-4" /> Add Property</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} hover className="cursor-pointer" onClick={() => { setEditing(p); setIsNew(false); }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-bold">{p.name}</h4>
                  <p className="text-xs text-text-muted">{[p.bhk, p.property_type, p.area, p.city].filter(Boolean).join(" • ")}</p>
                </div>
                <Badge variant={p.status === "available" ? "success" : p.status === "sold" ? "danger" : "warning"}>
                  {p.status}
                </Badge>
              </div>
              {p.price_display && <p className="text-sm font-semibold text-primary mb-2">{p.price_display}</p>}
              <div className="flex items-center gap-3 text-[10px] text-text-muted">
                {p.images.length > 0 && <span className="flex items-center gap-0.5"><ImageIcon className="w-3 h-3" />{p.images.length}</span>}
                {p.floor_plans.length > 0 && <span className="flex items-center gap-0.5"><FileText className="w-3 h-3" />Plans</span>}
                {p.brochure_url && <span className="flex items-center gap-0.5"><FileText className="w-3 h-3" />PDF</span>}
                {p.videos.length > 0 && <span className="flex items-center gap-0.5"><Video className="w-3 h-3" />{p.videos.length}</span>}
                {p.google_maps_link && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />Map</span>}
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <button onClick={(e) => { e.stopPropagation(); setEditing(p); setIsNew(false); }} className="text-xs text-primary hover:underline">Edit</button>
                <button onClick={(e) => { e.stopPropagation(); deleteProperty(p.id); }} className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
