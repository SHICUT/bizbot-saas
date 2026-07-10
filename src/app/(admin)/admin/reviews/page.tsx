"use client";

import { useState } from "react";
import { Star, Plus, Eye, EyeOff, Trash2, Award, ExternalLink } from "lucide-react";

interface Review {
  id: string;
  clientName: string;
  company: string;
  industry: string;
  rating: number;
  text: string;
  date: string;
  avatar: string;
  status: "approved" | "pending" | "hidden";
  featured: boolean;
}

const INITIAL_REVIEWS: Review[] = [
  {
    id: "1",
    clientName: "Rahul Sharma",
    company: "FitZone Gym",
    industry: "Fitness & Gym",
    rating: 5,
    text: "FlowNex handles 90% of my inquiries automatically. I went from missing leads to booking 3x more trial sessions.",
    date: "2026-05-15",
    avatar: "RS",
    status: "approved",
    featured: true,
  },
  {
    id: "2",
    clientName: "Priya Mehta",
    company: "Glow Beauty Salon",
    industry: "Salon & Spa",
    rating: 5,
    text: "My customers get instant replies even at midnight. Appointment bookings doubled in the first month.",
    date: "2026-04-22",
    avatar: "PM",
    status: "approved",
    featured: true,
  },
  {
    id: "3",
    clientName: "Amit Kapoor",
    company: "Prime Realty Group",
    industry: "Real Estate",
    rating: 5,
    text: "Every property inquiry is now captured and followed up. I closed 4 extra deals last quarter thanks to FlowNex.",
    date: "2026-03-10",
    avatar: "AK",
    status: "approved",
    featured: false,
  },
  {
    id: "4",
    clientName: "Dr. Sneha Rao",
    company: "HealthFirst Clinic",
    industry: "Healthcare / Clinic",
    rating: 5,
    text: "Patients love the instant appointment booking on WhatsApp. No more missed calls during consultations.",
    date: "2026-04-05",
    avatar: "SR",
    status: "approved",
    featured: false,
  },
  {
    id: "5",
    clientName: "Vikram Singh",
    company: "Excel Coaching Center",
    industry: "Coaching Institute",
    rating: 5,
    text: "During admission season, FlowNex handled 500+ inquiries per month without us lifting a finger.",
    date: "2026-05-01",
    avatar: "VS",
    status: "pending",
    featured: false,
  },
];

export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "approved" | "pending" | "hidden">("all");

  const [newReview, setNewReview] = useState({
    clientName: "",
    company: "",
    industry: "",
    rating: 5,
    text: "",
  });

  const filteredReviews = reviews.filter((r) => filter === "all" || r.status === filter);

  function addReview() {
    if (!newReview.clientName || !newReview.text) return;
    const review: Review = {
      id: Date.now().toString(),
      ...newReview,
      date: new Date().toISOString().split("T")[0],
      avatar: newReview.clientName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      status: "pending",
      featured: false,
    };
    setReviews([review, ...reviews]);
    setNewReview({ clientName: "", company: "", industry: "", rating: 5, text: "" });
    setShowAddForm(false);
  }

  function toggleStatus(id: string, status: Review["status"]) {
    setReviews(reviews.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  function toggleFeatured(id: string) {
    setReviews(reviews.map((r) => (r.id === id ? { ...r, featured: !r.featured } : r)));
  }

  function deleteReview(id: string) {
    setReviews(reviews.filter((r) => r.id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Review Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage customer reviews displayed on the FlowNex website
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <ExternalLink className="w-4 h-4" /> Google Review Link
            </a>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white gradient-primary rounded-lg hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Add Review
            </button>
          </div>
        </div>

        {/* Add Review Form */}
        {showAddForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Review</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Client Name"
                value={newReview.clientName}
                onChange={(e) => setNewReview({ ...newReview, clientName: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              <input
                type="text"
                placeholder="Company Name"
                value={newReview.company}
                onChange={(e) => setNewReview({ ...newReview, company: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              <input
                type="text"
                placeholder="Industry (e.g., Real Estate, Salon)"
                value={newReview.industry}
                onChange={(e) => setNewReview({ ...newReview, industry: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              <select
                value={newReview.rating}
                onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value={5}>5 Stars</option>
                <option value={4}>4 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={2}>2 Stars</option>
                <option value={1}>1 Star</option>
              </select>
            </div>
            <textarea
              placeholder="Review text..."
              value={newReview.text}
              onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[80px] mb-4"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={addReview}
                className="px-5 py-2 text-sm font-semibold text-white gradient-primary rounded-lg hover:opacity-90"
              >
                Add Review
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {(["all", "approved", "pending", "hidden"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                filter === f
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1.5 text-xs opacity-70">
                ({f === "all" ? reviews.length : reviews.filter((r) => r.status === f).length})
              </span>
            </button>
          ))}
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className={`bg-white border rounded-xl p-5 transition-all ${
                review.featured ? "border-primary/30 ring-1 ring-primary/10" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {review.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900">{review.clientName}</h4>
                      {review.featured && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-full">
                          Featured
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          review.status === "approved"
                            ? "bg-emerald-50 text-emerald-700"
                            : review.status === "pending"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {review.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {review.company} · {review.industry} · {review.date}
                    </p>
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">&ldquo;{review.text}&rdquo;</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {review.status !== "approved" && (
                    <button
                      onClick={() => toggleStatus(review.id, "approved")}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Approve"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  {review.status !== "hidden" && (
                    <button
                      onClick={() => toggleStatus(review.id, "hidden")}
                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Hide"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => toggleFeatured(review.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      review.featured ? "text-amber-500 hover:bg-amber-50" : "text-gray-400 hover:bg-gray-100"
                    }`}
                    title="Toggle Featured"
                  >
                    <Award className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteReview(review.id)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredReviews.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No reviews in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
