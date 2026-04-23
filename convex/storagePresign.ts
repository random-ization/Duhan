import { ConvexError } from 'convex/values';
import {
  getSpacesCdnBaseUrl,
  getSpacesCoreConfig,
  getSpacesHost,
  getSpacesRegion,
} from './spacesConfig';
import { getSignatureKey, hmacSha256Hex, sha256Hex } from './awsSigV4';

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
  method?: 'PUT';
  headers: {
    'Content-Type': string;
  };
};

export async function createPresignedUploadUrl(args: PresignArgs): Promise<PresignResult> {
  const spaces = getSpacesCoreConfig();
  const region = getSpacesRegion();
  if (!spaces || !region) {
    throw new ConvexError({ code: 'STORAGE_CONFIG_MISSING' });
  }
  const { endpoint, bucket, accessKeyId, secretAccessKey } = spaces;

  const folder = args.folder || 'uploads';
  const key = args.key ?? `${folder}/${Date.now()}-${args.filename}`;

  const service = 's3';
  const now = new Date();
  const amzDate = now.toISOString().split('.')[0].replaceAll(/[:-]/g, '') + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const host = getSpacesHost(endpoint);
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
  queryParams.set('X-Amz-SignedHeaders', 'host');

  const sortedQuery = Array.from(queryParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
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
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacSha256Hex(signingKey, stringToSign);

  const uploadUrl = `https://${endpointHost}${uri}?${sortedQuery}&X-Amz-Signature=${signature}`;
  const cdnUrl = getSpacesCdnBaseUrl(bucket, host);
  const publicUrl = `${cdnUrl}${uri}`;

  return {
    uploadUrl,
    publicUrl,
    key,
    method: 'PUT',
    headers: {
      'Content-Type': args.contentType,
    },
  };
}
