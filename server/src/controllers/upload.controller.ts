import { Request, Response } from 'express';

export const handleFileUpload = (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // multer-s3 会在 req.file 中添加 location 属性 (即文件的 CDN 链接)
    const fileData = req.file as any;

    res.json({
      success: true,
      url: fileData.location, // 这是最重要的，前端要存这个 URL
      key: fileData.key,
      mimetype: fileData.mimetype
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
};