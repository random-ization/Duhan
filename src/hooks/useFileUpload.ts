import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface UploadResult {
    url: string;
    key: string;
}

export const useFileUpload = () => {
    const [uploading, setUploading] = useState(false);
    const getUploadUrl = useAction(api.storage.getUploadUrl);

    const uploadFile = async (file: File): Promise<UploadResult> => {
        setUploading(true);
        try {
            // 1. Get presigned URL from Convex (DigitalOcean Spaces / S3)
            const { uploadUrl, publicUrl, key, headers } = await getUploadUrl({
                filename: file.name,
                contentType: file.type,
            });

            // 2. Upload directly to S3/Storage
            const result = await fetch(uploadUrl, {
                method: "PUT",
                headers: headers as any, // Headers from server (x-amz-acl, etc)
                body: file,
            });

            if (!result.ok) {
                throw new Error(`Upload failed: ${result.statusText}`);
            }

            // 3. Return the public CDN URL
            return { url: publicUrl, key };
        } finally {
            setUploading(false);
        }
    };

    return {
        uploadFile,
        uploading
    };
};
