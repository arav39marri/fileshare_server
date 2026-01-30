import streamifier from "streamifier";
import { cloudinary } from "../config/cloudinary.js";

export function uploadBufferToCloudinary({
  buffer,
  folder,
  filename,
  resourceType = "auto",
}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}
