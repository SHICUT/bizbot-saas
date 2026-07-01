"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Loader2, CheckCircle, AlertCircle, Plus, Trash2,
  Building, Phone, MapPin, Clock, HelpCircle, BookOpen, Sparkles,
  Dumbbell, Scissors, UtensilsCrossed, Stethoscope, Home, StickyNote,
  Users, Image, Star, FileText
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";

// ─── Types ──────────────────────────────────────────────────────────────────

type Section = string;
interface ServiceItem { name: string; description: string; price: string; duration: string; }
interface PlanItem { name: string; price: string; duration: string; features: string[]; is_popular: boolean; }
interface FaqItem { question: string; answer: string; category: string; }
interface HoursDay { open: string; close: string; closed: boolean; }
type HoursData = Record<string, HoursDay>;
interface ScoreSection { name: string; score: number; }

// ─── Business Type Configurations ───────────────────────────────────────────

interface SectionDef {
  id: string;
  label: string;
  icon: typeof Building;
  description: string;
  type: "common" | "dynamic";
}

const COMMON_SECTIONS: SectionDef[] = [
  { id: "profile", label: "Business Details", icon: Building, description: "Name, owner, type", type: "common" },
  { id: "contact", label: "Contact", icon: Phone, description: "Phone, email, website", type: "common" },
  { id: "location", label: "Location", icon: MapPin, description: "Address & maps", type: "common" },
  { id: "hours", label: "Working Hours", icon: Clock, description: "Daily schedule", type: "common" },
];

const COMMON_BOTTOM: SectionDef[] = [
  { id: "faqs", label: "FAQs", icon: HelpCircle, description: "Common questions", type: "common" },
  { id: "notes", label: "Additional Notes", icon: StickyNote, description: "Extra AI context", type: "common" },
];

