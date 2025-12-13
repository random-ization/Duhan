import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// 延迟初始化 S3 客户端，避免启动时因环境变量缺失而崩溃
let _s3Client: S3Client | null = null;

const getS3Client = (): S3Client => {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: process.env.SPACES_ENDPOINT,
      credentials: {
        accessKeyId: process.env.SPACES_KEY || '',
        secretAccessKey: process.env.SPACES_SECRET || '',
      },
      forcePathStyle: false,
    });
  }
  return _s3Client;
};

// 导出 s3Client getter（兼容现有代码）
export const s3Client = new Proxy({} as S3Client, {
  get: (target, prop) => {
    const client = getS3Client();
    return (client as any)[prop];
  },
});

// 获取 CDN URL 前缀
const getCdnUrl = () => {
  const cdnUrl = process.env.SPACES_CDN_URL;
  if (cdnUrl) return cdnUrl;

  const endpoint = process.env.SPACES_ENDPOINT || '';
  const bucket = process.env.SPACES_BUCKET || '';
  const region = endpoint.replace('https://', '').replace('.digitaloceanspaces.com', '');
  return `https://${bucket}.${region}.cdn.digitaloceanspaces.com`;
};

// 定义允许的文件类型
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  avatar: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  media: [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave',
    'audio/x-wav', 'audio/x-m4a', 'audio/m4a', 'audio/mp4',
    'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac',
    'application/json',
  ],
};

// 创建通用上传器生成函数
const createUploader = (folder: string, type: 'avatar' | 'media') => {
  return multer({
    storage: multerS3({
      s3: getS3Client(),
      bucket: process.env.SPACES_BUCKET || '',
      acl: 'public-read',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: function (req, file, cb) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${folder}/${year}/${month}/${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: type === 'media' ? 100 * 1024 * 1024 : 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (ALLOWED_MIME_TYPES[type].includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES[type].join(', ')}`));
      }
    },
  });
};

// 缓存上传中间件实例
let _avatarUploader: multer.Multer | null = null;
let _mediaUploader: multer.Multer | null = null;

// 使用 Proxy 包装为惰性实例，保持 .single() 等方法的兼容性
export const uploadAvatar = new Proxy({} as multer.Multer, {
  get: (target, prop) => {
    if (!_avatarUploader) {
      _avatarUploader = createUploader('avatars', 'avatar');
    }
    return (_avatarUploader as any)[prop];
  },
});

export const uploadMedia = new Proxy({} as multer.Multer, {
  get: (target, prop) => {
    if (!_mediaUploader) {
      _mediaUploader = createUploader('uploads', 'media');
    }
    return (_mediaUploader as any)[prop];
  },
});

// 上传 JSON 数据到 S3
export interface UploadJsonResult {
  url: string;
  key: string;
}

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
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await getS3Client().send(command);

  const cdnBase = getCdnUrl();
  return {
    url: `${cdnBase}/${key}`,
    key,
  };
};

export const deleteFromS3 = async (key: string): Promise<void> => {
  const bucket = process.env.SPACES_BUCKET || '';

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await getS3Client().send(command);
};

export const extractKeyFromUrl = (url: string): string | null => {
  const cdnBase = getCdnUrl();
  if (url.startsWith(cdnBase)) {
    return url.replace(cdnBase + '/', '');
  }
  return null;
};