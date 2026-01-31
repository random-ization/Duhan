'use node';
import React from 'react';
import { ConvexError } from 'convex/values';
import crypto from 'node:crypto';
import { pdf } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';

export type VocabBookCategory = 'UNLEARNED' | 'DUE' | 'MASTERED';

export const getLabels = (language: string, siteUrl: string) => {
    const domain = siteUrl.replace(/^https?:\/\//, '');
    if (language === 'zh') {
        return {
            title: '单词学习表',
            wordHeader: '韩语',
            meaningHeader: '释义',
            slogan: '每天 10 分钟，轻松学韩语',
            footerName: 'DuHan',
            footerDesc: '韩语学习平台 · 生词本/刷词/听写',
            footerLink: siteUrl,
            domain,
        };
    }
    if (language === 'vi') {
        return {
            title: 'Bảng học từ',
            wordHeader: 'Tiếng Hàn',
            meaningHeader: 'Nghĩa',
            slogan: '10 phút mỗi ngày, học tiếng Hàn dễ dàng',
            footerName: 'DuHan',
            footerDesc: 'Nền tảng học tiếng Hàn · Sổ từ/Ôn tập/Nghe chép',
            footerLink: siteUrl,
            domain,
        };
    }
    if (language === 'mn') {
        return {
            title: 'Үг сурах хүснэгт',
            wordHeader: 'Солонгос',
            meaningHeader: 'Утга',
            slogan: 'Өдөрт 10 минут, солонгос хэлийг амархан сур',
            footerName: 'DuHan',
            footerDesc: 'Солонгос хэл сурах платформ · Үгийн дэвтэр/Давталт/Диктант',
            footerLink: siteUrl,
            domain,
        };
    }
    return {
        title: 'Word Study Sheet',
        wordHeader: 'Korean',
        meaningHeader: 'Meaning',
        slogan: '10 minutes a day, learn Korean easily',
        footerName: 'DuHan',
        footerDesc: 'Korean learning platform · Vocab book/Review/Dictation',
        footerLink: siteUrl,
        domain,
    };
};

export const shuffleInPlace = <T,>(arr: T[]) => {
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = crypto.randomInt(0, i + 1);
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
};

export const getMeaningForLanguage = (
    item: { meaning: string; meaningEn?: string; meaningVi?: string; meaningMn?: string },
    language: string
) => {
    if (language === 'zh') return item.meaning;
    if (language === 'vi') return item.meaningVi || item.meaning || item.meaningEn || '';
    if (language === 'mn') return item.meaningMn || item.meaning || item.meaningEn || '';
    return item.meaningEn || item.meaning || '';
};

export const inferCategory = (progress: { status: string; state?: number }): VocabBookCategory => {
    if (progress.status === 'MASTERED') return 'MASTERED';
    if (progress.state === 0 || progress.status === 'NEW') return 'UNLEARNED';
    return 'DUE';
};

export const uploadPdfToSpaces = async (pdfBuffer: Buffer, key: string, filename: string) => {
    const endpoint = process.env.SPACES_ENDPOINT;
    const bucket = process.env.SPACES_BUCKET;
    const accessKeyId = process.env.SPACES_KEY;
    const secretAccessKey = process.env.SPACES_SECRET;

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
        throw new ConvexError({ code: 'STORAGE_CONFIG_MISSING' });
    }

    const region = 'us-east-1';
    const service = 's3';
    const contentType = 'application/pdf';

    const now = new Date();
    const amzDate = now.toISOString().replaceAll(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const host = new URL(endpoint).host;
    const endpointHost = `${bucket}.${host}`;
    const uri = `/${key}`;

    const payloadHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    const canonicalHeaders = `host:${endpointHost}\nx-amz-acl:public-read\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-acl;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = ['PUT', uri, '', canonicalHeaders, signedHeaders, payloadHash].join(
        '\n'
    );

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    const stringToSign = [
        algorithm,
        amzDate,
        credentialScope,
        crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

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

    const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const uploadUrl = `https://${endpointHost}${uri}`;

    const body = new Uint8Array(pdfBuffer);

    const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            Host: endpointHost,
            'x-amz-acl': 'public-read',
            'x-amz-content-sha256': payloadHash,
            'x-amz-date': amzDate,
            Authorization: authorization,
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.byteLength.toString(),
        },
        body,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`S3 upload failed: ${response.status} ${errorText}`);
    }

    const cdnUrl =
        process.env.SPACES_CDN_URL ||
        `https://${bucket}.${host.replace('digitaloceanspaces.com', 'cdn.digitaloceanspaces.com')}`;

    return `${cdnUrl}/${key}`;
};

