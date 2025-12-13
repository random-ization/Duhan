import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// 1. 初始化 S3 客户端 (连接 DigitalOcean Spaces)
export const s3Client = new S3Client({
  region: 'us-east-1', // DigitalOcean Spaces 协议要求填 region，通常填 us-east-1 即可，或者你的区号 sgp1
  endpoint: process.env.SPACES_ENDPOINT, // 例如: https://sgp1.digitaloceanspaces.com
  credentials: {
    accessKeyId: process.env.SPACES_KEY || '',
    secretAccessKey: process.env.SPACES_SECRET || '',
  },
  forcePathStyle: false, // 对于 DigitalOcean Spaces 使用 virtual-hosted style
});

// 获取 CDN URL 前缀
const getCdnUrl = () => {
  // DigitalOcean Spaces CDN URL 格式: https://{bucket}.{region}.cdn.digitaloceanspaces.com
  // 或者自定义 CDN 域名
  const cdnUrl = process.env.SPACES_CDN_URL;
  if (cdnUrl) return cdnUrl;

  // Fallback: 从 endpoint 构建
  const endpoint = process.env.SPACES_ENDPOINT || '';
  const bucket = process.env.SPACES_BUCKET || '';
  // 转换 https://sgp1.digitaloceanspaces.com -> https://bucket.sgp1.cdn.digitaloceanspaces.com
  const region = endpoint.replace('https://', '').replace('.digitaloceanspaces.com', '');
  return `https://${bucket}.${region}.cdn.digitaloceanspaces.com`;
};

// 2. 定义允许的文件类型
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  avatar: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  media: [
    // Images
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    // Audio - comprehensive list for TOPIK listening exams
    'audio/mpeg',        // MP3
    'audio/mp3',         // MP3 (non-standard but sometimes used)
    'audio/wav',         // WAV
    'audio/wave',        // WAV alternative
    'audio/x-wav',       // WAV alternative
    'audio/x-m4a',       // M4A
    'audio/m4a',         // M4A alternative
    'audio/mp4',         // M4A/MP4 audio
    'audio/aac',         // AAC
    'audio/ogg',         // OGG
    'audio/webm',        // WebM audio
    'audio/flac',        // FLAC
    // JSON - for exam data
    'application/json',
  ],
};

// 3. 创建通用上传器生成函数
const createUploader = (folder: string, type: 'avatar' | 'media') => {
  return multer({
    storage: multerS3({
      s3: s3Client,
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
    limits: { fileSize: type === 'media' ? 100 * 1024 * 1024 : 5 * 1024 * 1024 }, // 媒体100MB（TOPIK听力），头像5MB
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

// 5. 新增：直接上传 JSON 数据到 S3 的工具函数
export interface UploadJsonResult {
  url: string;
  key: string;
}

/**
 * 将 JSON 数据上传到 S3
 * @param data - 要上传的数据对象
 * @param key - S3 对象 key (路径)，例如 "exams/exam-123/questions.json"
 * @returns 包含 CDN URL 和 key 的对象
 */
export const uploadJsonToS3 = async (data: any, key: string): Promise<UploadJsonResult> => {
  const bucket = process.env.SPACES_BUCKET || '';
  const jsonString = JSON.stringify(data);
  const buffer = Buffer.from(jsonString, 'utf-8');

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: 'application/json',
    ACL: 'public-read',
    // 添加缓存控制，考试数据可以缓存较长时间
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await s3Client.send(command);

  // 返回 CDN URL
  const cdnBase = getCdnUrl();
  return {
    url: `${cdnBase}/${key}`,
    key,
  };
};

/**
 * 从 S3 删除对象
 * @param key - S3 对象 key
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
  const bucket = process.env.SPACES_BUCKET || '';

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3Client.send(command);
};

/**
 * 从 URL 提取 S3 key
 * @param url - CDN URL
 * @returns S3 key 或 null
 */
export const extractKeyFromUrl = (url: string): string | null => {
  const cdnBase = getCdnUrl();
  if (url.startsWith(cdnBase)) {
    return url.replace(cdnBase + '/', '');
  }
  return null;
};