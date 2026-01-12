import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface UploadResult {
    url: string;
    storageId?: string;
}

export const useFileUpload = () => {
    const [uploading, setUploading] = useState(false);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);
    const saveUploadedFile = useMutation(api.files.saveUploadedFile);

    const uploadFile = async (file: File): Promise<UploadResult> => {
        setUploading(true);
        try {
            // 1. Get presigned URL from Convex built-in storage
            const uploadUrl = await generateUploadUrl();

            // 2. Upload file to Convex storage
            const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!result.ok) {
                throw new Error(`Upload failed: ${result.statusText}`);
            }

            // 3. Get the storage ID from the response
            const { storageId } = await result.json();

            // 4. Get the public URL for the stored file
            const { url } = await saveUploadedFile({ storageId });

            if (!url) {
                throw new Error("Failed to get file URL");
            }

            return { url, storageId };
        } finally {
            setUploading(false);
        }
    };

    return {
        uploadFile,
        uploading
    };
};