const BUSINESS_TYPE_SECTIONS: Record<string, SectionDef[]> = {
  school: [
    { id: "admissions", label: "Admissions", icon: BookOpen, description: "Process, dates & eligibility", type: "dynamic" },
    { id: "services", label: "Classes Offered", icon: Star, description: "Nursery to XII, streams", type: "dynamic" },
    { id: "plans", label: "Fee Structure", icon: FileText, description: "Tuition, admission, transport fees", type: "dynamic" },
    { id: "documents", label: "Documents Required", icon: FileText, description: "Birth certificate, TC, etc.", type: "dynamic" },
    { id: "trainers", label: "Faculty", icon: Users, description: "Principal, teachers, staff", type: "dynamic" },
    { id: "facilities", label: "Facilities", icon: Building, description: "Labs, library, sports, smart classes", type: "dynamic" },
    { id: "transport", label: "Transport", icon: MapPin, description: "Bus routes & pickup areas", type: "dynamic" },
    { id: "uniform", label: "Uniform", icon: Star, description: "Summer & winter uniform", type: "dynamic" },
    { id: "timings", label: "School Timings", icon: Clock, description: "Class timings & office hours", type: "dynamic" },
    { id: "activities", label: "Activities", icon: Star, description: "Sports, arts, extracurriculars", type: "dynamic" },
  ],
  gym: [
    { id: "plans", label: "Membership Plans", icon: Star, description: "Monthly, quarterly, annual plans", type: "dynamic" },
    { id: "services", label: "Classes & Programs", icon: Dumbbell, description: "Group classes, HIIT, yoga", type: "dynamic" },
    { id: "trainers", label: "Trainers", icon: Users, description: "Personal trainers & coaches", type: "dynamic" },
    { id: "facilities", label: "Facilities", icon: Building, description: "Equipment, AC, steam, pool", type: "dynamic" },
    { id: "timings", label: "Batch Timings", icon: Clock, description: "Morning, evening, weekend slots", type: "dynamic" },
    { id: "offers", label: "Offers & Trials", icon: Star, description: "Free trials, seasonal offers", type: "dynamic" },
  ],
  salon: [
    { id: "services", label: "Services & Pricing", icon: Scissors, description: "Haircut, facial, bridal, etc.", type: "dynamic" },
    { id: "plans", label: "Packages", icon: Star, description: "Bridal, party, combo packages", type: "dynamic" },
    { id: "trainers", label: "Stylists", icon: Users, description: "Artists & specialists", type: "dynamic" },
    { id: "offers", label: "Offers", icon: Star, description: "Seasonal offers & discounts", type: "dynamic" },
    { id: "facilities", label: "Gallery & Policies", icon: Image, description: "Portfolio, cancellation policy", type: "dynamic" },
  ],
  spa: [
    { id: "services", label: "Therapies", icon: Scissors, description: "Massages, facials, body wraps", type: "dynamic" },
    { id: "plans", label: "Packages & Memberships", icon: Star, description: "Combo packages, memberships", type: "dynamic" },
    { id: "trainers", label: "Therapists", icon: Users, description: "Specialists & experience", type: "dynamic" },
    { id: "facilities", label: "Facilities", icon: Building, description: "Rooms, ambience, amenities", type: "dynamic" },
    { id: "offers", label: "Offers", icon: Star, description: "Couple spa, seasonal offers", type: "dynamic" },
  ],
  clinic: [
    { id: "trainers", label: "Doctors", icon: Stethoscope, description: "Specialists, qualifications, OPD", type: "dynamic" },
    { id: "services", label: "Treatments & Services", icon: Stethoscope, description: "Consultations, procedures, diagnostics", type: "dynamic" },
    { id: "plans", label: "Health Packages", icon: Star, description: "Checkup packages, insurance panels", type: "dynamic" },
    { id: "facilities", label: "Departments & Equipment", icon: Building, description: "Departments, lab, pharmacy", type: "dynamic" },
    { id: "timings", label: "OPD Timings", icon: Clock, description: "Doctor availability & slots", type: "dynamic" },
  ],
  dental: [
    { id: "trainers", label: "Dentists", icon: Stethoscope, description: "Specialists & qualifications", type: "dynamic" },
    { id: "services", label: "Procedures & Pricing", icon: Stethoscope, description: "Cleaning, RCT, implants, braces", type: "dynamic" },
    { id: "plans", label: "Packages", icon: Star, description: "Annual care plans, insurance", type: "dynamic" },
    { id: "facilities", label: "Equipment & Technology", icon: Building, description: "Digital X-ray, laser, etc.", type: "dynamic" },
    { id: "timings", label: "Clinic Timings", icon: Clock, description: "Working hours & emergency", type: "dynamic" },
  ],
  restaurant: [
    { id: "services", label: "Menu", icon: UtensilsCrossed, description: "Food items & beverages", type: "dynamic" },
    { id: "plans", label: "Combos & Offers", icon: Star, description: "Meal deals, happy hours", type: "dynamic" },
    { id: "facilities", label: "Dine-in & Delivery", icon: Building, description: "Seating, delivery areas, parking", type: "dynamic" },
    { id: "timings", label: "Opening Hours", icon: Clock, description: "Timings, reservation info", type: "dynamic" },
    { id: "offers", label: "Events & Catering", icon: Star, description: "Private dining, catering, events", type: "dynamic" },
  ],
  cafe: [
    { id: "services", label: "Menu", icon: UtensilsCrossed, description: "Beverages, food, specials", type: "dynamic" },
    { id: "plans", label: "Offers", icon: Star, description: "Happy hours, loyalty cards", type: "dynamic" },
    { id: "facilities", label: "Ambience & Info", icon: Building, description: "WiFi, seating, pet-friendly", type: "dynamic" },
    { id: "timings", label: "Opening Hours", icon: Clock, description: "Timings & reservation", type: "dynamic" },
    { id: "offers", label: "Events", icon: Star, description: "Open mics, workshops, meetups", type: "dynamic" },
  ],
  real_estate: [
    { id: "services", label: "Projects", icon: Home, description: "Available properties & locations", type: "dynamic" },
    { id: "plans", label: "Pricing & Payment Plans", icon: FileText, description: "Price sheets, EMI, possession", type: "dynamic" },
    { id: "facilities", label: "Amenities", icon: Building, description: "Pool, gym, park, security", type: "dynamic" },
    { id: "offers", label: "Offers & RERA", icon: Star, description: "Early bird, RERA number, loans", type: "dynamic" },
    { id: "trainers", label: "Sales Team", icon: Users, description: "Agents & contact persons", type: "dynamic" },
  ],
  coaching: [
    { id: "services", label: "Courses", icon: BookOpen, description: "Programs, subjects, batches", type: "dynamic" },
    { id: "plans", label: "Fee Structure", icon: Star, description: "Batch fees, scholarships", type: "dynamic" },
    { id: "trainers", label: "Faculty", icon: Users, description: "Teachers, qualifications, experience", type: "dynamic" },
    { id: "facilities", label: "Facilities", icon: Building, description: "Labs, library, study material", type: "dynamic" },
    { id: "timings", label: "Batch Timings", icon: Clock, description: "Morning, evening, weekend batches", type: "dynamic" },
    { id: "offers", label: "Demo & Results", icon: Star, description: "Free demo, results, placements", type: "dynamic" },
  ],
  consultancy: [
    { id: "services", label: "Services", icon: Star, description: "Consulting services offered", type: "dynamic" },
    { id: "plans", label: "Packages & Pricing", icon: FileText, description: "Engagement models, retainers", type: "dynamic" },
    { id: "trainers", label: "Team", icon: Users, description: "Consultants, expertise, industries", type: "dynamic" },
    { id: "facilities", label: "Process & Testimonials", icon: Building, description: "How you work, case studies", type: "dynamic" },
  ],
  repair: [
    { id: "services", label: "Repair Services", icon: Star, description: "What you fix, pricing", type: "dynamic" },
    { id: "plans", label: "Pricing & Warranty", icon: FileText, description: "Service charges, warranty terms", type: "dynamic" },
    { id: "facilities", label: "Brands & Service Area", icon: Building, description: "Supported brands, pickup/drop", type: "dynamic" },
    { id: "timings", label: "Turnaround & Timing", icon: Clock, description: "Repair time, working hours", type: "dynamic" },
  ],
  retail: [
    { id: "services", label: "Products & Categories", icon: Star, description: "What you sell, brands", type: "dynamic" },
    { id: "plans", label: "Offers & Deals", icon: FileText, description: "Discounts, seasonal sales", type: "dynamic" },
    { id: "facilities", label: "Store Policies", icon: Building, description: "Returns, delivery, payment", type: "dynamic" },
    { id: "timings", label: "Store Hours", icon: Clock, description: "Opening hours, holidays", type: "dynamic" },
  ],
  agency: [
    { id: "services", label: "Services", icon: Star, description: "SEO, ads, design, dev, etc.", type: "dynamic" },
    { id: "plans", label: "Pricing Plans", icon: FileText, description: "Packages, retainers, custom", type: "dynamic" },
    { id: "trainers", label: "Team", icon: Users, description: "Experts, portfolio, roles", type: "dynamic" },
    { id: "facilities", label: "Portfolio & Process", icon: Building, description: "Case studies, industries, tech", type: "dynamic" },
  ],
  fitness: [
    { id: "plans", label: "Membership Plans", icon: Star, description: "Subscriptions & pricing", type: "dynamic" },
    { id: "services", label: "Programs", icon: Dumbbell, description: "Workout programs & classes", type: "dynamic" },
    { id: "trainers", label: "Coaches", icon: Users, description: "Fitness coaches & diet experts", type: "dynamic" },
    { id: "timings", label: "Batch Timings", icon: Clock, description: "Slots & availability", type: "dynamic" },
    { id: "offers", label: "Offers & Trials", icon: Star, description: "Free sessions, discounts", type: "dynamic" },
  ],
  other: [
    { id: "services", label: "Services", icon: Star, description: "What you offer", type: "dynamic" },
    { id: "plans", label: "Pricing", icon: FileText, description: "Your pricing", type: "dynamic" },
    { id: "trainers", label: "Team", icon: Users, description: "Your team members", type: "dynamic" },
    { id: "facilities", label: "Facilities & Info", icon: Building, description: "Additional details", type: "dynamic" },
  ],
};

