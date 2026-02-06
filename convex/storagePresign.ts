'use node';
import crypto from 'node:crypto';
import { ConvexError } from 'convex/values';

type PresignArgs = {
  filename: string;
  contentType: string;
  folder?: string;
  key?: string;
};

export type PresignResult = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  headers: {
    'Content-Type': string;
    'x-amz-acl': string;
  };
};

export function createPresignedUploadUrl(args: PresignArgs): PresignResult {
  const endpoint = process.env.SPACES_ENDPOINT;
  const bucket = process.env.SPACES_BUCKET;
  const accessKeyId = process.env.SPACES_KEY;
  const secretAccessKey = process.env.SPACES_SECRET;
  const region = process.env.SPACES_REGION;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !region) {
    throw new ConvexError({ code: 'STORAGE_CONFIG_MISSING' });
  }

  const folder = args.folder || 'uploads';
  const key = args.key ?? `${folder}/${Date.now()}-${args.filename}`;
  const acl = 'public-read';

  const service = 's3';
  const now = new Date();
  const amzDate = now.toISOString().split('.')[0].replaceAll(/[:-]/g, '') + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const host = new URL(endpoint).host;
  const endpointHost = `${bucket}.${host}`;
  const uri = '/' + key.split('/').map(encodeURIComponent).join('/');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const expires = 300;

  const queryParams = new URLSearchParams();
  queryParams.set('X-Amz-Algorithm', algorithm);
  queryParams.set('X-Amz-Credential', `${accessKeyId}/${credentialScope}`);
  queryParams.set('X-Amz-Date', amzDate);
  queryParams.set('X-Amz-Expires', expires.toString());
  queryParams.set('X-Amz-SignedHeaders', 'host;x-amz-acl');

  const sortedQuery = Array.from(queryParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const canonicalRequest = [
    'PUT',
    uri,
    sortedQuery,
    `host:${endpointHost}\nx-amz-acl:${acl}\n`,
    'host;x-amz-acl',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  const getSignatureKey = (
    keyValue: string,
    dateStampValue: string,
    regionName: string,
    serviceName: string
  ) => {
    const kDate = crypto
      .createHmac('sha256', 'AWS4' + keyValue)
      .update(dateStampValue)
      .digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
    return crypto.createHmac('sha256', kService).update('aws4_request').digest();
  };

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const uploadUrl = `https://${endpointHost}${uri}?${sortedQuery}&X-Amz-Signature=${signature}`;
  const cdnUrl =
    process.env.SPACES_CDN_URL ||
    `https://${bucket}.${host.replace('digitaloceanspaces.com', 'cdn.digitaloceanspaces.com')}`;
  const publicUrl = `${cdnUrl}${uri}`;

  return {
    uploadUrl,
    publicUrl,
    key,
    headers: {
      'Content-Type': args.contentType,
      'x-amz-acl': acl,
    },
  };
}
