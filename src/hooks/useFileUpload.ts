import { useState } from 'react';
import { useAction } from 'convex/react';
import { aRef } from '../utils/convexRefs';

interface UploadResult {
  url: string;
  storageId?: string;
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  // Use S3-compatible storage (DigitalOcean Spaces) via convex/storage.ts
  const getUploadUrl = useAction(aRef<{ filename: string; contentType: string; folder?: string }, { uploadUrl: string; publicUrl: string; headers: Record<string, string> }>('storage:getUploadUrl'));

  const uploadFile = async (file: File, folder: string = 'uploads'): Promise<UploadResult> => {
    setUploading(true);
    try {
      // 1. Get presigned URL and public URL from backend
      const { uploadUrl, publicUrl, headers } = await getUploadUrl({
        filename: file.name,
        contentType: file.type,
        folder,
      });

      // 2. Upload file directly to S3/Spaces
      const result = await fetch(uploadUrl, {
        method: 'PUT',
        headers: headers, // Important: Include signed headers
        body: file,
      });

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.status} ${result.statusText}`);
      }

      // 3. Return the public access URL
      // Note: S3 uploads don't return a storageId in the same way Convex storage does.
      // We return the direct URL.
      return { url: publicUrl };
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadFile,
    uploading,
  };
};