// Business-type labels (placeholders for each section)
const TYPE_LABELS: Record<string, Record<string, { title: string; addLabel: string; namePlaceholder: string; pricePlaceholder: string; descPlaceholder: string }>> = {
  gym: { services: { title: "Classes & Programs", addLabel: "Add Class", namePlaceholder: "e.g. Zumba, HIIT, Yoga", pricePlaceholder: "₹500/session", descPlaceholder: "Schedule, level, duration" }, plans: { title: "Membership Plans", addLabel: "Add Plan", namePlaceholder: "e.g. Basic, Pro, Premium", pricePlaceholder: "₹1500/month", descPlaceholder: "" }, trainers: { title: "Trainers", addLabel: "Add Trainer", namePlaceholder: "Trainer name", pricePlaceholder: "₹2000/session", descPlaceholder: "Specialization, experience" }, facilities: { title: "Facilities", addLabel: "Add Facility", namePlaceholder: "e.g. AC Gym, Steam Room", pricePlaceholder: "", descPlaceholder: "Details" } },
  fitness: { services: { title: "Programs", addLabel: "Add Program", namePlaceholder: "e.g. Weight Loss, HIIT", pricePlaceholder: "₹3000/month", descPlaceholder: "Details" }, plans: { title: "Membership", addLabel: "Add Plan", namePlaceholder: "Plan name", pricePlaceholder: "₹2000/month", descPlaceholder: "" }, trainers: { title: "Coaches", addLabel: "Add Coach", namePlaceholder: "Coach name", pricePlaceholder: "₹1500/session", descPlaceholder: "Specialization" } },
  salon: { services: { title: "Services & Pricing", addLabel: "Add Service", namePlaceholder: "e.g. Haircut, Facial, Bridal", pricePlaceholder: "₹500", descPlaceholder: "Duration, details" }, plans: { title: "Packages", addLabel: "Add Package", namePlaceholder: "e.g. Bridal Package", pricePlaceholder: "₹5000", descPlaceholder: "" }, trainers: { title: "Stylists", addLabel: "Add Stylist", namePlaceholder: "Stylist name", pricePlaceholder: "", descPlaceholder: "Specialization" }, facilities: { title: "Gallery", addLabel: "Add Item", namePlaceholder: "e.g. Before/After", pricePlaceholder: "", descPlaceholder: "Description" } },
  spa: { services: { title: "Therapies", addLabel: "Add Therapy", namePlaceholder: "e.g. Swedish Massage, Facial", pricePlaceholder: "₹2000", descPlaceholder: "Duration" }, plans: { title: "Packages", addLabel: "Add Package", namePlaceholder: "e.g. Relaxation Package", pricePlaceholder: "₹5000", descPlaceholder: "" }, trainers: { title: "Therapists", addLabel: "Add Therapist", namePlaceholder: "Name", pricePlaceholder: "", descPlaceholder: "Specialization" } },
  restaurant: { services: { title: "Menu Items", addLabel: "Add Item", namePlaceholder: "e.g. Butter Chicken, Paneer Tikka", pricePlaceholder: "₹350", descPlaceholder: "Category, veg/non-veg" }, plans: { title: "Combos & Offers", addLabel: "Add Combo", namePlaceholder: "e.g. Family Meal", pricePlaceholder: "₹599", descPlaceholder: "" }, facilities: { title: "Delivery & Dine-in", addLabel: "Add Info", namePlaceholder: "e.g. Free Delivery, AC Seating", pricePlaceholder: "", descPlaceholder: "Details" } },
  cafe: { services: { title: "Menu", addLabel: "Add Item", namePlaceholder: "e.g. Cappuccino, Sandwich", pricePlaceholder: "₹200", descPlaceholder: "Category" }, plans: { title: "Offers", addLabel: "Add Offer", namePlaceholder: "e.g. Happy Hour", pricePlaceholder: "₹299", descPlaceholder: "" }, facilities: { title: "Ambience", addLabel: "Add Info", namePlaceholder: "e.g. WiFi, Outdoor Seating", pricePlaceholder: "", descPlaceholder: "Details" } },
  clinic: { services: { title: "Treatments", addLabel: "Add Treatment", namePlaceholder: "e.g. Consultation, X-Ray", pricePlaceholder: "₹500", descPlaceholder: "Duration" }, plans: { title: "Health Packages", addLabel: "Add Package", namePlaceholder: "e.g. Full Body Checkup", pricePlaceholder: "₹2500", descPlaceholder: "" }, trainers: { title: "Doctors", addLabel: "Add Doctor", namePlaceholder: "Dr. Name", pricePlaceholder: "₹800/visit", descPlaceholder: "Specialization, qualifications" }, facilities: { title: "Departments", addLabel: "Add Department", namePlaceholder: "e.g. Cardiology", pricePlaceholder: "", descPlaceholder: "Details" } },
  dental: { services: { title: "Treatments", addLabel: "Add Treatment", namePlaceholder: "e.g. Cleaning, Root Canal", pricePlaceholder: "₹1500", descPlaceholder: "Duration" }, plans: { title: "Packages", addLabel: "Add Package", namePlaceholder: "e.g. Annual Care Plan", pricePlaceholder: "₹5000/year", descPlaceholder: "" }, trainers: { title: "Dentists", addLabel: "Add Dentist", namePlaceholder: "Dr. Name", pricePlaceholder: "₹500/visit", descPlaceholder: "Specialization" } },
  real_estate: { services: { title: "Projects", addLabel: "Add Project", namePlaceholder: "e.g. Green Valley Phase 2", pricePlaceholder: "₹45L onwards", descPlaceholder: "Location, type, possession" }, plans: { title: "Price Sheets", addLabel: "Add Configuration", namePlaceholder: "e.g. 2BHK, 3BHK", pricePlaceholder: "₹55,00,000", descPlaceholder: "" }, facilities: { title: "Amenities", addLabel: "Add Amenity", namePlaceholder: "e.g. Swimming Pool", pricePlaceholder: "", descPlaceholder: "Details" } },
  coaching: { services: { title: "Courses", addLabel: "Add Course", namePlaceholder: "e.g. JEE Prep, NEET", pricePlaceholder: "₹25000/year", descPlaceholder: "Duration, batch" }, plans: { title: "Fee Structure", addLabel: "Add Fee Plan", namePlaceholder: "e.g. Weekend Batch", pricePlaceholder: "₹15000", descPlaceholder: "" }, trainers: { title: "Faculty", addLabel: "Add Faculty", namePlaceholder: "Teacher name", pricePlaceholder: "", descPlaceholder: "Subject, experience" }, facilities: { title: "Facilities", addLabel: "Add Facility", namePlaceholder: "e.g. Computer Lab", pricePlaceholder: "", descPlaceholder: "Details" } },
  school: { admissions: { title: "Admissions", addLabel: "Add Info", namePlaceholder: "e.g. Admission Open for 2025-26", pricePlaceholder: "", descPlaceholder: "Process, dates, eligibility, age criteria" }, services: { title: "Classes Offered", addLabel: "Add Class", namePlaceholder: "e.g. Nursery, KG, Class I–XII", pricePlaceholder: "", descPlaceholder: "Streams (Science/Commerce/Arts), sections" }, plans: { title: "Fee Structure", addLabel: "Add Fee", namePlaceholder: "e.g. Admission Fee, Tuition Fee", pricePlaceholder: "₹25000/year", descPlaceholder: "Annual/monthly, installments" }, documents: { title: "Documents Required", addLabel: "Add Document", namePlaceholder: "e.g. Birth Certificate, Transfer Certificate", pricePlaceholder: "", descPlaceholder: "Details, format" }, trainers: { title: "Faculty", addLabel: "Add Faculty", namePlaceholder: "e.g. Principal, Vice Principal, Teacher", pricePlaceholder: "", descPlaceholder: "Designation, qualifications" }, facilities: { title: "Facilities", addLabel: "Add Facility", namePlaceholder: "e.g. Smart Classes, Science Lab, Library", pricePlaceholder: "", descPlaceholder: "Details" }, transport: { title: "Transport", addLabel: "Add Route", namePlaceholder: "e.g. Route 1 — Sector 15 to School", pricePlaceholder: "₹2000/month", descPlaceholder: "Pickup areas, bus availability" }, uniform: { title: "Uniform", addLabel: "Add Uniform", namePlaceholder: "e.g. Summer Uniform, Winter Uniform", pricePlaceholder: "₹1500", descPlaceholder: "Details, where to buy" } },
  consultancy: { services: { title: "Services", addLabel: "Add Service", namePlaceholder: "e.g. Tax Filing, Audit", pricePlaceholder: "₹5000", descPlaceholder: "Details" }, plans: { title: "Packages", addLabel: "Add Package", namePlaceholder: "e.g. Annual Retainer", pricePlaceholder: "₹50000/year", descPlaceholder: "" }, trainers: { title: "Team", addLabel: "Add Member", namePlaceholder: "Name", pricePlaceholder: "", descPlaceholder: "Role, expertise" } },
  repair: { services: { title: "Repair Services", addLabel: "Add Service", namePlaceholder: "e.g. Screen Repair, AC Service", pricePlaceholder: "₹500", descPlaceholder: "Turnaround time" }, plans: { title: "Pricing", addLabel: "Add Price", namePlaceholder: "e.g. Basic Service, Premium", pricePlaceholder: "₹1000", descPlaceholder: "" }, facilities: { title: "Brands", addLabel: "Add Brand", namePlaceholder: "e.g. Samsung, LG", pricePlaceholder: "", descPlaceholder: "Warranty info" } },
  retail: { services: { title: "Products", addLabel: "Add Product", namePlaceholder: "e.g. iPhone 15, T-Shirt", pricePlaceholder: "₹999", descPlaceholder: "Category, brand" }, plans: { title: "Offers", addLabel: "Add Offer", namePlaceholder: "e.g. Buy 2 Get 1", pricePlaceholder: "", descPlaceholder: "Terms" }, facilities: { title: "Store Info", addLabel: "Add Info", namePlaceholder: "e.g. Free Delivery, Returns", pricePlaceholder: "", descPlaceholder: "Policy details" } },
  agency: { services: { title: "Services", addLabel: "Add Service", namePlaceholder: "e.g. SEO, Social Media", pricePlaceholder: "₹15000/month", descPlaceholder: "Deliverables" }, plans: { title: "Pricing Plans", addLabel: "Add Plan", namePlaceholder: "e.g. Starter, Growth", pricePlaceholder: "₹25000/month", descPlaceholder: "" }, trainers: { title: "Team", addLabel: "Add Member", namePlaceholder: "Name", pricePlaceholder: "", descPlaceholder: "Role, portfolio" } },
  other: { services: { title: "Services", addLabel: "Add Service", namePlaceholder: "Service name", pricePlaceholder: "Price", descPlaceholder: "Description" }, plans: { title: "Pricing", addLabel: "Add Plan", namePlaceholder: "Plan name", pricePlaceholder: "Price", descPlaceholder: "" } },
};


