import fetch from 'node-fetch';

const bucket = 'joyhan';
const region = 'sgp1';
// This key matches the file uploaded in Step 828
const key = 'debug/1769396698976-test-upload.txt';
// Construct CDN URL (standard DO format)
const url = `https://${bucket}.${region}.cdn.digitaloceanspaces.com/${key}`;

console.log('Testing Public Read Access...');
console.log('URL:', url);

try {
    const res = await fetch(url);
    console.log('Status:', res.status);
    console.log('Status Text:', res.statusText);
    if (res.ok) {
        const text = await res.text();
        console.log('Content:', text);
    } else {
        console.error('Read Failed!');
    }
} catch (err) {
    console.error('Fetch Error:', err);
}
