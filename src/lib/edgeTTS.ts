/**
 * Browser-side Edge TTS Client
 * Connects directly to Microsoft Edge TTS WebSocket API from the browser
 * 
 * This bypasses Convex limitations by making the WebSocket connection
 * directly from the user's browser (which has correct Origin headers)
 */

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }).replace(/-/g, '');
}

function createSSML(text: string, voice: string, rate: string = "+0%", pitch: string = "+0Hz"): string {
    const escapedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voice}">
            <prosody rate="${rate}" pitch="${pitch}">
                ${escapedText}
            </prosody>
        </voice>
    </speak>`;
}

export interface EdgeTTSOptions {
    voice?: string;
    rate?: string;  // e.g., "+20%", "-10%"
    pitch?: string; // e.g., "+5Hz", "-10Hz"
}

/**
 * Synthesize speech using Microsoft Edge TTS
 * Returns a Blob containing MP3 audio
 */
export async function synthesizeSpeech(
    text: string,
    options: EdgeTTSOptions = {}
): Promise<Blob> {
    const voice = options.voice || "ko-KR-SunHiNeural";
    const rate = options.rate || "+0%";
    const pitch = options.pitch || "+0Hz";

    const requestId = generateUUID();
    const connectionId = generateUUID();

    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connectionId}`;

    return new Promise((resolve, reject) => {
        const audioChunks: Uint8Array[] = [];
        let resolved = false;

        const ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';

        const safeResolve = (result: Blob | Error) => {
            if (!resolved) {
                resolved = true;
                ws.close();
                if (result instanceof Error) {
                    reject(result);
                } else {
                    resolve(result);
                }
            }
        };

        ws.onopen = () => {
            // Send configuration message
            const configMessage = `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
            ws.send(configMessage);

            // Send SSML request
            const ssml = createSSML(text, voice, rate, pitch);
            const ssmlMessage = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;
            ws.send(ssmlMessage);
        };

        ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                // Binary message - contains header + audio data
                const data = new Uint8Array(event.data);

                // Extract audio data (skip 2-byte header length + header text)
                // Format: [2 bytes length][header text][audio data]
                if (data.length > 2) {
                    const headerLen = (data[0] << 8) | data[1];
                    if (headerLen + 2 < data.length) {
                        const audioData = data.slice(headerLen + 2);
                        if (audioData.length > 0) {
                            audioChunks.push(audioData);
                        }
                    }
                }
            } else if (typeof event.data === 'string') {
                // Text message - check for end signal
                if (event.data.includes('Path:turn.end')) {
                    if (audioChunks.length > 0) {
                        const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
                        const audioBuffer = new Uint8Array(totalLength);
                        let offset = 0;
                        for (const chunk of audioChunks) {
                            audioBuffer.set(chunk, offset);
                            offset += chunk.length;
                        }
                        safeResolve(new Blob([audioBuffer], { type: 'audio/mp3' }));
                    } else {
                        safeResolve(new Error('No audio data received'));
                    }
                }
            }
        };

        ws.onerror = (event) => {
            console.error('Edge TTS WebSocket error:', event);
            safeResolve(new Error('WebSocket connection failed'));
        };

        ws.onclose = () => {
            if (!resolved) {
                if (audioChunks.length > 0) {
                    const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
                    const audioBuffer = new Uint8Array(totalLength);
                    let offset = 0;
                    for (const chunk of audioChunks) {
                        audioBuffer.set(chunk, offset);
                        offset += chunk.length;
                    }
                    safeResolve(new Blob([audioBuffer], { type: 'audio/mp3' }));
                } else {
                    safeResolve(new Error('Connection closed without audio'));
                }
            }
        };

        // Timeout after 30 seconds
        setTimeout(() => {
            safeResolve(new Error('TTS synthesis timeout'));
        }, 30000);
    });
}

/**
 * Play synthesized speech directly
 */
export async function speakText(text: string, options: EdgeTTSOptions = {}): Promise<void> {
    try {
        const audioBlob = await synthesizeSpeech(text, options);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        return new Promise((resolve, reject) => {
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                resolve();
            };
            audio.onerror = (e) => {
                URL.revokeObjectURL(audioUrl);
                reject(e);
            };
            audio.play().catch(reject);
        });
    } catch (error) {
        console.error('Edge TTS failed, falling back to browser TTS:', error);
        // Fallback to browser TTS
        return new Promise((resolve) => {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ko-KR';
                utterance.rate = 0.9;
                utterance.onend = () => resolve();
                utterance.onerror = () => resolve();
                speechSynthesis.speak(utterance);
            } else {
                resolve();
            }
        });
    }
}

// Available Korean voices
export const KOREAN_VOICES = [
    { id: "ko-KR-SunHiNeural", name: "SunHi", gender: "Female" },
    { id: "ko-KR-InJoonNeural", name: "InJoon", gender: "Male" },
    { id: "ko-KR-HyunsuNeural", name: "Hyunsu", gender: "Male" },
];

// Available Chinese voices
export const CHINESE_VOICES = [
    { id: "zh-CN-XiaoxiaoNeural", name: "Xiaoxiao", gender: "Female" },
    { id: "zh-CN-YunxiNeural", name: "Yunxi", gender: "Male" },
];
