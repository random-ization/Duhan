import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import https from 'https';
import { Request, Response, NextFunction } from 'express';

dotenv.config();

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

// --- AWS Signature V4 Implementation (Zero Dependency) ---

const signV4 = (
  method: string,
  uri: string,
  queryString: string,
  headers: Record<string, string>,
  payloadHash: string,
  region: string,
  service: string
) => {
  const accessKeyId = process.env.SPACES_KEY!;
  const secretAccessKey = process.env.SPACES_SECRET!;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  // 1. Canonical Request
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(key => `${key.toLowerCase()}:${headers[key].trim()}\n`)
    .join('');

  const signedHeaders = Object.keys(headers)
    .sort()
    .map(key => key.toLowerCase())
    .join(';');

  const canonicalRequest = [
    method,
    uri,
    queryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  // 2. String to Sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');

  // 3. Signature Calculation
  const getSignatureKey = (key: string, dateStamp: string, regionName: string, serviceName: string) => {
    const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
  };

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return { signature, amzDate, signedHeaders, credentialScope };
};

/**
 * 生成 Presigned URL (用于前端直传)
 */
export const getPresignedUrl = (key: string, contentType: string = 'application/json') => {
  const endpoint = process.env.SPACES_ENDPOINT;
  const bucket = process.env.SPACES_BUCKET;
  const accessKeyId = process.env.SPACES_KEY;

  if (!endpoint || !bucket || !accessKeyId) {
    throw new Error('Missing Spaces configuration');
  }

  const region = 'us-east-1'; // DigitalOcean Spaces 兼容 region
  const service = 's3';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const host = new URL(endpoint).host; // sgp1.digitaloceanspaces.com
  // Virtual-hosted style: bucket.region.digitaloceanspaces.com
  const endpointHost = `${bucket}.${host}`;
  const uri = `/${key}`;

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const expires = 300; // 5 minutes

  // Canonical Query String (Must be sorted)
  const queryParams = new URLSearchParams();
  queryParams.set('X-Amz-Algorithm', algorithm);
  queryParams.set('X-Amz-Credential', `${accessKeyId}/${credentialScope}`);
  queryParams.set('X-Amz-Date', amzDate);
  queryParams.set('X-Amz-Expires', expires.toString());
  queryParams.set('X-Amz-SignedHeaders', 'host');

  // Canonical Request construction for Presigned URL
  // NOTE: For presigned URLs, the Canonical Query String is part of the Canonical Request
  const sortedQuery = Array.from(queryParams.entries())
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  // Headers to sign
  // NOTE: x-amz-acl must be signed if sent
  const acl = 'public-read';

  const canonicalRequest = [
    'PUT',
    uri,
    sortedQuery,
    `host:${endpointHost}\nx-amz-acl:${acl}\n`, // Added acl
    'host;x-amz-acl', // Added acl to SignedHeaders
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  // Sign
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');

  const getSignatureKey = (key: string, dateStamp: string, regionName: string, serviceName: string) => {
    const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
  };

  const secretAccessKey = process.env.SPACES_SECRET!;
  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return `https://${endpointHost}${uri}?${sortedQuery}&X-Amz-Signature=${signature}`;
};


// 内存存储 Multer 实例
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// Avatar/Media 暂时只保存到内存并尝试上传（如果网络通的话），否则只作为 Mock
// 鉴于目前网络状况，我们暂时让它通过，但不做真实上传，除非我们要实现复杂的 multipart/form-data 签名逻辑
// 或者，我们可以用上面实现的 signV4 + https 来尝试上传
// 导出此函数供其他模块使用 (如 content.controller.ts 上传 questions JSON)
export const sendToS3 = async (key: string, body: Buffer, contentType: string) => {
  const endpoint = process.env.SPACES_ENDPOINT!;
  const bucket = process.env.SPACES_BUCKET!;
  const host = `${bucket}.${new URL(endpoint).host}`;
  const contentLength = body.length;

  const headers: Record<string, string> = {
    'Host': host,
    'Content-Type': contentType,
    'Content-Length': contentLength.toString(),
    'x-amz-acl': 'public-read'
  };

  const endpointUrl = new URL(process.env.SPACES_ENDPOINT || 'https://nyc3.digitaloceanspaces.com');
  // Handle endpoint like https://nyc3.digitaloceanspaces.com or https://digitaloceanspaces.com
  // For DO Spaces, usually the region is the subdomain part of endpoint if not provided explicitly
  const region = endpointUrl.hostname.split('.')[0] || 'us-east-1';

  const { signature, amzDate, signedHeaders, credentialScope } = signV4(
    'PUT',
    `/${key}`,
    '',
    headers,
    crypto.createHash('sha256').update(body).digest('hex'),
    region,
    's3'
  );

  const authHeader = `AWS4-HMAC-SHA256 Credential=${process.env.SPACES_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve, reject) => {
    const req = https.request({
      host,
      path: `/${key}`,
      method: 'PUT',
      headers: {
        ...headers,
        'X-Amz-Date': amzDate,
        'Authorization': authHeader,
        'X-Amz-Content-Sha256': crypto.createHash('sha256').update(body).digest('hex')
      }
    }, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve(true);
      } else {
        // 读取错误信息
        let errBody = '';
        res.on('data', c => errBody += c);
        res.on('end', () => reject(new Error(`S3 Error ${res.statusCode}: ${errBody}`)));
      }
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

/**
 * Send to S3 with Cache-Control headers for CDN caching
 * @param key - S3 key path
 * @param body - File content buffer
 * @param contentType - MIME type
 * @param cacheMaxAge - Cache max-age in seconds (default 300 = 5 mins)
 */
export const sendToS3WithCache = async (
  key: string,
  body: Buffer,
  contentType: string,
  cacheMaxAge: number = 300
): Promise<string> => {
  const endpoint = process.env.SPACES_ENDPOINT || 'https://s3.us-west-1.amazonaws.com'; // Default to AWS if missing
  const bucket = process.env.SPACES_BUCKET || 'hangyeol';

  let host = endpoint;
  try {
    if (endpoint.startsWith('http')) {
      host = `${bucket}.${new URL(endpoint).host}`;
    } else {
      host = `${bucket}.${endpoint}`;
    }
  } catch (e) {
    console.warn('[Storage] Failed to parse S3 endpoint, using fallback host');
  }
  const contentLength = body.length;

  const headers: Record<string, string> = {
    'Host': host,
    'Content-Type': contentType,
    'Content-Length': contentLength.toString(),
    'x-amz-acl': 'public-read',
    'Cache-Control': `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`
  };

  // Robust region extraction
  let region = 'us-east-1';
  const endpointStr = process.env.SPACES_ENDPOINT || 'https://s3.us-west-1.amazonaws.com';

  if (endpointStr.includes('digitaloceanspaces.com')) {
    const match = endpointStr.match(/([a-z0-9-]+)\.digitaloceanspaces\.com/);
    if (match) region = match[1];
    else region = 'nyc3';
  } else if (endpointStr.includes('amazonaws.com')) {
    const match = endpointStr.match(/s3\.([a-z0-9-]+)\.amazonaws\.com/);
    if (match) region = match[1];
  } else {
    // Direct region name or unknown host
    try {
      const url = new URL(endpointStr);
      region = url.hostname.split('.')[0];
    } catch (e) { }
  }

  // 🔥 Fix: Encode key
  const encodedKey = key.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const uri = `/${encodedKey}`;

  const { signature, amzDate, signedHeaders, credentialScope } = signV4(
    'PUT',
    uri,
    '',
    headers,
    crypto.createHash('sha256').update(body).digest('hex'),
    region,
    's3'
  );

  const authHeader = `AWS4-HMAC-SHA256 Credential=${process.env.SPACES_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve, reject) => {
    const req = https.request({
      host,
      path: uri,
      method: 'PUT',
      headers: {
        ...headers,
        'X-Amz-Date': amzDate,
        'Authorization': authHeader,
        'X-Amz-Content-Sha256': crypto.createHash('sha256').update(body).digest('hex')
      }
    }, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        const cdnUrl = getCdnUrl();
        resolve(`${cdnUrl}/${encodedKey}`);
      } else {
        let errBody = '';
        res.on('data', c => errBody += c);
        res.on('end', () => reject(new Error(`S3 Error ${res.statusCode}: ${errBody}`)));
      }
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

/**
 * Upload JSON with CDN cache headers
 * @param key - S3 key path (e.g. 'cache/trending.json')
 * @param data - JSON data to upload
 * @param cacheMaxAge - Cache max-age in seconds (default 300 = 5 mins)
 * @returns CDN URL of the uploaded file
 */
export const uploadCachedJson = async (
  key: string,
  data: any,
  cacheMaxAge: number = 300
): Promise<string> => {
  const jsonStr = JSON.stringify(data);
  const buffer = Buffer.from(jsonStr, 'utf-8');
  return sendToS3WithCache(key, buffer, 'application/json', cacheMaxAge);
};

/**
 * Get CDN URL for a given S3 key
 */
export const getJsonCdnUrl = (key: string): string => {
  return `${getCdnUrl()}/${key}`;
};

// Alias for internal use
const sendToSpacesNative = sendToS3;

const createUploadMiddleware = (folder: string, type: 'avatar' | 'media', fieldName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Check required environment variables
    const requiredEnvVars = ['SPACES_ENDPOINT', 'SPACES_BUCKET', 'SPACES_KEY', 'SPACES_SECRET'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
      console.error('[storage] Missing environment variables:', missingVars);
      return res.status(500).json({
        error: 'Storage configuration error',
        details: `Missing environment variables: ${missingVars.join(', ')}`
      });
    }

    const upload = fieldName === 'avatar' ? memoryUpload.single('avatar') : memoryUpload.single('file');

    upload(req, res, async (err: any) => {
      if (err) {
        console.error('[storage] Multer error:', err);
        return next(err);
      }
      if (!req.file) {
        console.error('[storage] No file received');
        return next();
      }

      const file = req.file;
      // Encode filename to handle Chinese/special characters, but keep extension readable
      const ext = file.originalname.split('.').pop() || '';
      const baseName = file.originalname.replace(/\.[^.]+$/, '');
      const safeBaseName = encodeURIComponent(baseName).replace(/%/g, '_');
      const key = `${folder}/${Date.now()}-${safeBaseName}.${ext}`;
      console.log('[storage] Uploading file:', { key, mimetype: file.mimetype, size: file.size });

      try {
        await sendToSpacesNative(key, file.buffer, file.mimetype);

        const cdnUrl = getCdnUrl();
        (req.file as any).location = `${cdnUrl}/${key}`;
        (req.file as any).key = key;
        delete (req.file as any).buffer;
        console.log('[storage] Upload successful:', (req.file as any).location);
        next();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('[storage] Upload failed:', message);
        console.error('[storage] Full error:', e);
        return res.status(500).json({
          error: 'Storage upload failed',
          details: message
        });
      }
    });
  };
};


// 导出兼容对象
const createCompatWrapper = (folder: string, type: 'avatar' | 'media') => {
  return {
    single: (fieldName: string) => createUploadMiddleware(folder, type, fieldName)
  };
};

export const uploadAvatar = createCompatWrapper('avatars', 'avatar') as any;
export const uploadMedia = createCompatWrapper('uploads', 'media') as any;

export interface UploadJsonResult {
  url: string;
  key: string;
}

// 保留此接口定义，但抛出错误提示必须使用 Presigned URL
export const uploadJsonToS3 = async (data: any, key: string): Promise<UploadJsonResult> => {
  throw new Error('Server-side upload deprecated. Use getPresignedUrl and client-side upload.');
};

export const deleteFromS3 = async (key: string): Promise<void> => {
  // 实现 native delete
  // 省略，暂不重要
};

export const extractKeyFromUrl = (url: string): string | null => {
  const cdnBase = getCdnUrl();
  if (url.startsWith(cdnBase)) {
    return url.replace(cdnBase + '/', '');
  }
  return null;
};