'use node';
import { action } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import crypto from 'node:crypto';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { Document, Page, View, Text, Image, Font } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { getAuthUserId } from '@convex-dev/auth/server';
import {
  getLabels,
  shuffleInPlace,
  getMeaningForLanguage,
  inferCategory,
  uploadPdfToSpaces,
  renderPdfToBuffer,
  getCategoryLabel,
  getModeLabel,
} from './pdfHelpers';

// Query typing
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

    const {
      PDF_FONT_LATIN_URL: fontLatinUrl,
      PDF_FONT_SC_URL: fontScUrl,
      PDF_FONT_KR_URL: fontKrUrl,
      SITE_URL,
      PDF_LOGO_URL,
    } = process.env;

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

    const platformUrl = SITE_URL || args.origin;
    const logoUrl = PDF_LOGO_URL || args.logoUrl || `${platformUrl}/logo.png`;

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

    const categoryLabel = getCategoryLabel(args.category, args.language);
    const modeLabel = getModeLabel(args.mode, args.language);
    const subtitleParts = [categoryLabel, modeLabel];
    if (args.q) subtitleParts.push(args.q);
    const subtitle = subtitleParts.join(' · ');

    const rowsPerCol = 26;
    const isFoldDictation = args.mode === 'A4_DICTATION';
    const rowsPerPage = isFoldDictation ? rowsPerCol : rowsPerCol * 2;
    const pageCount = Math.ceil(filtered.length / rowsPerPage);

    const baseFont = args.language === 'zh' ? 'NotoSansSC' : 'NotoSans';
    const meaningFont = args.language === 'zh' ? 'NotoSansSC' : 'NotoSans';

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
        {Array.from({ length: pageCount }).map((_, pageIndex) => {
          const start = pageIndex * rowsPerPage;
          const pageItems = filtered.slice(start, start + rowsPerPage);
          const leftItems = pageItems.slice(0, rowsPerCol);
          const rightItems = isFoldDictation
            ? leftItems
            : pageItems.slice(rowsPerCol, rowsPerCol * 2);

          const renderTable = (
            half: 'left' | 'right',
            items: typeof filtered,
            baseNo: number,
            styleVariant: 'left' | 'right'
          ) => {
            // Pad items to ensure we fill all rows
            const paddedItems = Array.from({ length: rowsPerCol }).map((_, idx) => {
              const item = items[idx];
              if (item) return { ...item, type: 'data', displayIndex: baseNo + idx };
              return {
                id: `empty-${baseNo}-${idx}`,
                word: '',
                meaning: '',
                type: 'empty',
                displayIndex: baseNo + idx,
              };
            });

            return (
              <View style={styleVariant === 'left' ? s.tableLeft : s.table}>
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
                {paddedItems.map(it => {
                  const isAlt = (it.displayIndex - 1) % 2 === 1; // 1-based index even/odd
                  return (
                    <View key={it.id} style={isAlt ? [s.row, s.alt] : s.row}>
                      <View style={s.cellNo}>
                        <Text style={s.noText}>
                          {it.type === 'data' ? String(it.displayIndex) : ''}
                        </Text>
                      </View>
                      <View style={s.cellWord}>
                        <Text style={s.wordText}>
                          {it.type === 'data' && showWord(half) ? it.word : ''}
                        </Text>
                      </View>
                      <View style={s.cellMeaning}>
                        <Text style={s.meaningText}>
                          {it.type === 'data' && showMeaning(half) ? it.meaning : ''}
                        </Text>
                      </View>
                      <View style={s.cellCheck}>
                        <View style={s.checkBox} />
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          };

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
    if (pdfBuffer.byteLength < 5000) {
      // check
    }

    const random = crypto.randomBytes(6).toString('hex');
    const key = `exports/vocab-pdf/${userId}/${Date.now()}-${random}.pdf`;
    const url = await uploadPdfToSpaces(pdfBuffer, key, 'vocab-book.pdf');

    return { url };
  },
});