const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// ─── Component ──────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [score, setScore] = useState(0);
  const [scoreSections, setScoreSections] = useState<ScoreSection[]>([]);
  const [noBusiness, setNoBusiness] = useState(false);

  // Data states
  const [profile, setProfile] = useState({ name: "", owner_name: "", type: "other", description: "" });
  const [contact, setContact] = useState({ phone: "", whatsapp_number: "", email: "", website: "" });
  const [location, setLocation] = useState({ address: "", city: "", state: "", google_maps_link: "" });
  const [hours, setHours] = useState<HoursData>({});
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [trainers, setTrainers] = useState<ServiceItem[]>([]); // Reuse ServiceItem shape
  const [facilities, setFacilities] = useState<ServiceItem[]>([]);
  const [admissions, setAdmissions] = useState<ServiceItem[]>([]);
  const [documents, setDocuments] = useState<ServiceItem[]>([]);
  const [transport, setTransport] = useState<ServiceItem[]>([]);
  const [uniform, setUniform] = useState<ServiceItem[]>([]);
  const [timings, setTimings] = useState<ServiceItem[]>([]);
  const [offers, setOffers] = useState<ServiceItem[]>([]);
  const [activities, setActivities] = useState<ServiceItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Dynamic sections based on business type
  const allSections = useMemo(() => {
    const typeSections = BUSINESS_TYPE_SECTIONS[profile.type] || BUSINESS_TYPE_SECTIONS.other;
    return [...COMMON_SECTIONS, ...typeSections, ...COMMON_BOTTOM];
  }, [profile.type]);

  const typeLabels = useMemo(() => {
    return TYPE_LABELS[profile.type] || TYPE_LABELS.other;
  }, [profile.type]);

  useEffect(() => {
    Promise.all([
      fetch("/api/knowledge").then(async (r) => {
        const data = await r.json();
        return { ...data, _ok: r.ok };
      }),
      fetch("/api/knowledge/score").then((r) => r.json()),
    ]).then(([knowledge, scoreData]) => {
      console.log("[Knowledge Base] API response ok:", knowledge._ok, "| Has business:", !!knowledge.business);

      if (!knowledge._ok && !knowledge.business) {
        console.log("[Knowledge Base] Banner State: noBusiness");
        setNoBusiness(true);
        setScore(scoreData.score || 0);
        setScoreSections(scoreData.sections || []);
        setLoading(false);
        return;
      }

      // Business exists — load data
      setNoBusiness(false);
      if (knowledge.business) {
        const b = knowledge.business;
        setProfile({ name: b.name || "", owner_name: b.owner_name || "", type: b.type || "other", description: b.description || "" });
        setContact({ phone: b.phone || "", whatsapp_number: b.whatsapp_number || "", email: b.email || "", website: b.website || "" });
        setLocation({ address: b.address || "", city: b.city || "", state: b.state || "", google_maps_link: b.google_maps_link || "" });
        if (b.business_hours) setHours(b.business_hours);
      }

      // Load sections — supports both new format (knowledge.sections) and legacy (top-level keys)
      const sec = knowledge.sections || {};
      const getItems = (key: string): Array<Record<string, string>> => {
        return sec[key] || knowledge[key] || [];
      };

      const svcItems = getItems("services");
      if (svcItems.length) setServices(svcItems.map((s: Record<string, string>) => ({ name: s.name || "", description: s.description || "", price: s.price || "", duration: s.duration || "" })));

      const trainerItems = getItems("trainers");
      if (trainerItems.length) setTrainers(trainerItems.map((s: Record<string, string>) => ({ name: s.name || "", description: s.description || "", price: s.price || "", duration: s.duration || "" })));

      const facilityItems = getItems("facilities");
      if (facilityItems.length) setFacilities(facilityItems.map((s: Record<string, string>) => ({ name: s.name || "", description: s.description || "", price: s.price || "", duration: s.duration || "" })));

      const admissionItems = getItems("admissions");
      if (admissionItems.length) setAdmissions(admissionItems.map((s: Record<string, string>) => ({ name: s.name || "", description: s.description || "", price: s.price || "", duration: s.duration || "" })));

      const documentItems = getItems("documents");
      if (documentItems.length) setDocuments(documentItems.map((s: Record<string, string>) => ({ name: s.name || "", description: s.description || "", price: s.price || "", duration: s.duration || "" })));

      const transportItems = getItems("transport");
      if (transportItems.length) setTransport(transportItems.map((s: Record<string, string>) => ({ name: s.name || "", description: s.description || "", price: s.price || "", duration: s.duration || "" })));

      const uniformItems = getItems("uniform");
      if (uniformItems.length) setUniform(uniformItems.map((s: Record<string, string>) => ({ name: s.name || "", description: s.description || "", price: s.price || "", duration: s.duration || "" })));

      const timingsItems = getItems("timings");
      if (timingsItems.length) setTimings(timingsItems.map((s: Record<string, string>) => ({ name: s.name || "", description: s.description || "", price: s.price || "", duration: s.duration || "" })));

      const offersItems = getItems("offers");
      if (offersItems.length) setOffers(offersItems.map((s: Record<string, string>) => ({ name: s.name || "", description: s.description || "", price: s.price || "", duration: s.duration || "" })));

      const activitiesItems = getItems("activities");
      if (activitiesItems.length) setActivities(activitiesItems.map((s: Record<string, string>) => ({ name: s.name || "", description: s.description || "", price: s.price || "", duration: s.duration || "" })));

      const planItems = getItems("plans");
      if (planItems.length) setPlans(planItems.map((p: Record<string, unknown>) => ({ name: (p.name as string) || "", price: (p.price as string) || "", duration: (p.duration as string) || "month", features: (p.features as string[]) || [], is_popular: (p.is_popular as boolean) || false })));

      const faqItems = getItems("faqs");
      if (faqItems.length) setFaqs(faqItems.map((f: Record<string, string>) => ({ question: f.question || "", answer: f.answer || "", category: f.category || "general" })));

      setScore(scoreData.score || 0);
      setScoreSections(scoreData.sections || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function saveSection(section: string) {
    setSaving(section);
    setErrorMsg(null);
    setSuccessMsg(null);

    let payload: { section: string; data: unknown };
    switch (section) {
      case "profile":
      case "contact":
      case "location":
        payload = { section: "profile", data: { ...profile, ...contact, ...location } };
        break;
      case "hours":
        payload = { section: "hours", data: hours };
        break;
      case "services":
        payload = { section: "services", data: services.filter((s) => s.name.trim()) };
        break;
      case "plans":
        payload = { section: "plans", data: plans.filter((p) => p.name.trim()) };
        break;
      case "trainers":
        payload = { section: "trainers", data: trainers.filter((t) => t.name.trim()) };
        break;
      case "facilities":
        payload = { section: "facilities", data: facilities.filter((f) => f.name.trim()) };
        break;
      case "admissions":
        payload = { section: "admissions", data: admissions.filter((a) => a.name.trim()) };
        break;
      case "documents":
        payload = { section: "documents", data: documents.filter((d) => d.name.trim()) };
        break;
      case "transport":
        payload = { section: "transport", data: transport.filter((t) => t.name.trim()) };
        break;
      case "uniform":
        payload = { section: "uniform", data: uniform.filter((u) => u.name.trim()) };
        break;
      case "timings":
        payload = { section: "timings", data: timings.filter((t) => t.name.trim()) };
        break;
      case "offers":
        payload = { section: "offers", data: offers.filter((o) => o.name.trim()) };
        break;
      case "activities":
        payload = { section: "activities", data: activities.filter((a) => a.name.trim()) };
        break;
      case "faqs":
        payload = { section: "faqs", data: faqs.filter((f) => f.question.trim()) };
        break;
      case "notes":
        payload = { section: "notes", data: additionalNotes };
        break;
      default:
        payload = { section: "profile", data: {} };
    }

    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Save failed");
      }
      const sectionDef = allSections.find((s) => s.id === section);
      setSuccessMsg(`${sectionDef?.label || section} saved!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      // Refresh score
      const scoreRes = await fetch("/api/knowledge/score");
      if (scoreRes.ok) {
        const scoreData = await scoreRes.json();
        setScore(scoreData.score || 0);
        setScoreSections(scoreData.sections || []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save. Please try again.";
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    }
    setSaving(null);
  }

  // Hours helpers
  function initHours() {
    const defaultHours: HoursData = {};
    DAY_KEYS.forEach((d) => { defaultHours[d] = { open: "09:00", close: "21:00", closed: false }; });
    defaultHours.sun = { open: "09:00", close: "21:00", closed: true };
    setHours(defaultHours);
  }
  function updateHour(day: string, field: keyof HoursDay, value: string | boolean) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  }

  // Generic list helpers
  function addItem(setter: React.Dispatch<React.SetStateAction<ServiceItem[]>>) {
    setter((prev) => [...prev, { name: "", description: "", price: "", duration: "" }]);
  }
  function removeItem(setter: React.Dispatch<React.SetStateAction<ServiceItem[]>>, i: number) {
    setter((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateItem(setter: React.Dispatch<React.SetStateAction<ServiceItem[]>>, i: number, field: keyof ServiceItem, value: string) {
    setter((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  // Plan helpers
  function addPlan() { setPlans((prev) => [...prev, { name: "", price: "", duration: "month", features: [], is_popular: false }]); }
  function removePlan(i: number) { setPlans((prev) => prev.filter((_, idx) => idx !== i)); }
  function updatePlan(i: number, field: string, value: unknown) {
    setPlans((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }

  // FAQ helpers
  function addFaq() { setFaqs((prev) => [...prev, { question: "", answer: "", category: "general" }]); }
  function removeFaq(i: number) { setFaqs((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateFaq(i: number, field: keyof FaqItem, value: string) {
    setFaqs((prev) => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f));
  }

  // Get the right state/setter for a dynamic section
  function getListForSection(sectionId: string): { items: ServiceItem[]; setter: React.Dispatch<React.SetStateAction<ServiceItem[]>> } {
    switch (sectionId) {
      case "services": return { items: services, setter: setServices };
      case "trainers": return { items: trainers, setter: setTrainers };
      case "facilities": return { items: facilities, setter: setFacilities };
      case "admissions": return { items: admissions, setter: setAdmissions };
      case "documents": return { items: documents, setter: setDocuments };
      case "transport": return { items: transport, setter: setTransport };
      case "uniform": return { items: uniform, setter: setUniform };
      case "timings": return { items: timings, setter: setTimings };
      case "offers": return { items: offers, setter: setOffers };
      case "activities": return { items: activities, setter: setActivities };
      default: return { items: services, setter: setServices };
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (noBusiness && score === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Complete Your Setup</h2>
          <p className="text-sm text-text-muted mb-6">
            Finish onboarding to unlock the Knowledge Base. This is where you train your AI assistant with your business information.
          </p>
          <a href="/onboarding">
            <Button size="lg">Start Onboarding</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Knowledge Base" description={`Tailored for your ${({ gym: "Gym", fitness: "Fitness", salon: "Salon", spa: "Spa", clinic: "Clinic", dental: "Dental", restaurant: "Restaurant", cafe: "Cafe", real_estate: "Real Estate", coaching: "Coaching", school: "School", consultancy: "Consultancy", repair: "Repair", retail: "Retail", agency: "Agency" } as Record<string, string>)[profile.type] || ""} business`} />

      <AnimatePresence>
        {successMsg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{successMsg}</motion.div>}
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{errorMsg}</span>
              </div>
              {errorMsg.toLowerCase().includes("business") || errorMsg.toLowerCase().includes("onboarding") || errorMsg.toLowerCase().includes("migration") ? (
                <a href="/onboarding" className="text-xs font-medium text-red-700 underline hover:text-red-900 whitespace-nowrap ml-3">Complete Setup →</a>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Setup Progress Banner (when incomplete) */}
      {score > 0 && score < 80 && !loading && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">Setup {score}% complete</p>
              <p className="text-xs text-amber-700 mt-0.5">Complete remaining sections to improve AI responses</p>
            </div>
            <Button size="sm" onClick={() => {
              const firstIncomplete = scoreSections.find((s) => s.score === 0);
              if (firstIncomplete) {
                const sectionMap: Record<string, string> = { "Services": "services", "Pricing/Plans": "plans", "FAQs": "faqs", "Description": "profile", "Contact Info": "contact", "Location": "location", "Working Hours": "hours", "Business Profile": "profile" };
                const target = sectionMap[firstIncomplete.name];
                if (firstIncomplete.name === "Media") window.location.assign("/media");
                else if (firstIncomplete.name === "WhatsApp") window.location.assign("/settings");
                else if (target) setActiveSection(target);
                else setActiveSection("services");
              }
            }}>Continue Setup</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {scoreSections.filter((s) => s.score === 100).map((s) => (
              <span key={s.name} className="text-[11px] text-emerald-700 flex items-center gap-1">✓ {s.name}</span>
            ))}
            {scoreSections.filter((s) => s.score < 100).map((s) => {
              const sectionMap: Record<string, string> = { "Services": "services", "Pricing/Plans": "plans", "FAQs": "faqs", "Description": "profile", "Contact Info": "contact", "Location": "location", "Working Hours": "hours", "Business Profile": "profile" };
              return (
                <button key={s.name} onClick={() => {
                  if (s.name === "Media") window.location.assign("/media");
                  else if (s.name === "WhatsApp") window.location.assign("/settings");
                  else setActiveSection(sectionMap[s.name] || "services");
                }} className="text-[11px] text-amber-800 flex items-center gap-1 hover:text-amber-950 hover:underline text-left">
                  ✗ {s.name} {s.score > 0 ? `(${s.score}%)` : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Readiness Score */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold">AI Readiness</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600"}`}>{score}%</span>
            <Badge variant={score >= 80 ? "success" : score >= 50 ? "warning" : "danger"}>
              {score >= 80 ? "Ready" : score >= 50 ? "Partial" : "Incomplete"}
            </Badge>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full mb-3">
          <div className={`h-2 rounded-full transition-all duration-500 ${score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {scoreSections.map((s) => {
            const sectionMap: Record<string, string> = {
              "Business Profile": "profile", "Description": "profile", "Contact Info": "contact",
              "Location": "location", "Working Hours": "hours", "Services": "services",
              "Pricing/Plans": "plans", "FAQs": "faqs", "Media": "__media__", "WhatsApp": "__settings__",
            };
            const target = sectionMap[s.name];
            const isClickable = !!target;
            return (
              <button
                key={s.name}
                onClick={() => {
                  if (target === "__media__") window.location.assign("/media");
                  else if (target === "__settings__") window.location.assign("/settings");
                  else if (target) setActiveSection(target);
                }}
                disabled={!isClickable}
                className={`flex items-center gap-1.5 text-xs rounded-lg px-2 py-1.5 text-left transition-all ${isClickable ? "hover:bg-gray-100 cursor-pointer" : ""} ${s.score === 0 ? "hover:ring-1 hover:ring-amber-300" : ""}`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.score === 100 ? "bg-emerald-500" : s.score > 0 ? "bg-amber-500" : "bg-gray-300"}`} />
                <span className="text-text-muted truncate">{s.name}</span>
                <span className={`font-medium ml-auto ${s.score === 0 ? "text-amber-600" : ""}`}>
                  {s.score === 100 ? "✓" : s.score === 0 ? "Add →" : `${s.score}%`}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        {/* Section Navigation */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card padding="sm">
            <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold px-3 mb-1">Common</p>
            <nav className="space-y-0.5 mb-3">
              {COMMON_SECTIONS.map((sec) => (
                <button key={sec.id} onClick={() => setActiveSection(sec.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${activeSection === sec.id ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-gray-50"}`}>
                  <sec.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium">{sec.label}</span>
                </button>
              ))}
            </nav>
            <div className="border-t border-border pt-2 mb-1">
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold px-3 mb-1">
                {({ gym: "🏋️ Gym", fitness: "💪 Fitness", salon: "💇 Salon", spa: "🧖 Spa", clinic: "🏥 Clinic", dental: "🦷 Dental", restaurant: "🍽️ Restaurant", cafe: "☕ Cafe", real_estate: "🏠 Real Estate", coaching: "📚 Coaching", school: "🏫 School", consultancy: "💼 Consultancy", repair: "🔧 Repair", retail: "🛍️ Retail", agency: "📱 Agency", other: "📋 Business" } as Record<string, string>)[profile.type] || "📋 Business"}
              </p>
              <nav className="space-y-0.5">
                {(BUSINESS_TYPE_SECTIONS[profile.type] || BUSINESS_TYPE_SECTIONS.other).map((sec) => (
                  <button key={sec.id} onClick={() => setActiveSection(sec.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${activeSection === sec.id ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-gray-50"}`}>
                    <sec.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-medium">{sec.label}</span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="border-t border-border pt-2">
              <nav className="space-y-0.5">
                {COMMON_BOTTOM.map((sec) => (
                  <button key={sec.id} onClick={() => setActiveSection(sec.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${activeSection === sec.id ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-gray-50"}`}>
                    <sec.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-medium">{sec.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </Card>
        </div>

        {/* Section Content */}
        <div>

          {/* Business Details */}
          {activeSection === "profile" && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div><h3 className="text-base font-bold">Business Details</h3><p className="text-xs text-text-muted mt-0.5">Basic information about your business</p></div>
                <Button size="sm" onClick={() => saveSection("profile")} disabled={saving === "profile"}>
                  {saving === "profile" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                </Button>
              </div>
              <div className="space-y-4 max-w-lg">
                <div><label className="text-sm font-medium block mb-1.5">Business Name *</label><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
                <div><label className="text-sm font-medium block mb-1.5">Owner Name</label><input value={profile.owner_name} onChange={(e) => setProfile({ ...profile, owner_name: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
                <div><label className="text-sm font-medium block mb-1.5">Business Type</label>
                  <select value={profile.type} onChange={(e) => { setProfile({ ...profile, type: e.target.value }); setActiveSection("profile"); }} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value="school">🏫 School</option>
                    <option value="gym">🏋️ Gym</option>
                    <option value="fitness">💪 Fitness Studio</option>
                    <option value="salon">💇 Salon</option>
                    <option value="spa">🧖 Spa</option>
                    <option value="clinic">🏥 Clinic</option>
                    <option value="dental">🦷 Dental Clinic</option>
                    <option value="restaurant">🍽️ Restaurant</option>
                    <option value="cafe">☕ Cafe</option>
                    <option value="real_estate">🏠 Real Estate</option>
                    <option value="coaching">📚 Coaching Institute</option>
                    <option value="consultancy">💼 Consultancy</option>
                    <option value="repair">🔧 Repair Services</option>
                    <option value="retail">🛍️ Retail Store</option>
                    <option value="agency">📱 Agency</option>
                    <option value="other">📋 Other</option>
                  </select>
                  <p className="text-xs text-text-muted mt-1.5">This determines which sections appear in your knowledge base</p>
                </div>
                <div><label className="text-sm font-medium block mb-1.5">Description</label><textarea value={profile.description} onChange={(e) => setProfile({ ...profile, description: e.target.value })} rows={3} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" placeholder={({ school: "e.g. CBSE-affiliated school offering Nursery to Class XII with modern facilities...", gym: "e.g. Full-service gym with personal training, group classes, and cardio zone...", salon: "e.g. Premium unisex salon offering haircuts, coloring, facials, and bridal packages...", clinic: "e.g. Multi-specialty clinic with experienced doctors and diagnostic services...", coaching: "e.g. Coaching center for JEE, NEET, and board exam preparation...", restaurant: "e.g. Family restaurant serving North Indian and Chinese cuisine...", real_estate: "e.g. Premium residential projects in prime locations with modern amenities..." } as Record<string, string>)[profile.type] || "Brief description of your business..."} /></div>
              </div>
            </Card>
          )}

          {/* Contact */}
          {activeSection === "contact" && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div><h3 className="text-base font-bold">Contact Information</h3></div>
                <Button size="sm" onClick={() => saveSection("contact")} disabled={saving === "contact"}>
                  {saving === "contact" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                </Button>
              </div>
              <div className="space-y-4 max-w-lg">
                <div><label className="text-sm font-medium block mb-1.5">Phone</label><input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="+91 98765 43210" /></div>
                <div><label className="text-sm font-medium block mb-1.5">WhatsApp</label><input value={contact.whatsapp_number} onChange={(e) => setContact({ ...contact, whatsapp_number: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="+91 98765 43210" /></div>
                <div><label className="text-sm font-medium block mb-1.5">Email</label><input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="info@business.com" /></div>
                <div><label className="text-sm font-medium block mb-1.5">Website</label><input value={contact.website} onChange={(e) => setContact({ ...contact, website: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="https://..." /></div>
              </div>
            </Card>
          )}

          {/* Location */}
          {activeSection === "location" && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div><h3 className="text-base font-bold">Location</h3></div>
                <Button size="sm" onClick={() => saveSection("location")} disabled={saving === "location"}>
                  {saving === "location" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                </Button>
              </div>
              <div className="space-y-4 max-w-lg">
                <div><label className="text-sm font-medium block mb-1.5">Full Address</label><textarea value={location.address} onChange={(e) => setLocation({ ...location, address: e.target.value })} rows={2} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium block mb-1.5">City</label><input value={location.city} onChange={(e) => setLocation({ ...location, city: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
                  <div><label className="text-sm font-medium block mb-1.5">State</label><input value={location.state} onChange={(e) => setLocation({ ...location, state: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
                </div>
                <div><label className="text-sm font-medium block mb-1.5">Google Maps Link</label><input value={location.google_maps_link} onChange={(e) => setLocation({ ...location, google_maps_link: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="https://maps.google.com/..." /></div>
              </div>
            </Card>
          )}

          {/* Working Hours */}
          {activeSection === "hours" && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div><h3 className="text-base font-bold">Working Hours</h3></div>
                <div className="flex gap-2">
                  {Object.keys(hours).length === 0 && <Button size="sm" variant="secondary" onClick={initHours}>Set Default</Button>}
                  <Button size="sm" onClick={() => saveSection("hours")} disabled={saving === "hours"}>
                    {saving === "hours" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                  </Button>
                </div>
              </div>
              {Object.keys(hours).length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 text-text-muted/20 mx-auto mb-3" />
                  <p className="text-sm text-text-muted mb-3">No hours set</p>
                  <Button variant="secondary" onClick={initHours}>Set Default Hours (9 AM – 9 PM)</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {DAY_KEYS.map((day, i) => (
                    <div key={day} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <span className="text-sm font-medium w-20">{DAY_NAMES[i]}</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!hours[day]?.closed} onChange={(e) => updateHour(day, "closed", !e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20" />
                        <span className="text-xs text-text-muted w-10">{hours[day]?.closed ? "Closed" : "Open"}</span>
                      </label>
                      {!hours[day]?.closed && (
                        <div className="flex items-center gap-2 ml-auto">
                          <input type="time" value={hours[day]?.open || "09:00"} onChange={(e) => updateHour(day, "open", e.target.value)} className="px-2 py-1.5 text-xs rounded border border-border" />
                          <span className="text-xs text-text-muted">to</span>
                          <input type="time" value={hours[day]?.close || "21:00"} onChange={(e) => updateHour(day, "close", e.target.value)} className="px-2 py-1.5 text-xs rounded border border-border" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Dynamic List Sections: services, trainers, facilities, admissions, documents, transport, uniform, timings, offers, activities */}
          {(activeSection === "services" || activeSection === "trainers" || activeSection === "facilities" || activeSection === "admissions" || activeSection === "documents" || activeSection === "transport" || activeSection === "uniform" || activeSection === "timings" || activeSection === "offers" || activeSection === "activities") && (
            <Card>
              {(() => {
                const labels = typeLabels[activeSection] || { title: activeSection, addLabel: "Add", namePlaceholder: "Name", pricePlaceholder: "Price", descPlaceholder: "Description" };
                const { items, setter } = getListForSection(activeSection);
                return (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <div><h3 className="text-base font-bold">{labels.title}</h3><p className="text-xs text-text-muted mt-0.5">{items.length} items</p></div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => addItem(setter)}><Plus className="w-3.5 h-3.5" />{labels.addLabel}</Button>
                        <Button size="sm" onClick={() => saveSection(activeSection)} disabled={saving === activeSection}>
                          {saving === activeSection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                        </Button>
                      </div>
                    </div>
                    {items.length === 0 ? (
                      <div className="text-center py-8">
                        <Plus className="w-10 h-10 text-text-muted/20 mx-auto mb-3" />
                        <p className="text-sm text-text-muted mb-3">No items added yet</p>
                        <Button variant="secondary" onClick={() => addItem(setter)}><Plus className="w-4 h-4" />{labels.addLabel}</Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {items.map((item, i) => (
                          <div key={i} className="p-4 rounded-lg border border-border bg-gray-50/50">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input value={item.name} onChange={(e) => updateItem(setter, i, "name", e.target.value)} placeholder={labels.namePlaceholder} className="px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                  {labels.pricePlaceholder && (
                                    <input value={item.price} onChange={(e) => updateItem(setter, i, "price", e.target.value)} placeholder={labels.pricePlaceholder} className="px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                  )}
                                </div>
                                {labels.descPlaceholder && (
                                  <input value={item.description} onChange={(e) => updateItem(setter, i, "description", e.target.value)} placeholder={labels.descPlaceholder} className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                )}
                              </div>
                              <button onClick={() => removeItem(setter, i)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        ))}
                        <Button variant="secondary" size="sm" onClick={() => addItem(setter)} className="w-full"><Plus className="w-3.5 h-3.5" />{labels.addLabel}</Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </Card>
          )}

          {/* Plans Section */}
          {activeSection === "plans" && (
            <Card>
              {(() => {
                const labels = typeLabels.plans || { title: "Pricing", addLabel: "Add Plan", namePlaceholder: "Plan name", pricePlaceholder: "Price", descPlaceholder: "" };
                return (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <div><h3 className="text-base font-bold">{labels.title}</h3><p className="text-xs text-text-muted mt-0.5">{plans.length} plans</p></div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={addPlan}><Plus className="w-3.5 h-3.5" />{labels.addLabel}</Button>
                        <Button size="sm" onClick={() => saveSection("plans")} disabled={saving === "plans"}>
                          {saving === "plans" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                        </Button>
                      </div>
                    </div>
                    {plans.length === 0 ? (
                      <div className="text-center py-8">
                        <Star className="w-10 h-10 text-text-muted/20 mx-auto mb-3" />
                        <p className="text-sm text-text-muted mb-3">No plans added yet</p>
                        <Button variant="secondary" onClick={addPlan}><Plus className="w-4 h-4" />{labels.addLabel}</Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {plans.map((plan, i) => (
                          <div key={i} className={`p-4 rounded-lg border ${plan.is_popular ? "border-primary bg-primary/5" : "border-border bg-gray-50/50"}`}>
                            <div className="flex items-start gap-2">
                              <div className="flex-1 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <input value={plan.name} onChange={(e) => updatePlan(i, "name", e.target.value)} placeholder={labels.namePlaceholder} className="px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                  <input value={plan.price} onChange={(e) => updatePlan(i, "price", e.target.value)} placeholder={labels.pricePlaceholder} className="px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                  <select value={plan.duration} onChange={(e) => updatePlan(i, "duration", e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                    <option value="month">Per Month</option><option value="quarter">Per Quarter</option><option value="year">Per Year</option><option value="session">Per Session</option><option value="one-time">One Time</option>
                                  </select>
                                </div>
                                <input value={plan.features.join(", ")} onChange={(e) => updatePlan(i, "features", e.target.value.split(",").map((f: string) => f.trim()).filter(Boolean))} placeholder="Features (comma separated)" className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={plan.is_popular} onChange={(e) => updatePlan(i, "is_popular", e.target.checked)} className="w-4 h-4 rounded border-border text-primary" />
                                  <span className="text-xs text-text-muted">⭐ Most Popular</span>
                                </label>
                              </div>
                              <button onClick={() => removePlan(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        ))}
                        <Button variant="secondary" size="sm" onClick={addPlan} className="w-full"><Plus className="w-3.5 h-3.5" />{labels.addLabel}</Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </Card>
          )}

          {/* FAQs */}
          {activeSection === "faqs" && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div><h3 className="text-base font-bold">Frequently Asked Questions</h3><p className="text-xs text-text-muted mt-0.5">{faqs.length} FAQs</p></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={addFaq}><Plus className="w-3.5 h-3.5" />Add</Button>
                  <Button size="sm" onClick={() => saveSection("faqs")} disabled={saving === "faqs"}>
                    {saving === "faqs" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                  </Button>
                </div>
              </div>
              {faqs.length === 0 ? (
                <div className="text-center py-8">
                  <HelpCircle className="w-10 h-10 text-text-muted/20 mx-auto mb-3" />
                  <p className="text-sm text-text-muted mb-3">Add common questions your customers ask</p>
                  <Button variant="secondary" onClick={addFaq}><Plus className="w-4 h-4" />Add FAQ</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {faqs.map((faq, i) => (
                    <div key={i} className="p-4 rounded-lg border border-border bg-gray-50/50">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <input value={faq.question} onChange={(e) => updateFaq(i, "question", e.target.value)} placeholder="Question" className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium" />
                          <textarea value={faq.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} placeholder="Answer" rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
                        </div>
                        <button onClick={() => removeFaq(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={addFaq} className="w-full"><Plus className="w-3.5 h-3.5" />Add FAQ</Button>
                </div>
              )}
            </Card>
          )}

          {/* Additional Notes */}
          {activeSection === "notes" && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div><h3 className="text-base font-bold">Additional Notes</h3><p className="text-xs text-text-muted mt-0.5">Extra context for AI (optional)</p></div>
                <Button size="sm" onClick={() => saveSection("notes")} disabled={saving === "notes"}>
                  {saving === "notes" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                </Button>
              </div>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                placeholder="Any extra information for the AI: current promotions, temporary changes, special policies, things not covered above..."
              />
              <p className="text-xs text-text-muted mt-2">This is secondary context. Primary knowledge should be in the structured sections above.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Info */}
      <Card className="mt-6 bg-blue-50/50 border-blue-100">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">How This Works</h4>
            <p className="text-xs text-blue-700 mt-1">
              The AI reads your structured data to answer customer questions. Sections are tailored to your business type — change it in Business Details to see different modules. Keep data complete for accurate AI responses.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
