'use node';
import React from 'react';
import { action } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import crypto from 'crypto';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { pdf, Document, Page, View, Text, Image, Font } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { getAuthUserId } from '@convex-dev/auth/server';

type VocabBookCategory = 'UNLEARNED' | 'DUE' | 'MASTERED';

const getVocabBookForUserQuery = makeFunctionReference<
  'query',
  { userId: string; search?: string; includeMastered?: boolean; limit?: number },
  Array<{
    id: string;
    word: string;
    meaning: string;
    meaningEn?: string;
    meaningVi?: string;
    meaningMn?: string;
    progress: { status: string; state?: number };
  }>
>('vocabPdfQueries:getVocabBookForUser') as unknown as FunctionReference<
  'query',
  'internal',
  { userId: string; search?: string; includeMastered?: boolean; limit?: number },
  Array<{
    id: string;
    word: string;
    meaning: string;
    meaningEn?: string;
    meaningVi?: string;
    meaningMn?: string;
    progress: { status: string; state?: number };
  }>
>;

const getLabels = (language: string, siteUrl: string) => {
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

const shuffleInPlace = <T,>(arr: T[]) => {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
};

const getMeaningForLanguage = (
  item: { meaning: string; meaningEn?: string; meaningVi?: string; meaningMn?: string },
  language: string
) => {
  if (language === 'zh') return item.meaning;
  if (language === 'vi') return item.meaningVi || item.meaning || item.meaningEn || '';
  if (language === 'mn') return item.meaningMn || item.meaning || item.meaningEn || '';
  return item.meaningEn || item.meaning || '';
};

const inferCategory = (progress: { status: string; state?: number }): VocabBookCategory => {
  const isMastered = progress.status === 'MASTERED';
  const isUnlearned = progress.state === 0 || progress.status === 'NEW';
  return isMastered ? 'MASTERED' : isUnlearned ? 'UNLEARNED' : 'DUE';
};

const uploadPdfToSpaces = async (pdfBuffer: Buffer, key: string, filename: string) => {
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
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
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

const renderPdfToBuffer = async (doc: React.ReactElement<DocumentProps>): Promise<Buffer> => {
  const instance = pdf(doc) as unknown as {
    toBuffer?: () => Promise<unknown>;
    toStream?: () => Promise<unknown>;
  };

  if (instance.toStream) {
    const streamResult: unknown = await instance.toStream();
    if (isNodeReadableLike(streamResult)) {
      const readable = streamResult;
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        readable.on('data', (chunk: unknown) => chunks.push(unknownChunkToBuffer(chunk)));
        readable.on('end', () => resolve(Buffer.concat(chunks)));
        readable.on('error', (err: unknown) => reject(err));
      });
      return buffer;
    }
    if (isWebReadableStreamLike(streamResult)) {
      const reader = streamResult.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      return Buffer.concat(chunks.map(c => Buffer.from(c)));
    }
  }

  const result: unknown = await instance.toBuffer?.();

  if (Buffer.isBuffer(result)) return result;
  if (result instanceof Uint8Array) return Buffer.from(result);

  if (isNodeReadableLike(result)) {
    const readable = result;
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      readable.on('data', (chunk: unknown) => {
        chunks.push(unknownChunkToBuffer(chunk));
      });
      readable.on('end', () => resolve(Buffer.concat(chunks)));
      readable.on('error', (err: unknown) => reject(err));
    });

    return buffer;
  }

  if (isWebReadableStreamLike(result)) {
    const reader = result.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map(c => Buffer.from(c)));
  }

  throw new Error('PDF_RENDER_FAILED');
};

