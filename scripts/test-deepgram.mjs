import { createClient } from '@deepgram/sdk';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "YOUR_KEY_HERE";
const DEFAULT_URL = "https://static.deepgram.com/examples/interview_speech-analytics.wav";

// Prioritize command line arg
// Use trim() to clean up any accidental spaces from copy-paste
const argUrl = process.argv[2] ? process.argv[2].trim() : "";
const TARGET_URL = argUrl.startsWith('http') ? argUrl : DEFAULT_URL;

async function testDeepgram() {
    let keyToUse = DEEPGRAM_API_KEY;
    if (!keyToUse || keyToUse.includes("YOUR_KEY")) {
        console.error("❌ Error: DEEPGRAM_API_KEY is missing.");
        return;
    }
    if (keyToUse.trim() !== keyToUse) keyToUse = keyToUse.trim();
    const deepgram = createClient(keyToUse);

    console.log(`\n--- Testing with URL ---`);
    console.log(`URL: ${TARGET_URL}`);

    if (TARGET_URL === DEFAULT_URL && argUrl !== "") {
        console.warn(`warning: provided argument '${argUrl}' does not look like a URL, using default.`);
    }

    try {
        const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
            { url: TARGET_URL },
            { model: 'nova-2', smart_format: true, language: 'ko' }
        );

        if (error) throw new Error(JSON.stringify(error));

        // Check deepgram structure
        if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
            throw new Error("No results in response");
        }

        const transcript = result.results.channels[0].alternatives[0].transcript;
        console.log("✅ Success!");
        console.log(`Transcript Length: ${transcript.length}`);
        console.log(`Sample: ${transcript.substring(0, 100)}...`);

    } catch (err) {
        console.error("❌ Failed:", err);
    }
}

testDeepgram();
