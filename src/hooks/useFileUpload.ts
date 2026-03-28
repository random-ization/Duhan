import { useRef, useState } from 'react';
import { useAction } from 'convex/react';
import { aRef } from '../utils/convexRefs';
import { uploadFileToStorage } from '../utils/storageUpload';

interface UploadResult {
  url: string;
  storageId?: string;
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const activeUploadsRef = useRef(0);
  // Use S3-compatible storage (DigitalOcean Spaces) via convex/storage.ts
  const getUploadUrl = useAction(
    aRef<
      { filename: string; contentType: string; fileSize: number; folder?: string },
      { uploadUrl: string; publicUrl: string; key: string; headers: Record<string, string> }
    >('storage:getUploadUrl')
  );

  const uploadFile = async (file: File, folder: string = 'uploads'): Promise<UploadResult> => {
    activeUploadsRef.current += 1;
    setUploading(true);
    try {
      const { url } = await uploadFileToStorage({
        file,
        folder,
        getUploadUrl,
      });
      return { url };
    } catch (error) {
      console.error('File upload error:', error);
      // Re-throw with more context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown upload error occurred');
    } finally {
      activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
      setUploading(activeUploadsRef.current > 0);
    }
  };

  return {
    uploadFile,
    uploading,
  };
};
