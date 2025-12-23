import https from 'https';
import crypto from 'crypto';
import { sendToS3 } from '../lib/storage';

// 获取 S3/Spaces 配置
const getConfig = () => {
    const endpoint = process.env.SPACES_ENDPOINT!;
    const bucket = process.env.SPACES_BUCKET!;
    const accessKey = process.env.SPACES_KEY!;
    const secretKey = process.env.SPACES_SECRET!;
    const host = `${bucket}.${new URL(endpoint).host}`;
    const region = new URL(endpoint).hostname.split('.')[0] || 'us-east-1';

    return { endpoint, bucket, accessKey, secretKey, host, region };
};

// AWS Signature V4 签名（用于 GET/HEAD 请求）
const signV4 = (
    method: string,
    uri: string,
    host: string,
    region: string,
    accessKey: string,
    secretKey: string
) => {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const service = 's3';

    const headers: Record<string, string> = {
        'Host': host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD'
    };

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
        '',
        canonicalHeaders,
        signedHeaders,
        'UNSIGNED-PAYLOAD'
    ].join('\n');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
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

    const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const authHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return { ...headers, 'Authorization': authHeader };
};

/**
 * Helper to encode key for S3 (URL encode each segment)
 */
const encodeKey = (key: string): string => {
    return key.split('/').map(segment => encodeURIComponent(segment)).join('/');
};

/**
 * 检查 S3 文件是否存在
 */
export const checkFileExists = async (key: string): Promise<boolean> => {
    const { host, region, accessKey, secretKey } = getConfig();
    const uri = `/${encodeKey(key)}`; // 🔥 Fix: Encode key
    const headers = signV4('HEAD', uri, host, region, accessKey, secretKey);

    return new Promise((resolve) => {
        const req = https.request({
            host,
            path: uri,
            method: 'HEAD',
            headers
        }, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.end();
    });
};

/**
 * 上传 JSON 到 S3
 */
export const uploadJSON = async (key: string, data: any): Promise<void> => {
    const jsonStr = JSON.stringify(data);
    const buffer = Buffer.from(jsonStr, 'utf-8');
    await sendToS3(key, buffer, 'application/json');
};

/**
 * 从 S3 下载 JSON
 */
export const downloadJSON = async (key: string): Promise<any> => {
    const { host, region, accessKey, secretKey } = getConfig();
    const uri = `/${encodeKey(key)}`; // 🔥 Fix: Encode key
    const headers = signV4('GET', uri, host, region, accessKey, secretKey);

    return new Promise((resolve, reject) => {
        const req = https.request({
            host,
            path: uri,
            method: 'GET',
            headers
        }, (res) => {
            if (res.statusCode !== 200) {
                // Try to read body for error details
                let errBody = '';
                res.on('data', c => errBody += c);
                res.on('end', () => {
                    reject(new Error(`S3 download failed: ${res.statusCode} ${errBody}`));
                });
                return;
            }

            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('Failed to parse JSON from S3'));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
};

/**
 * 从 S3 删除文件
 */
export const deleteFile = async (key: string): Promise<void> => {
    const { host, region, accessKey, secretKey } = getConfig();
    const uri = `/${encodeKey(key)}`; // 🔥 Fix: Encode key
    const headers = signV4('DELETE', uri, host, region, accessKey, secretKey);

    return new Promise((resolve, reject) => {
        const req = https.request({
            host,
            path: uri,
            method: 'DELETE',
            headers
        }, (res) => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
            } else {
                reject(new Error(`S3 delete failed: ${res.statusCode}`));
            }
        });
        req.on('error', reject);
        req.end();
    });
};
