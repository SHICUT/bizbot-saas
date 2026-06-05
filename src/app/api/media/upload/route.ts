import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "media-library";

/**
 * POST /api/media/upload
 * Uploads a file to Supabase Storage and stores metadata.
 * Path: media-library/{business_id}/{category}/{filename}
 *
 * Accepts: multipart/form-data
 * Fields: file, name, category, keywords
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string || "";
  const category = formData.get("category") as string || "gallery";
  const keywords = (formData.get("keywords") as string || "").split(",").map((k) => k.trim()).filter(Boolean);

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Build storage path: media-library/{business_id}/{category}/{filename}
  const ext = file.name.split(".").pop() || "jpg";
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 50);
  const storagePath = `${business.id}/${category}/${Date.now()}_${safeName}`;

  console.log(`[Media Upload] Business: ${business.id.substring(0, 8)} | Path: ${storagePath} | Size: ${file.size}`);

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    console.error("[Media Upload] Storage error:", uploadErr.message);

    if (uploadErr.message.includes("Bucket not found")) {
      return NextResponse.json({
        error: "Storage bucket 'media-library' not found. Create it in Supabase Dashboard → Storage → New Bucket → Name: media-library → Public: ON",
      }, { status: 500 });
    }

    return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  console.log(`[Media Upload] ✓ Uploaded to: ${publicUrl}`);

  // Store metadata in business_media table (or fallback)
  try {
    const { error: dbErr } = await admin.from("business_media").insert({
      business_id: business.id,
      name: name || file.name,
      type: category,
      url: publicUrl,
      trigger_keywords: keywords,
      is_active: true,
    });

    if (dbErr) {
      console.warn("[Media Upload] DB metadata save failed:", dbErr.message, "— file still uploaded");
    }
  } catch {
    console.warn("[Media Upload] business_media table may not exist — file uploaded but metadata not stored");
  }

  return NextResponse.json({
    success: true,
    url: publicUrl,
    path: storagePath,
    name: name || file.name,
    category,
  });
}
