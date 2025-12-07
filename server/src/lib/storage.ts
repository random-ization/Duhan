import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// 1. 初始化 S3 客户端 (连接 DigitalOcean Spaces)
const s3Config = new S3Client({
  region: 'us-east-1', // DigitalOcean Spaces 协议要求填 region，通常填 us-east-1 即可，或者你的区号 sgp1
  endpoint: process.env.SPACES_ENDPOINT, // 例如: https://sgp1.digitaloceanspaces.com
  credentials: {
    accessKeyId: process.env.SPACES_KEY || '',
    secretAccessKey: process.env.SPACES_SECRET || '',
  },
});

// 2. 定义允许的文件类型
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  avatar: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  media: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a'],
};

// 3. 创建通用上传器生成函数
const createUploader = (folder: string, type: 'avatar' | 'media') => {
  return multer({
    storage: multerS3({
      s3: s3Config,
      bucket: process.env.SPACES_BUCKET || '', // 你的 Bucket 名字
      acl: 'public-read', // 文件公开可读
      contentType: multerS3.AUTO_CONTENT_TYPE, // 自动识别文件类型
      key: function (req, file, cb) {
        // 生成唯一文件名: folder/年份/月份/时间戳-随机数.后缀
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);

        // 最终路径例如: avatars/2025/12/1733666666-12345.jpg
        cb(null, `${folder}/${year}/${month}/${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: type === 'media' ? 20 * 1024 * 1024 : 5 * 1024 * 1024 }, // 媒体20MB，头像5MB
    fileFilter: (req, file, cb) => {
      if (ALLOWED_MIME_TYPES[type].includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES[type].join(', ')}`));
      }
    },
  });
};

// 4. 导出具体的上传中间件
export const uploadAvatar = createUploader('avatars', 'avatar');
export const uploadMedia = createUploader('uploads', 'media'); // 用于考试、教材的通用上传