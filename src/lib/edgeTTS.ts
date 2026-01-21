/**
 * Browser-side Edge TTS Client
 * Connects directly to Microsoft Edge TTS WebSocket API from the browser
 *
 * This bypasses Convex limitations by making the WebSocket connection
 * directly from the user's browser (which has correct Origin headers)
 */

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
    .replace(/-/g, '');
}

function createSSML(
  text: string,
  voice: string,
  rate: string = '+0%',
  pitch: string = '+0Hz'
): string {
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

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
  rate?: string; // e.g., "+20%", "-10%"
  pitch?: string; // e.g., "+5Hz", "-10Hz"
}

class TTSClient {
  private ws: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (blob: Blob) => void;
      reject: (err: Error) => void;
      chunks: Uint8Array[];
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly INACTIVITY_TIMEOUT_MS = 30000;

  private resetInactivityTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => this.disconnect(), this.INACTIVITY_TIMEOUT_MS);
  }

  private disconnect() {
    if (this.ws) {
      console.log('EdgeTTS: Disconnecting due to inactivity');
      this.ws.close();
      this.ws = null;
      this.connectPromise = null;
    }
  }

  private extractRequestId(header: string): string | null {
    const match = /X-RequestId:([a-f0-9-]+)/i.exec(header);
    return match ? match[1] : null;
  }

  private combineChunks(chunks: Uint8Array[]): Blob {
    if (chunks.length === 0) return new Blob([], { type: 'audio/mp3' });
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const audioBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      audioBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    return new Blob([audioBuffer], { type: 'audio/mp3' });
  }

  private async ensureConnection(): Promise<void> {
    this.resetInactivityTimer();

    if (this.ws?.readyState === WebSocket.OPEN) return;

    // If connecting, return existing promise
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      const connectionId = generateUUID();
      const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connectionId}`;
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        this.ws = ws;
        // Send configuration message
        const configMessage = `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
        ws.send(configMessage);
        resolve();
      };

      ws.onerror = e => {
        console.error('EdgeTTS Connection Error', e);
        if (this.ws !== ws) {
          // Only reject if this specific connection attempt failed
          this.connectPromise = null;
          reject(new Error('WebSocket connection failed'));
        }
      };

      ws.onclose = () => {
        // If this was our active connection, cleanup
        if (this.ws === ws) {
          this.ws = null;
          this.connectPromise = null;
        }
        // Fail all pending requests
        for (const [, req] of this.pendingRequests) {
          clearTimeout(req.timer);
          req.reject(new Error('Connection closed unexpectedly'));
        }
        this.pendingRequests.clear();
      };

      ws.onmessage = event => this.handleMessage(event);
    });

    return this.connectPromise;
  }

  private handleMessage(event: MessageEvent) {
    this.resetInactivityTimer();

    if (event.data instanceof ArrayBuffer) {
      const data = new Uint8Array(event.data);
      if (data.length > 2) {
        const headerLen = (data[0] << 8) | data[1];
        const headerBytes = data.slice(2, headerLen + 2);
        const header = new TextDecoder().decode(headerBytes);
        const requestId = this.extractRequestId(header);

        if (requestId && this.pendingRequests.has(requestId)) {
          const audioData = data.slice(headerLen + 2);
          if (audioData.length > 0) {
            this.pendingRequests.get(requestId)!.chunks.push(audioData);
          }
        }
      }
    } else if (typeof event.data === 'string') {
      const requestId = this.extractRequestId(event.data);
      if (event.data.includes('Path:turn.end')) {
        if (requestId && this.pendingRequests.has(requestId)) {
          const req = this.pendingRequests.get(requestId)!;
          clearTimeout(req.timer); // Clear request timeout
          const blob = this.combineChunks(req.chunks);
          req.resolve(blob);
          this.pendingRequests.delete(requestId);
        }
      }
    }
  }

  public async synthesize(text: string, options: EdgeTTSOptions): Promise<Blob> {
    await this.ensureConnection();
    const requestId = generateUUID();

    return new Promise<Blob>((resolve, reject) => {
      // Set 30s timeout for this specific request
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('TTS synthesis timeout'));
        }
      }, 30000);

      this.pendingRequests.set(requestId, { resolve, reject, chunks: [], timer });

      const voice = options.voice || 'ko-KR-SunHiNeural';
      const rate = options.rate || '+0%';
      const pitch = options.pitch || '+0Hz';

      const ssml = createSSML(text, voice, rate, pitch);
      // NOTE: Key fix - we must include X-RequestId in the SSML message headers so the server echoes it back!
      const ssmlMessage = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;

      try {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          clearTimeout(timer);
          this.pendingRequests.delete(requestId);
          reject(new Error('Connection lost before sending'));
          return;
        }
        this.ws.send(ssmlMessage);
      } catch (e: unknown) {
        clearTimeout(timer);
        this.pendingRequests.delete(requestId);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }
  public async preconnect(): Promise<void> {
    try {
      await this.ensureConnection();
    } catch {
      // Silently fail - will retry on actual speak
    }
  }
}

// Global Singleton Instance
const ttsClient = new TTSClient();

/**
 * Pre-warm the TTS WebSocket connection
 * Call this on component mount to eliminate first-use connection delay
 */
export function preconnectTTS(): void {
  ttsClient.preconnect().catch(() => {});
}

/**
 * Synthesize speech using Microsoft Edge TTS
 * Uses a persistent connection pool with auto-disconnect
 * Returns a Blob containing MP3 audio
 */
export async function synthesizeSpeech(text: string, options: EdgeTTSOptions = {}): Promise<Blob> {
  return ttsClient.synthesize(text, options);
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
      audio.onerror = e => {
        URL.revokeObjectURL(audioUrl);
        reject(e);
      };
      audio.play().catch(reject);
    });
  } catch (error) {
    console.error('Edge TTS failed, falling back to browser TTS:', error);
    // Fallback to browser TTS
    return new Promise(resolve => {
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
  { id: 'ko-KR-SunHiNeural', name: 'SunHi', gender: 'Female' },
  { id: 'ko-KR-InJoonNeural', name: 'InJoon', gender: 'Male' },
  { id: 'ko-KR-HyunsuNeural', name: 'Hyunsu', gender: 'Male' },
];

// Available Chinese voices
export const CHINESE_VOICES = [
  { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao', gender: 'Female' },
  { id: 'zh-CN-YunxiNeural', name: 'Yunxi', gender: 'Male' },
];
