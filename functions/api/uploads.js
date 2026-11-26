import { HttpError, assertSameOrigin, errorResponse, json } from "../_lib.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request, env);
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_UPLOAD_PRESET) {
      throw new HttpError(503, "Photo uploads are not configured yet.", "uploads_not_configured");
    }
    const form = await request.formData();
    const file = form.get("file");
    const honeypot = String(form.get("companyWebsite") || "");
    if (honeypot) throw new HttpError(400, "Invalid upload request.", "invalid_upload");
    if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type)) {
      throw new HttpError(400, "Please upload a JPG, PNG or WebP image.", "invalid_file_type");
    }
    if (file.size > 8_000_000) throw new HttpError(413, "Each image must be under 8 MB.", "file_too_large");
    const upload = new FormData();
    upload.set("file", file, file.name);
    upload.set("upload_preset", env.CLOUDINARY_UPLOAD_PRESET);
    upload.set("folder", "yorkshire-autotech/booking-parts");
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image/upload`,
      { method: "POST", body: upload }
    );
    const data = await response.json();
    if (!response.ok || !data.secure_url) {
      console.error("Cloudinary upload failed", data);
      throw new HttpError(502, "The image could not be uploaded.", "upload_failed");
    }
    return json({ url: data.secure_url });
  } catch (error) {
    return errorResponse(error);
  }
}
