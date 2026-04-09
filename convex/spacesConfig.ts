type SpacesCoreConfig = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type SpacesPublicConfig = {
  endpoint: string;
  bucket: string;
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

export function getSpacesPublicConfig(): SpacesPublicConfig | null {
  const endpoint = process.env.SPACES_ENDPOINT;
  const bucket = process.env.SPACES_BUCKET;

  if (!endpoint || !bucket) {
    return null;
  }

  return {
    endpoint,
    bucket,
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
  const cdnUrl = process.env.SPACES_CDN_URL;
  if (cdnUrl) {
    return cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl;
  }
  return `https://${bucket}.${toSpacesCdnHost(host)}`;
}

export function normalizeStoragePublicUrl(
  inputUrl: string | null | undefined
): string | null | undefined {
  if (!inputUrl) return inputUrl;
  if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
    return inputUrl;
  }

  const spaces = getSpacesPublicConfig();
  const cdnUrl = process.env.SPACES_CDN_URL;
  if (!spaces || !cdnUrl) {
    return inputUrl;
  }

  try {
    const currentUrl = new URL(inputUrl);
    const targetBase = cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl;
    const targetUrl = new URL(targetBase);
    const endpointHost = `${spaces.bucket}.${getSpacesHost(spaces.endpoint)}`;

    const host = currentUrl.host.toLowerCase();
    const isLegacyStorageHost =
      host === endpointHost.toLowerCase() ||
      host.endsWith('.digitaloceanspaces.com') ||
      host.endsWith('.r2.cloudflarestorage.com');

    if (!isLegacyStorageHost) {
      return inputUrl;
    }

    return `${targetUrl.origin}${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
  } catch {
    return inputUrl;
  }
}
