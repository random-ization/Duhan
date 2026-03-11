type SpacesCoreConfig = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export function getSpacesCoreConfig(): SpacesCoreConfig | null {
  const endpoint = process.env.SPACES_ENDPOINT;
  const bucket = process.env.SPACES_BUCKET;
  const accessKeyId = process.env.SPACES_KEY;
  const secretAccessKey = process.env.SPACES_SECRET;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
  };
}

export function getSpacesRegion(): string | null {
  return process.env.SPACES_REGION || null;
}

export function getSpacesHost(endpoint: string): string {
  return new URL(endpoint).host;
}

export function toSpacesCdnHost(host: string): string {
  return host.replace('digitaloceanspaces.com', 'cdn.digitaloceanspaces.com');
}

export function getSpacesCdnBaseUrl(bucket: string, host: string): string {
  return process.env.SPACES_CDN_URL || `https://${bucket}.${toSpacesCdnHost(host)}`;
}
