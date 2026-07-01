import { v2 as cloudinary } from "cloudinary";

let configured = false;

function ensureCloudinary() {
  if (configured) return true;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return false;
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  configured = true;
  return true;
}

export function isCloudinaryEnabled() {
  return ensureCloudinary();
}

export async function uploadRecording(buffer: Buffer, interviewId: string, mimeType: string): Promise<string | null> {
  if (!ensureCloudinary()) return null;

  const extension = mimeType.includes("mp4") ? "mp4" : "webm";
  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: "interview-recordings",
        public_id: interviewId,
        overwrite: true,
        format: extension,
      },
      (error, uploadResult) => {
        if (error || !uploadResult) reject(error ?? new Error("Upload failed"));
        else resolve(uploadResult as { secure_url: string });
      },
    );
    stream.end(buffer);
  });

  return result.secure_url;
}
