declare module 'node-webvtt' {
    interface VttCue {
        identifier: string;
        start: number;
        end: number;
        text: string;
        styles: string;
    }

    interface VttResult {
        valid: boolean;
        strict: boolean;
        cues: VttCue[];
        errors: any[];
    }

    export function parse(input: string, options?: { strict?: boolean }): VttResult;
    export function compile(input: VttResult): string;
    export function hms(seconds: number): string;
    export function parse_timestamp(timestamp: string): number;
}