type NodeReadableLike = {
    on: (event: string, cb: (...args: unknown[]) => void) => unknown;
    pipe?: (dest: unknown) => unknown;
    end?: () => unknown;
};

type WebReadableStreamLike = {
    getReader: () => { read: () => Promise<{ done: boolean; value?: Uint8Array }> };
};

const isNodeReadableLike = (x: unknown): x is NodeReadableLike =>
    typeof x === 'object' &&
    x !== null &&
    'on' in x &&
    typeof (x as { on: unknown }).on === 'function' &&
    'pipe' in x &&
    typeof (x as { pipe: unknown }).pipe === 'function';

const isWebReadableStreamLike = (x: unknown): x is WebReadableStreamLike =>
    typeof x === 'object' &&
    x !== null &&
    'getReader' in x &&
    typeof (x as { getReader: unknown }).getReader === 'function';

const unknownChunkToBuffer = (chunk: unknown): Buffer => {
    if (Buffer.isBuffer(chunk)) return chunk;
    if (chunk instanceof Uint8Array) return Buffer.from(chunk);
    if (chunk instanceof ArrayBuffer) return Buffer.from(new Uint8Array(chunk));
    if (typeof chunk === 'string') return Buffer.from(chunk);
    return Buffer.from(String(chunk));
};

const readStreamChunks = async (
    stream: NodeReadableLike | WebReadableStreamLike
): Promise<Buffer> => {
    if (isNodeReadableLike(stream)) {
        return new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            stream.on('data', (chunk: unknown) => chunks.push(unknownChunkToBuffer(chunk)));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', (err: unknown) => reject(err));
        });
    }
    if (isWebReadableStreamLike(stream)) {
        const reader = stream.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
        }
        return Buffer.concat(chunks.map(c => Buffer.from(c)));
    }
    throw new Error('UNKNOWN_STREAM_TYPE');
};

export const renderPdfToBuffer = async (
    doc: React.ReactElement<DocumentProps>
): Promise<Buffer> => {
    const instance = pdf(doc) as unknown as {
        toBuffer?: () => Promise<unknown>;
        toStream?: () => Promise<unknown>;
    };

    if (instance.toStream) {
        const streamResult = (await instance.toStream()) as NodeReadableLike | WebReadableStreamLike;
        return readStreamChunks(streamResult);
    }

    const result = await instance.toBuffer?.();
    if (Buffer.isBuffer(result)) return result;
    if (result instanceof Uint8Array) return Buffer.from(result);

    if (isNodeReadableLike(result) || isWebReadableStreamLike(result)) {
        return readStreamChunks(result);
    }

    throw new Error('PDF_RENDER_FAILED');
};

export const getCategoryLabel = (category: string, language: string) => {
    if (category === 'DUE') {
        return language === 'zh' ? '待复习' : 'Due';
    }
    if (category === 'UNLEARNED') {
        return language === 'zh' ? '未学习' : 'Unlearned';
    }
    return language === 'zh' ? '已掌握' : 'Mastered';
};

export const getModeLabel = (mode: string, language: string) => {
    if (mode === 'A4_DICTATION') {
        return language === 'zh' ? 'A4 默写' : 'A4 Dictation';
    }
    if (mode === 'KO_LIST') {
        return language === 'zh' ? '韩语词表' : 'Korean List';
    }
    return language === 'zh' ? '语言词表' : 'Language List';
};