export const exportVocabBookPdf = action({
  args: {
    origin: v.string(),
    logoUrl: v.optional(v.string()),
    language: v.string(),
    mode: v.union(v.literal('A4_DICTATION'), v.literal('LANG_LIST'), v.literal('KO_LIST')),
    shuffle: v.boolean(),
    category: v.union(v.literal('UNLEARNED'), v.literal('DUE'), v.literal('MASTERED')),
    q: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError({ code: 'UNAUTHORIZED' });
    }

    const fontLatinUrl = process.env.PDF_FONT_LATIN_URL;
    const fontScUrl = process.env.PDF_FONT_SC_URL;
    const fontKrUrl = process.env.PDF_FONT_KR_URL;

    const missingFonts: string[] = [];
    if (!fontLatinUrl) missingFonts.push('PDF_FONT_LATIN_URL');
    if (!fontScUrl) missingFonts.push('PDF_FONT_SC_URL');
    if (!fontKrUrl) missingFonts.push('PDF_FONT_KR_URL');
    if (missingFonts.length > 0) {
      throw new ConvexError({
        code: 'PDF_FONT_MISSING',
        message: `Missing env: ${missingFonts.join(', ')}`,
      });
    }

    Font.register({ family: 'NotoSans', src: fontLatinUrl! });
    Font.register({ family: 'NotoSansSC', src: fontScUrl! });
    Font.register({ family: 'NotoSansKR', src: fontKrUrl! });

    const platformUrl = process.env.SITE_URL || args.origin;
    const logoUrl = process.env.PDF_LOGO_URL || args.logoUrl || `${platformUrl}/logo.png`;

    const raw = await ctx.runQuery(getVocabBookForUserQuery, {
      userId,
      includeMastered: true,
      search: args.q || undefined,
    });

    const filtered = raw
      .filter(it => inferCategory(it.progress) === args.category)
      .map(it => ({
        id: it.id,
        word: (it.word || '').trim(),
        meaning: getMeaningForLanguage(it, args.language).trim(),
      }))
      .filter(it => it.word && it.meaning);

    if (filtered.length === 0) {
      throw new ConvexError({ code: 'NO_WORDS' });
    }

    if (args.shuffle) shuffleInPlace(filtered);

    const qrDataUrl = await QRCode.toDataURL(platformUrl, { margin: 0, width: 256 });
    const labels = getLabels(args.language, platformUrl);

    const subtitleParts: string[] = [];
    subtitleParts.push(
      args.category === 'DUE'
        ? args.language === 'zh'
          ? '待复习'
          : 'Due'
        : args.category === 'UNLEARNED'
          ? args.language === 'zh'
            ? '未学习'
            : 'Unlearned'
          : args.language === 'zh'
            ? '已掌握'
            : 'Mastered'
    );
    subtitleParts.push(
      args.mode === 'A4_DICTATION'
        ? args.language === 'zh'
          ? 'A4 默写'
          : 'A4 Dictation'
        : args.mode === 'KO_LIST'
          ? args.language === 'zh'
            ? '韩语词表'
            : 'Korean List'
          : args.language === 'zh'
            ? '语言词表'
            : 'Language List'
    );
    if (args.q) subtitleParts.push(args.q);
    const subtitle = subtitleParts.join(' · ');

    const rowsPerCol = 26;
    const isFoldDictation = args.mode === 'A4_DICTATION';
    const rowsPerPage = isFoldDictation ? rowsPerCol : rowsPerCol * 2;
    const pageCount = Math.ceil(filtered.length / rowsPerPage);

    const meaningFont = args.language === 'zh' ? 'NotoSansSC' : 'NotoSans';
    const baseFont = args.language === 'zh' ? 'NotoSansSC' : 'NotoSans';

    const showWord = (half: 'left' | 'right') => {
      if (args.mode === 'KO_LIST') return true;
      if (args.mode === 'LANG_LIST') return false;
      return half === 'left';
    };

    const showMeaning = (half: 'left' | 'right') => {
      if (args.mode === 'KO_LIST') return false;
      if (args.mode === 'LANG_LIST') return true;
      return half === 'right';
    };

    const s = {
      page: { paddingTop: 28, paddingHorizontal: 28, paddingBottom: 72, fontFamily: baseFont },
      header: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        marginBottom: 12,
      },
      title: { fontSize: 16, fontFamily: baseFont, fontWeight: 700, color: '#0f172a' },
      subtitle: {
        marginTop: 4,
        fontSize: 9,
        color: '#64748b',
        fontWeight: 700,
        fontFamily: baseFont,
      },
      qrWrap: { alignItems: 'flex-end' as const },
      qr: { width: 52, height: 52 },
      domain: {
        marginTop: 4,
        fontSize: 8,
        color: '#334155',
        fontWeight: 700,
        fontFamily: baseFont,
      },
      slogan: { marginTop: 2, fontSize: 7, color: '#64748b', fontFamily: baseFont },
      tables: { flexDirection: 'row' as const },
      table: { width: 260, borderWidth: 1, borderColor: '#e2e8f0' },
      tableLeft: { width: 260, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 16 },
      rowHead: { flexDirection: 'row' as const, backgroundColor: '#fdab8a' },
      row: { flexDirection: 'row' as const },
      cellNo: {
        width: 24,
        paddingVertical: 5,
        paddingHorizontal: 6,
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      },
      cellWord: {
        flex: 1,
        paddingVertical: 5,
        paddingHorizontal: 6,
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0',
      },
      cellMeaning: {
        flex: 1.2,
        paddingVertical: 5,
        paddingHorizontal: 6,
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0',
      },
      cellCheck: {
        width: 18,
        paddingVertical: 5,
        paddingHorizontal: 6,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      },
      headText: {
        fontSize: 9,
        color: '#ffffff',
        fontWeight: 700,
        textAlign: 'center' as const,
        fontFamily: baseFont,
      },
      noText: { fontSize: 9, color: '#0f172a', textAlign: 'center' as const },
      wordText: { fontSize: 9, color: '#0f172a', fontFamily: 'NotoSansKR' },
      meaningText: { fontSize: 9, color: '#0f172a', fontFamily: meaningFont },
      checkBox: { width: 10, height: 10, borderWidth: 1, borderColor: '#cbd5e1' },
      alt: { backgroundColor: '#fff0ea' },
      footer: {
        position: 'absolute' as const,
        left: 28,
        right: 28,
        bottom: 20,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
      },
      logo: { width: 24, height: 24 },
      footerTextWrap: { marginLeft: 10 },
      footerName: { fontSize: 10, fontWeight: 700, color: '#0f172a', fontFamily: baseFont },
      footerDesc: { marginTop: 2, fontSize: 8, color: '#64748b', fontFamily: baseFont },
      footerLink: { marginTop: 2, fontSize: 8, color: '#2563eb', fontFamily: baseFont },
    };

    const Doc = (
      <Document>
        {Array.from({ length: pageCount }, (_, pageIndex) => {
          const start = pageIndex * rowsPerPage;
          const pageItems = filtered.slice(start, start + rowsPerPage);
          const leftItems = pageItems.slice(0, rowsPerCol);
          const rightItems = isFoldDictation
            ? leftItems
            : pageItems.slice(rowsPerCol, rowsPerCol * 2);

          const renderTable = (
            half: 'left' | 'right',
            data: typeof filtered,
            baseNo: number,
            variant: 'left' | 'right'
          ) => (
            <View style={variant === 'left' ? s.tableLeft : s.table}>
              <View style={s.rowHead}>
                <View style={s.cellNo}>
                  <Text style={s.headText}>#</Text>
                </View>
                <View style={s.cellWord}>
                  <Text style={s.headText}>{labels.wordHeader}</Text>
                </View>
                <View style={s.cellMeaning}>
                  <Text style={s.headText}>{labels.meaningHeader}</Text>
                </View>
                <View style={s.cellCheck}>
                  <Text style={s.headText}> </Text>
                </View>
              </View>

              {Array.from({ length: rowsPerCol }, (_, rowIdx) => {
                const it = data[rowIdx];
                const no = baseNo + rowIdx;
                const isAlt = rowIdx % 2 === 1;
                return (
                  <View key={rowIdx} style={isAlt ? [s.row, s.alt] : s.row}>
                    <View style={s.cellNo}>
                      <Text style={s.noText}>{it ? String(no) : ''}</Text>
                    </View>
                    <View style={s.cellWord}>
                      <Text style={s.wordText}>{it && showWord(half) ? it.word : ''}</Text>
                    </View>
                    <View style={s.cellMeaning}>
                      <Text style={s.meaningText}>{it && showMeaning(half) ? it.meaning : ''}</Text>
                    </View>
                    <View style={s.cellCheck}>
                      <View style={s.checkBox} />
                    </View>
                  </View>
                );
              })}
            </View>
          );

          return (
            <Page key={pageIndex} size="A4" style={s.page}>
              <View style={s.header}>
                <View>
                  <Text style={s.title}>{labels.title}</Text>
                  <Text style={s.subtitle}>{subtitle}</Text>
                </View>
                <View style={s.qrWrap}>
                  <Image style={s.qr} src={qrDataUrl} />
                  <Text style={s.domain}>{labels.domain}</Text>
                  <Text style={s.slogan}>{labels.slogan}</Text>
                </View>
              </View>

              <View style={s.tables}>
                {renderTable('left', leftItems, start + 1, 'left')}
                {renderTable('right', rightItems, start + 1, 'right')}
              </View>

              <View style={s.footer}>
                <Image style={s.logo} src={logoUrl} />
                <View style={s.footerTextWrap}>
                  <Text style={s.footerName}>{labels.footerName}</Text>
                  <Text style={s.footerDesc}>{labels.footerDesc}</Text>
                  <Text style={s.footerLink}>{labels.footerLink}</Text>
                </View>
              </View>
            </Page>
          );
        })}
      </Document>
    );

    const pdfBuffer = await renderPdfToBuffer(Doc);
    if (pdfBuffer.byteLength < 20000) {
      throw new ConvexError({
        code: 'PDF_RENDER_EMPTY',
        message: `Rendered PDF too small (${pdfBuffer.byteLength} bytes) for ${filtered.length} words`,
      });
    }

    const random = crypto.randomBytes(6).toString('hex');
    const key = `exports/vocab-pdf/${userId}/${Date.now()}-${random}.pdf`;
    const url = await uploadPdfToSpaces(pdfBuffer, key, 'vocab-book.pdf');

    return { url };
  },
});
