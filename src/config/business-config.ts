/**
 * Business Type Configuration — Single Source of Truth
 *
 * All business type definitions, sections, labels, and placeholders
 * are defined here. The Knowledge Base page reads from this config.
 *
 * To add a new business type:
 * 1. Add an entry to BUSINESS_TYPES
 * 2. Done. No other files need changes.
 */

import {
  Building, Phone, MapPin, Clock, HelpCircle, BookOpen,
  Dumbbell, Scissors, UtensilsCrossed, Stethoscope, Home, StickyNote,
  Users, Image, Star, FileText,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SectionDef {
  id: string;
  label: string;
  icon: typeof Building;
  description: string;
  type: "common" | "dynamic";
}

export interface SectionLabels {
  title: string;
  addLabel: string;
  namePlaceholder: string;
  pricePlaceholder: string;
  descPlaceholder: string;
}

export interface BusinessTypeConfig {
  name: string;
  emoji: string;
  descriptionPlaceholder: string;
  sidebarLabel: string;
  sections: SectionDef[];
  labels: Record<string, SectionLabels>;
}

// ─── Common Sections (all business types) ────────────────────────────────────

export const COMMON_SECTIONS: SectionDef[] = [
  { id: "profile", label: "Business Details", icon: Building, description: "Name, owner, type", type: "common" },
  { id: "contact", label: "Contact", icon: Phone, description: "Phone, email, website", type: "common" },
  { id: "location", label: "Location", icon: MapPin, description: "Address & maps", type: "common" },
  { id: "hours", label: "Working Hours", icon: Clock, description: "Daily schedule", type: "common" },
];

export const COMMON_BOTTOM: SectionDef[] = [
  { id: "faqs", label: "FAQs", icon: HelpCircle, description: "Common questions", type: "common" },
  { id: "notes", label: "Additional Notes", icon: StickyNote, description: "Extra AI context", type: "common" },
];

// ─── Business Type Definitions ───────────────────────────────────────────────

export const BUSINESS_TYPES: Record<string, BusinessTypeConfig> = {
  school: {
    name: "School",
    emoji: "🏫",
    descriptionPlaceholder: "e.g. CBSE-affiliated school offering Nursery to Class XII with modern facilities...",
    sidebarLabel: "🏫 School",
    sections: [
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
    labels: {
      admissions: { title: "Admissions", addLabel: "Add Info", namePlaceholder: "e.g. Admission Open for 2025-26", pricePlaceholder: "", descPlaceholder: "Process, dates, eligibility, age criteria" },
      services: { title: "Classes Offered", addLabel: "Add Class", namePlaceholder: "e.g. Nursery, KG, Class I–XII", pricePlaceholder: "", descPlaceholder: "Streams, sections, medium" },
      plans: { title: "Fee Structure", addLabel: "Add Fee", namePlaceholder: "e.g. Tuition Fee, Transport Fee", pricePlaceholder: "₹25000/year", descPlaceholder: "Annual/monthly, installments" },
      documents: { title: "Documents Required", addLabel: "Add Document", namePlaceholder: "e.g. Birth Certificate, TC", pricePlaceholder: "", descPlaceholder: "Format, where to get" },
      trainers: { title: "Faculty", addLabel: "Add Faculty", namePlaceholder: "e.g. Mrs. Sharma — Principal", pricePlaceholder: "", descPlaceholder: "Designation, qualifications" },
      facilities: { title: "Facilities", addLabel: "Add Facility", namePlaceholder: "e.g. Smart Classes, Science Lab", pricePlaceholder: "", descPlaceholder: "Details, capacity" },
      transport: { title: "Transport", addLabel: "Add Route", namePlaceholder: "e.g. Route 1 — Sector 15 to School", pricePlaceholder: "₹2000/month", descPlaceholder: "Pickup areas, bus number" },
      uniform: { title: "Uniform", addLabel: "Add Uniform", namePlaceholder: "e.g. Summer Uniform, Sports Kit", pricePlaceholder: "₹1500", descPlaceholder: "Details, where to buy" },
      timings: { title: "School Timings", addLabel: "Add Timing", namePlaceholder: "e.g. Classes: 8 AM – 2 PM", pricePlaceholder: "", descPlaceholder: "Office hours, half-day" },
      activities: { title: "Activities", addLabel: "Add Activity", namePlaceholder: "e.g. Cricket, Dance, Debate", pricePlaceholder: "", descPlaceholder: "Schedule, achievements" },
    },
  },
  gym: {
    name: "Gym",
    emoji: "🏋️",
    descriptionPlaceholder: "e.g. Full-service gym with personal training, group classes, and cardio zone...",
    sidebarLabel: "🏋️ Gym",
    sections: [
      { id: "plans", label: "Membership Plans", icon: Star, description: "Monthly, quarterly, annual plans", type: "dynamic" },
      { id: "services", label: "Classes & Programs", icon: Dumbbell, description: "Group classes, HIIT, yoga", type: "dynamic" },
      { id: "trainers", label: "Trainers", icon: Users, description: "Personal trainers & coaches", type: "dynamic" },
      { id: "facilities", label: "Facilities", icon: Building, description: "Equipment, AC, steam, pool", type: "dynamic" },
      { id: "timings", label: "Batch Timings", icon: Clock, description: "Morning, evening, weekend slots", type: "dynamic" },
      { id: "offers", label: "Offers & Trials", icon: Star, description: "Free trials, seasonal offers", type: "dynamic" },
    ],
    labels: {
      services: { title: "Classes & Programs", addLabel: "Add Class", namePlaceholder: "e.g. Zumba, HIIT, CrossFit", pricePlaceholder: "₹500/session", descPlaceholder: "Schedule, duration, level" },
      plans: { title: "Membership Plans", addLabel: "Add Plan", namePlaceholder: "e.g. Monthly, Quarterly, Annual", pricePlaceholder: "₹1500/month", descPlaceholder: "What's included" },
      trainers: { title: "Trainers", addLabel: "Add Trainer", namePlaceholder: "e.g. Rahul — Strength Coach", pricePlaceholder: "₹3000/month", descPlaceholder: "Specialization, certifications" },
      facilities: { title: "Facilities", addLabel: "Add Facility", namePlaceholder: "e.g. AC Hall, Steam Room, Pool", pricePlaceholder: "", descPlaceholder: "Details" },
      timings: { title: "Batch Timings", addLabel: "Add Batch", namePlaceholder: "e.g. Morning: 6–8 AM", pricePlaceholder: "", descPlaceholder: "Days, trainer" },
      offers: { title: "Offers & Trials", addLabel: "Add Offer", namePlaceholder: "e.g. Free 3-Day Trial", pricePlaceholder: "", descPlaceholder: "Validity, terms" },
    },
  },
  fitness: {
    name: "Fitness Studio",
    emoji: "💪",
    descriptionPlaceholder: "e.g. Boutique fitness studio with personal coaching and group workouts...",
    sidebarLabel: "💪 Fitness",
    sections: [
      { id: "plans", label: "Membership Plans", icon: Star, description: "Subscriptions & pricing", type: "dynamic" },
      { id: "services", label: "Programs", icon: Dumbbell, description: "Workout programs & classes", type: "dynamic" },
      { id: "trainers", label: "Coaches", icon: Users, description: "Fitness coaches & diet experts", type: "dynamic" },
      { id: "timings", label: "Batch Timings", icon: Clock, description: "Slots & availability", type: "dynamic" },
      { id: "offers", label: "Offers & Trials", icon: Star, description: "Free sessions, discounts", type: "dynamic" },
    ],
    labels: {
      services: { title: "Programs", addLabel: "Add Program", namePlaceholder: "e.g. Weight Loss, Muscle Gain", pricePlaceholder: "₹3000/month", descPlaceholder: "Duration, diet included" },
      plans: { title: "Membership", addLabel: "Add Plan", namePlaceholder: "e.g. Personal, Group, Online", pricePlaceholder: "₹2000/month", descPlaceholder: "What's included" },
      trainers: { title: "Coaches", addLabel: "Add Coach", namePlaceholder: "e.g. Priya — Yoga Instructor", pricePlaceholder: "₹1500/session", descPlaceholder: "Specialization" },
      timings: { title: "Batch Timings", addLabel: "Add Slot", namePlaceholder: "e.g. Evening: 5–7 PM", pricePlaceholder: "", descPlaceholder: "Days, capacity" },
      offers: { title: "Offers", addLabel: "Add Offer", namePlaceholder: "e.g. 1 Week Free Trial", pricePlaceholder: "", descPlaceholder: "Terms" },
    },
  },
  salon: {
    name: "Salon",
    emoji: "💇",
    descriptionPlaceholder: "e.g. Premium unisex salon offering haircuts, coloring, facials, and bridal packages...",
    sidebarLabel: "💇 Salon",
    sections: [
      { id: "services", label: "Services & Pricing", icon: Scissors, description: "Haircut, facial, bridal, etc.", type: "dynamic" },
      { id: "plans", label: "Packages", icon: Star, description: "Bridal, party, combo packages", type: "dynamic" },
      { id: "trainers", label: "Stylists", icon: Users, description: "Artists & specialists", type: "dynamic" },
      { id: "offers", label: "Offers", icon: Star, description: "Seasonal offers & discounts", type: "dynamic" },
      { id: "facilities", label: "Gallery & Policies", icon: Image, description: "Portfolio, cancellation policy", type: "dynamic" },
    ],
    labels: {
      services: { title: "Services & Pricing", addLabel: "Add Service", namePlaceholder: "e.g. Haircut, Facial, Keratin", pricePlaceholder: "₹500", descPlaceholder: "Duration, details" },
      plans: { title: "Packages", addLabel: "Add Package", namePlaceholder: "e.g. Bridal Package, Party Look", pricePlaceholder: "₹15000", descPlaceholder: "What's included" },
      trainers: { title: "Stylists", addLabel: "Add Stylist", namePlaceholder: "e.g. Neha — Senior Stylist", pricePlaceholder: "", descPlaceholder: "Specialization" },
      offers: { title: "Offers", addLabel: "Add Offer", namePlaceholder: "e.g. 20% off first visit", pricePlaceholder: "", descPlaceholder: "Validity" },
      facilities: { title: "Gallery & Policies", addLabel: "Add Info", namePlaceholder: "e.g. Cancellation Policy", pricePlaceholder: "", descPlaceholder: "Details" },
    },
  },
  spa: {
    name: "Spa",
    emoji: "🧖",
    descriptionPlaceholder: "e.g. Luxury spa offering massages, facials, and wellness therapies...",
    sidebarLabel: "🧖 Spa",
    sections: [
      { id: "services", label: "Therapies", icon: Scissors, description: "Massages, facials, body wraps", type: "dynamic" },
      { id: "plans", label: "Packages & Memberships", icon: Star, description: "Combo packages, memberships", type: "dynamic" },
      { id: "trainers", label: "Therapists", icon: Users, description: "Specialists & experience", type: "dynamic" },
      { id: "facilities", label: "Facilities", icon: Building, description: "Rooms, ambience, amenities", type: "dynamic" },
      { id: "offers", label: "Offers", icon: Star, description: "Couple spa, seasonal offers", type: "dynamic" },
    ],
    labels: {
      services: { title: "Therapies", addLabel: "Add Therapy", namePlaceholder: "e.g. Swedish Massage, Aromatherapy", pricePlaceholder: "₹2500", descPlaceholder: "Duration, benefits" },
      plans: { title: "Packages & Memberships", addLabel: "Add Package", namePlaceholder: "e.g. Couple Spa, Monthly Pass", pricePlaceholder: "₹8000", descPlaceholder: "Sessions, validity" },
      trainers: { title: "Therapists", addLabel: "Add Therapist", namePlaceholder: "e.g. Anita — Ayurveda Specialist", pricePlaceholder: "", descPlaceholder: "Certifications" },
      facilities: { title: "Facilities", addLabel: "Add Facility", namePlaceholder: "e.g. Jacuzzi, Steam, Private Suite", pricePlaceholder: "", descPlaceholder: "Details" },
      offers: { title: "Offers", addLabel: "Add Offer", namePlaceholder: "e.g. Couple Spa 20% Off", pricePlaceholder: "", descPlaceholder: "Validity" },
    },
  },
  clinic: {
    name: "Clinic",
    emoji: "🏥",
    descriptionPlaceholder: "e.g. Multi-specialty clinic with experienced doctors and diagnostic services...",
    sidebarLabel: "🏥 Clinic",
    sections: [
      { id: "trainers", label: "Doctors", icon: Stethoscope, description: "Specialists, qualifications, OPD", type: "dynamic" },
      { id: "services", label: "Treatments & Services", icon: Stethoscope, description: "Consultations, procedures, diagnostics", type: "dynamic" },
      { id: "plans", label: "Health Packages", icon: Star, description: "Checkup packages, insurance panels", type: "dynamic" },
      { id: "facilities", label: "Departments & Equipment", icon: Building, description: "Departments, lab, pharmacy", type: "dynamic" },
      { id: "timings", label: "OPD Timings", icon: Clock, description: "Doctor availability & slots", type: "dynamic" },
    ],
    labels: {
      services: { title: "Treatments & Services", addLabel: "Add Treatment", namePlaceholder: "e.g. Consultation, ECG, Blood Test", pricePlaceholder: "₹500", descPlaceholder: "Duration, preparation" },
      plans: { title: "Health Packages", addLabel: "Add Package", namePlaceholder: "e.g. Full Body Checkup", pricePlaceholder: "₹2500", descPlaceholder: "Tests included" },
      trainers: { title: "Doctors", addLabel: "Add Doctor", namePlaceholder: "e.g. Dr. Gupta — Cardiologist", pricePlaceholder: "₹800/visit", descPlaceholder: "Qualifications, days" },
      facilities: { title: "Departments & Equipment", addLabel: "Add Department", namePlaceholder: "e.g. Cardiology, Pathology Lab", pricePlaceholder: "", descPlaceholder: "Services, staff" },
      timings: { title: "OPD Timings", addLabel: "Add Timing", namePlaceholder: "e.g. Dr. Gupta: Mon-Sat 10–1 PM", pricePlaceholder: "", descPlaceholder: "Walk-in or appointment" },
    },
  },
  dental: {
    name: "Dental Clinic",
    emoji: "🦷",
    descriptionPlaceholder: "e.g. Advanced dental clinic with painless procedures and cosmetic dentistry...",
    sidebarLabel: "🦷 Dental",
    sections: [
      { id: "trainers", label: "Dentists", icon: Stethoscope, description: "Specialists & qualifications", type: "dynamic" },
      { id: "services", label: "Procedures & Pricing", icon: Stethoscope, description: "Cleaning, RCT, implants, braces", type: "dynamic" },
      { id: "plans", label: "Packages", icon: Star, description: "Annual care plans, insurance", type: "dynamic" },
      { id: "facilities", label: "Equipment & Technology", icon: Building, description: "Digital X-ray, laser, etc.", type: "dynamic" },
      { id: "timings", label: "Clinic Timings", icon: Clock, description: "Working hours & emergency", type: "dynamic" },
    ],
    labels: {
      services: { title: "Procedures & Pricing", addLabel: "Add Procedure", namePlaceholder: "e.g. Root Canal, Implants, Braces", pricePlaceholder: "₹5000", descPlaceholder: "Duration, sessions" },
      plans: { title: "Care Packages", addLabel: "Add Package", namePlaceholder: "e.g. Annual Dental Care Plan", pricePlaceholder: "₹8000/year", descPlaceholder: "What's covered" },
      trainers: { title: "Dentists", addLabel: "Add Dentist", namePlaceholder: "e.g. Dr. Mehta — Orthodontist", pricePlaceholder: "₹500/visit", descPlaceholder: "Specialization" },
      facilities: { title: "Equipment & Technology", addLabel: "Add Equipment", namePlaceholder: "e.g. Digital X-Ray, Laser", pricePlaceholder: "", descPlaceholder: "Capability" },
      timings: { title: "Clinic Timings", addLabel: "Add Timing", namePlaceholder: "e.g. Mon-Sat: 10 AM – 8 PM", pricePlaceholder: "", descPlaceholder: "Emergency contact" },
    },
  },
  restaurant: {
    name: "Restaurant",
    emoji: "🍽️",
    descriptionPlaceholder: "e.g. Family restaurant serving North Indian and Chinese cuisine...",
    sidebarLabel: "🍽️ Restaurant",
    sections: [
      { id: "services", label: "Menu", icon: UtensilsCrossed, description: "Food items & beverages", type: "dynamic" },
      { id: "plans", label: "Combos & Offers", icon: Star, description: "Meal deals, happy hours", type: "dynamic" },
      { id: "facilities", label: "Dine-in & Delivery", icon: Building, description: "Seating, delivery areas, parking", type: "dynamic" },
      { id: "timings", label: "Opening Hours", icon: Clock, description: "Timings, reservation info", type: "dynamic" },
      { id: "offers", label: "Events & Catering", icon: Star, description: "Private dining, catering, events", type: "dynamic" },
    ],
    labels: {
      services: { title: "Menu Items", addLabel: "Add Item", namePlaceholder: "e.g. Butter Chicken, Paneer Tikka", pricePlaceholder: "₹350", descPlaceholder: "Category, veg/non-veg" },
      plans: { title: "Combos & Offers", addLabel: "Add Combo", namePlaceholder: "e.g. Family Meal Deal", pricePlaceholder: "₹999", descPlaceholder: "What's included" },
      facilities: { title: "Dine-in & Delivery", addLabel: "Add Info", namePlaceholder: "e.g. AC Seating, Zomato, Swiggy", pricePlaceholder: "", descPlaceholder: "Capacity, delivery area" },
      timings: { title: "Opening Hours", addLabel: "Add Info", namePlaceholder: "e.g. Lunch: 12–3 PM", pricePlaceholder: "", descPlaceholder: "Reservation, last order" },
      offers: { title: "Events & Catering", addLabel: "Add Service", namePlaceholder: "e.g. Birthday Party, Corporate", pricePlaceholder: "₹500/plate", descPlaceholder: "Min guests" },
    },
  },
  cafe: {
    name: "Cafe",
    emoji: "☕",
    descriptionPlaceholder: "e.g. Cozy cafe with specialty coffee, pastries, and a great workspace...",
    sidebarLabel: "☕ Cafe",
    sections: [
      { id: "services", label: "Menu", icon: UtensilsCrossed, description: "Beverages, food, specials", type: "dynamic" },
      { id: "plans", label: "Offers", icon: Star, description: "Happy hours, loyalty cards", type: "dynamic" },
      { id: "facilities", label: "Ambience & Info", icon: Building, description: "WiFi, seating, pet-friendly", type: "dynamic" },
      { id: "timings", label: "Opening Hours", icon: Clock, description: "Timings & reservation", type: "dynamic" },
      { id: "offers", label: "Events", icon: Star, description: "Open mics, workshops, meetups", type: "dynamic" },
    ],
    labels: {
      services: { title: "Menu", addLabel: "Add Item", namePlaceholder: "e.g. Cappuccino, Cold Brew", pricePlaceholder: "₹200", descPlaceholder: "Category, sizes" },
      plans: { title: "Offers & Loyalty", addLabel: "Add Offer", namePlaceholder: "e.g. Buy 5 Get 1 Free", pricePlaceholder: "", descPlaceholder: "Terms" },
      facilities: { title: "Ambience & Info", addLabel: "Add Info", namePlaceholder: "e.g. Free WiFi, Pet-Friendly", pricePlaceholder: "", descPlaceholder: "Details" },
      timings: { title: "Opening Hours", addLabel: "Add Info", namePlaceholder: "e.g. 8 AM – 11 PM daily", pricePlaceholder: "", descPlaceholder: "Happy hour timing" },
      offers: { title: "Events", addLabel: "Add Event", namePlaceholder: "e.g. Open Mic Friday", pricePlaceholder: "", descPlaceholder: "Schedule" },
    },
  },
  real_estate: {
    name: "Real Estate",
    emoji: "🏠",
    descriptionPlaceholder: "e.g. Premium residential projects in prime locations with modern amenities...",
    sidebarLabel: "🏠 Real Estate",
    sections: [
      { id: "services", label: "Projects", icon: Home, description: "Available properties & locations", type: "dynamic" },
      { id: "plans", label: "Pricing & Payment Plans", icon: FileText, description: "Price sheets, EMI, possession", type: "dynamic" },
      { id: "facilities", label: "Amenities", icon: Building, description: "Pool, gym, park, security", type: "dynamic" },
      { id: "offers", label: "Offers & RERA", icon: Star, description: "Early bird, RERA number, loans", type: "dynamic" },
      { id: "trainers", label: "Sales Team", icon: Users, description: "Agents & contact persons", type: "dynamic" },
    ],
    labels: {
      services: { title: "Projects", addLabel: "Add Project", namePlaceholder: "e.g. Green Valley Phase 2", pricePlaceholder: "₹45L onwards", descPlaceholder: "Location, RERA, possession" },
      plans: { title: "Pricing & Payment Plans", addLabel: "Add Config", namePlaceholder: "e.g. 2BHK — 950 sq.ft.", pricePlaceholder: "₹55,00,000", descPlaceholder: "EMI, subvention" },
      facilities: { title: "Amenities", addLabel: "Add Amenity", namePlaceholder: "e.g. Swimming Pool, Clubhouse", pricePlaceholder: "", descPlaceholder: "Details" },
      offers: { title: "Offers & RERA", addLabel: "Add Info", namePlaceholder: "e.g. RERA: P12345, 5% Early Bird", pricePlaceholder: "", descPlaceholder: "Validity, loan partners" },
      trainers: { title: "Sales Team", addLabel: "Add Agent", namePlaceholder: "e.g. Amit — Sales Manager", pricePlaceholder: "", descPlaceholder: "Area expertise" },
    },
  },
  coaching: {
    name: "Coaching Institute",
    emoji: "📚",
    descriptionPlaceholder: "e.g. Coaching center for JEE, NEET, and board exam preparation...",
    sidebarLabel: "📚 Coaching",
    sections: [
      { id: "services", label: "Courses", icon: BookOpen, description: "Programs, subjects, batches", type: "dynamic" },
      { id: "plans", label: "Fee Structure", icon: Star, description: "Batch fees, scholarships", type: "dynamic" },
      { id: "trainers", label: "Faculty", icon: Users, description: "Teachers, qualifications, experience", type: "dynamic" },
      { id: "facilities", label: "Facilities", icon: Building, description: "Labs, library, study material", type: "dynamic" },
      { id: "timings", label: "Batch Timings", icon: Clock, description: "Morning, evening, weekend batches", type: "dynamic" },
      { id: "offers", label: "Demo & Results", icon: Star, description: "Free demo, results, placements", type: "dynamic" },
    ],
    labels: {
      services: { title: "Courses", addLabel: "Add Course", namePlaceholder: "e.g. JEE Main, NEET, Boards", pricePlaceholder: "₹25000/year", descPlaceholder: "Duration, batch size" },
      plans: { title: "Fee Structure", addLabel: "Add Fee Plan", namePlaceholder: "e.g. Full Year, Crash Course", pricePlaceholder: "₹15000", descPlaceholder: "Installments, scholarship" },
      trainers: { title: "Faculty", addLabel: "Add Faculty", namePlaceholder: "e.g. Mr. Verma — Physics (IIT Delhi)", pricePlaceholder: "", descPlaceholder: "Subject, experience" },
      facilities: { title: "Facilities", addLabel: "Add Facility", namePlaceholder: "e.g. AC Classroom, Online Portal", pricePlaceholder: "", descPlaceholder: "Details" },
      timings: { title: "Batch Timings", addLabel: "Add Batch", namePlaceholder: "e.g. JEE Morning: 7–9 AM", pricePlaceholder: "", descPlaceholder: "Days, faculty" },
      offers: { title: "Demo & Results", addLabel: "Add Info", namePlaceholder: "e.g. Free Demo, 95% Selection Rate", pricePlaceholder: "", descPlaceholder: "Year, toppers" },
    },
  },
  consultancy: {
    name: "Consultancy",
    emoji: "💼",
    descriptionPlaceholder: "e.g. CA firm offering tax filing, audit, and business registration services...",
    sidebarLabel: "💼 Consultancy",
    sections: [
      { id: "services", label: "Services", icon: Star, description: "Consulting services offered", type: "dynamic" },
      { id: "plans", label: "Packages & Pricing", icon: FileText, description: "Engagement models, retainers", type: "dynamic" },
      { id: "trainers", label: "Team", icon: Users, description: "Consultants, expertise, industries", type: "dynamic" },
      { id: "facilities", label: "Process & Testimonials", icon: Building, description: "How you work, case studies", type: "dynamic" },
    ],
    labels: {
      services: { title: "Services", addLabel: "Add Service", namePlaceholder: "e.g. Tax Filing, Company Registration", pricePlaceholder: "₹5000", descPlaceholder: "Timeline, deliverables" },
      plans: { title: "Packages", addLabel: "Add Package", namePlaceholder: "e.g. Startup Package, Annual Retainer", pricePlaceholder: "₹50000/year", descPlaceholder: "What's included" },
      trainers: { title: "Team", addLabel: "Add Member", namePlaceholder: "e.g. CA Mehta — 15 yrs experience", pricePlaceholder: "", descPlaceholder: "Expertise, industries" },
      facilities: { title: "Process & Testimonials", addLabel: "Add Info", namePlaceholder: "e.g. Step 1: Consultation", pricePlaceholder: "", descPlaceholder: "Timeline, client" },
    },
  },
  repair: {
    name: "Repair Services",
    emoji: "🔧",
    descriptionPlaceholder: "e.g. Mobile and electronics repair center with same-day service...",
    sidebarLabel: "🔧 Repair",
    sections: [
      { id: "services", label: "Repair Services", icon: Star, description: "What you fix, pricing", type: "dynamic" },
      { id: "plans", label: "Pricing & Warranty", icon: FileText, description: "Service charges, warranty terms", type: "dynamic" },
      { id: "facilities", label: "Brands & Service Area", icon: Building, description: "Supported brands, pickup/drop", type: "dynamic" },
      { id: "timings", label: "Turnaround & Timing", icon: Clock, description: "Repair time, working hours", type: "dynamic" },
    ],
    labels: {
      services: { title: "Repair Services", addLabel: "Add Service", namePlaceholder: "e.g. Screen Repair, AC Service", pricePlaceholder: "₹500", descPlaceholder: "Devices, turnaround" },
      plans: { title: "Pricing & Warranty", addLabel: "Add Price", namePlaceholder: "e.g. Basic Repair, Premium + Warranty", pricePlaceholder: "₹1000", descPlaceholder: "Warranty period" },
      facilities: { title: "Brands & Service Area", addLabel: "Add Brand", namePlaceholder: "e.g. Samsung, Apple, LG", pricePlaceholder: "", descPlaceholder: "Pickup/drop, area" },
      timings: { title: "Turnaround & Timing", addLabel: "Add Info", namePlaceholder: "e.g. Screen Repair: 2 hours", pricePlaceholder: "", descPlaceholder: "Express available" },
    },
  },
  retail: {
    name: "Retail Store",
    emoji: "🛍️",
    descriptionPlaceholder: "e.g. Multi-brand electronics and fashion retail store...",
    sidebarLabel: "🛍️ Retail",
    sections: [
      { id: "services", label: "Products & Categories", icon: Star, description: "What you sell, brands", type: "dynamic" },
      { id: "plans", label: "Offers & Deals", icon: FileText, description: "Discounts, seasonal sales", type: "dynamic" },
      { id: "facilities", label: "Store Policies", icon: Building, description: "Returns, delivery, payment", type: "dynamic" },
      { id: "timings", label: "Store Hours", icon: Clock, description: "Opening hours, holidays", type: "dynamic" },
    ],
    labels: {
      services: { title: "Products & Categories", addLabel: "Add Product", namePlaceholder: "e.g. iPhone 15, Nike Shoes", pricePlaceholder: "₹999", descPlaceholder: "Brand, category" },
      plans: { title: "Offers & Deals", addLabel: "Add Offer", namePlaceholder: "e.g. Flat 30% Off, BOGO", pricePlaceholder: "", descPlaceholder: "Validity, terms" },
      facilities: { title: "Store Policies", addLabel: "Add Policy", namePlaceholder: "e.g. 7-Day Returns, Free Delivery", pricePlaceholder: "", descPlaceholder: "Process, conditions" },
      timings: { title: "Store Hours", addLabel: "Add Info", namePlaceholder: "e.g. Mon-Sat: 10 AM – 9 PM", pricePlaceholder: "", descPlaceholder: "Closed days" },
    },
  },
  agency: {
    name: "Agency",
    emoji: "📱",
    descriptionPlaceholder: "e.g. Digital marketing agency specializing in SEO, ads, and web development...",
    sidebarLabel: "📱 Agency",
    sections: [
      { id: "services", label: "Services", icon: Star, description: "SEO, ads, design, dev, etc.", type: "dynamic" },
      { id: "plans", label: "Pricing Plans", icon: FileText, description: "Packages, retainers, custom", type: "dynamic" },
      { id: "trainers", label: "Team", icon: Users, description: "Experts, portfolio, roles", type: "dynamic" },
      { id: "facilities", label: "Portfolio & Process", icon: Building, description: "Case studies, industries, tech", type: "dynamic" },
    ],
    labels: {
      services: { title: "Services", addLabel: "Add Service", namePlaceholder: "e.g. SEO, Google Ads, Web Design", pricePlaceholder: "₹15000/month", descPlaceholder: "Deliverables, timeline" },
      plans: { title: "Pricing Plans", addLabel: "Add Plan", namePlaceholder: "e.g. Starter, Growth, Enterprise", pricePlaceholder: "₹25000/month", descPlaceholder: "SLA, what's included" },
      trainers: { title: "Team", addLabel: "Add Member", namePlaceholder: "e.g. Riya — Performance Marketing", pricePlaceholder: "", descPlaceholder: "Role, portfolio" },
      facilities: { title: "Portfolio & Process", addLabel: "Add Info", namePlaceholder: "e.g. 50+ clients, 3x ROAS", pricePlaceholder: "", descPlaceholder: "Industries, tech stack" },
    },
  },
  other: {
    name: "Other",
    emoji: "📋",
    descriptionPlaceholder: "Brief description of your business...",
    sidebarLabel: "📋 Business",
    sections: [
      { id: "services", label: "Services", icon: Star, description: "What you offer", type: "dynamic" },
      { id: "plans", label: "Pricing", icon: FileText, description: "Your pricing", type: "dynamic" },
      { id: "trainers", label: "Team", icon: Users, description: "Your team members", type: "dynamic" },
      { id: "facilities", label: "Facilities & Info", icon: Building, description: "Additional details", type: "dynamic" },
    ],
    labels: {
      services: { title: "Services", addLabel: "Add Service", namePlaceholder: "Service name", pricePlaceholder: "Price", descPlaceholder: "Description" },
      plans: { title: "Pricing", addLabel: "Add Plan", namePlaceholder: "Plan name", pricePlaceholder: "Price", descPlaceholder: "Details" },
      trainers: { title: "Team", addLabel: "Add Member", namePlaceholder: "Name", pricePlaceholder: "", descPlaceholder: "Role" },
      facilities: { title: "Info", addLabel: "Add Info", namePlaceholder: "Item", pricePlaceholder: "", descPlaceholder: "Details" },
    },
  },
};

// ─── Helper Functions ────────────────────────────────────────────────────────

/** Get config for a business type, falls back to "other" */
export function getBusinessConfig(type: string): BusinessTypeConfig {
  return BUSINESS_TYPES[type] || BUSINESS_TYPES.other;
}

/** Get all section definitions for a business type (common + dynamic + bottom) */
export function getAllSections(type: string): SectionDef[] {
  const config = getBusinessConfig(type);
  return [...COMMON_SECTIONS, ...config.sections, ...COMMON_BOTTOM];
}

/** Get section labels for a specific section in a business type */
export function getSectionLabels(type: string, sectionId: string): SectionLabels {
  const config = getBusinessConfig(type);
  return config.labels[sectionId] || { title: sectionId, addLabel: "Add", namePlaceholder: "Name", pricePlaceholder: "Price", descPlaceholder: "Description" };
}

/** Get business type dropdown options (for select elements) */
export function getBusinessTypeOptions(): Array<{ value: string; label: string }> {
  return Object.entries(BUSINESS_TYPES).map(([key, config]) => ({
    value: key,
    label: `${config.emoji} ${config.name}`,
  }));
}
