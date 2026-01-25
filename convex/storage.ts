'use node';
import { action } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import crypto from 'crypto';

/**
 * Generate AWS Signature V4 presigned URL for DigitalOcean Spaces
 * This allows frontend to upload directly to S3-compatible storage
 */
export const getUploadUrl = action({
  args: {
    filename: v.string(),
    contentType: v.string(),
    folder: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const endpoint = process.env.SPACES_ENDPOINT;
    const bucket = process.env.SPACES_BUCKET;
    const accessKeyId = process.env.SPACES_KEY;
    const secretAccessKey = process.env.SPACES_SECRET;

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new ConvexError({ code: 'STORAGE_CONFIG_MISSING' });
    }

    const folder = args.folder || 'uploads';
    const key = `${folder}/${Date.now()}-${args.filename}`;
    // FORCE SGP1 to debug production issue (User env var showing us-east-1)
    const region = 'sgp1';
    console.log(`[Storage] Generating upload URL for ${args.filename} in region: ${region}`);
    const service = 's3';

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\\.\\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const host = new URL(endpoint).host;
    const endpointHost = `${bucket}.${host}`;
    const uri = `/${key}`;

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const expires = 300; // 5 minutes

    // Query parameters for presigned URL
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

    const acl = 'public-read';
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

    // Generate signature key
    const getSignatureKey = (
      key: string,
      dateStamp: string,
      regionName: string,
      serviceName: string
    ) => {
      const kDate = crypto
        .createHmac('sha256', 'AWS4' + key)
        .update(dateStamp)
        .digest();
      const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
      const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
      return crypto.createHmac('sha256', kService).update('aws4_request').digest();
    };

    const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    // Build final presigned URL
    const uploadUrl = `https://${endpointHost}${uri}?${sortedQuery}&X-Amz-Signature=${signature}`;

    // CDN URL for reading
    const cdnUrl =
      process.env.SPACES_CDN_URL ||
      `https://${bucket}.${host.replace('digitaloceanspaces.com', 'cdn.digitaloceanspaces.com')}`;
    const publicUrl = `${cdnUrl}/${key}`;

    return {
      uploadUrl,
      publicUrl,
      key,
      headers: {
        'x-amz-acl': acl,
        'Content-Type': args.contentType,
      },
    };
  },
});
