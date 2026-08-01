import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return errorResponse("No file provided", 400);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (cloudName && process.env.CLOUDINARY_API_KEY) {
      const { v2: cloudinary } = await import("cloudinary");
      cloudinary.config({
        cloud_name: cloudName,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: "sims/products" }, (err, result) => {
            if (err) reject(err);
            else resolve(result as { secure_url: string });
          })
          .end(buffer);
      });

      return successResponse({ url: result.secure_url });
    }

    return successResponse({ url: base64 });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Upload failed", 500);
  }
}
