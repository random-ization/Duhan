'use node';
import { action } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import crypto from 'node:crypto';

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
    const region = process.env.SPACES_REGION;

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !region) {
      throw new ConvexError({ code: 'STORAGE_CONFIG_MISSING' });
    }

    const folder = args.folder || 'uploads';
    const key = `${folder}/${Date.now()}-${args.filename}`;

    console.log(`[Storage] Generating upload URL for ${args.filename} in region: ${region}`);
    const service = 's3';

    const now = new Date();
    // Fix: Remove milliseconds strict AWS ISO8601BasicFormat (YYYYMMDD'T'HHMMSS'Z')
    // Previous regex was failing to stripping milliseconds
    const amzDate = now.toISOString().split('.')[0].replaceAll(/[:-]/g, '') + 'Z';
    const dateStamp = amzDate.slice(0, 8);

    const host = new URL(endpoint).host;
    const endpointHost = `${bucket}.${host}`;

    // Encode the URI path components (required for S3 signing of special characters)
    const uri = '/' + key.split('/').map(encodeURIComponent).join('/');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const expires = 300; // 5 minutes

    // Query parameters for presigned URL
    const queryParams = new URLSearchParams();
    queryParams.set('X-Amz-Algorithm', algorithm);
    queryParams.set('X-Amz-Credential', `${accessKeyId}/${credentialScope}`);
    queryParams.set('X-Amz-Date', amzDate);
    queryParams.set('X-Amz-Expires', expires.toString());
    queryParams.set('X-Amz-SignedHeaders', 'host');

    const sortedQuery = Array.from(queryParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    const canonicalRequest = [
      'PUT',
      uri,
      sortedQuery,
      `host:${endpointHost}\n`,
      'host',
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
    // Use cdn.digitaloceanspaces.com as requested
    // Logic: ${bucket}.${region}.cdn.digitaloceanspaces.com OR using replacement 
    // User asked to "set cdnUrl to use cdn.digitaloceanspaces.com" based on existing host
    // If endpoint is https://sgp1.digitaloceanspaces.com -> host is sgp1.digitaloceanspaces.com
    // Replaced: sgp1.cdn.digitaloceanspaces.com
    const cdnUrl =
      process.env.SPACES_CDN_URL ||
      `https://${bucket}.${host.replace('digitaloceanspaces.com', 'cdn.digitaloceanspaces.com')}`;
    const publicUrl = `${cdnUrl}${uri}`; // Use encoded URI for public URL as well

    return {
      uploadUrl,
      publicUrl,
      key,
      headers: {
        'Content-Type': args.contentType,
      },
    };
  },
});
