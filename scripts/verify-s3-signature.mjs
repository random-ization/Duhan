import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local manually since we are in a standalone script
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim();
    }
});

// Config from env
const endpoint = env.SPACES_ENDPOINT || 'https://sgp1.digitaloceanspaces.com';
const bucket = env.SPACES_BUCKET || 'joyhan';
const accessKeyId = env.SPACES_KEY;
const secretAccessKey = env.SPACES_SECRET;
const region = env.SPACES_REGION || 'sgp1';

console.log('Configuration:');
console.log('Endpoint:', endpoint);
console.log('Bucket:', bucket);
console.log('Region:', region);
console.log('AccessKey:', accessKeyId ? '***' : 'MISSING');
console.log('Secret:', secretAccessKey ? '***' : 'MISSING');

if (!accessKeyId || !secretAccessKey) {
    console.error('Missing keys in .env.local');
    process.exit(1);
}

// Logic from convex/storage.ts
const filename = 'test-upload.txt';
const folder = 'debug';
const key = `${folder}/${Date.now()}-${filename}`;
const service = 's3';

const now = new Date();
const amzDate = now.toISOString().split('.')[0].replace(/[:-]/g, '') + 'Z';
const dateStamp = amzDate.slice(0, 8);

const host = new URL(endpoint).host;
const endpointHost = `${bucket}.${host}`;

// Encode
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

const getSignatureKey = (key, dateStamp, regionName, serviceName) => {
    const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
    return crypto.createHmac('sha256', kService).update('aws4_request').digest();
};

const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

const uploadUrl = `https://${endpointHost}${uri}?${sortedQuery}&X-Amz-Signature=${signature}`;

console.log('\nGenerated Presigned URL:', uploadUrl);

// Generate Curl Command
console.log('\n=== CURL COMMAND TO TEST UPLOAD ===');
console.log(`curl -v -X PUT "${uploadUrl}" -H "Content-Type: text/plain" -d "Hello DigitalOcean"`);
console.log('===================================\n');
