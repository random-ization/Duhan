import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { transcriptInputValidator } from './transcriptSchema';
import { replaceTextbookUnitTranscriptChunks } from './transcriptStorage';

const DEFAULT_YSK_COURSE_ID = 'ysk-1';

const YSK_INSTITUTE_SEED: Record<
  string,
  {
    id: string;
    name: string;
    nameEn: string;
    nameZh: string;
    nameVi: string;
    nameMn: string;
    levels: Array<{ level: number; units: number }>;
    publisher: string;
    displayLevel: string;
    totalUnits: number;
    volume: string;
  }
> = {
  'ysk-1': {
    id: 'ysk-1',
    name: 'You Speak Korean! 1',
    nameEn: 'You Speak Korean! 1',
    nameZh: 'You Speak Korean! 1',
    nameVi: 'You Speak Korean! 1',
    nameMn: 'You Speak Korean! 1',
    levels: [{ level: 1, units: 12 }],
    publisher: '펜실베이니아 대학교',
    displayLevel: '1',
    totalUnits: 12,
    volume: '1',
  },
  'ysk-2': {
    id: 'ysk-2',
    name: 'You Speak Korean! 2',
    nameEn: 'You Speak Korean! 2',
    nameZh: 'You Speak Korean! 2',
    nameVi: 'You Speak Korean! 2',
    nameMn: 'You Speak Korean! 2',
    levels: [{ level: 2, units: 12 }],
    publisher: '펜실베이니아 대학교',
    displayLevel: '2',
    totalUnits: 12,
    volume: '2',
  },
  'ysk-3': {
    id: 'ysk-3',
    name: 'You Speak Korean! 3',
    nameEn: 'You Speak Korean! 3',
    nameZh: 'You Speak Korean! 3',
    nameVi: 'You Speak Korean! 3',
    nameMn: 'You Speak Korean! 3',
    levels: [{ level: 3, units: 12 }],
    publisher: '펜실베이니아 대학교',
    displayLevel: '3',
    totalUnits: 12,
    volume: '3',
  },
  'ysk-4': {
    id: 'ysk-4',
    name: 'You Speak Korean! 4',
    nameEn: 'You Speak Korean! 4',
    nameZh: 'You Speak Korean! 4',
    nameVi: 'You Speak Korean! 4',
    nameMn: 'You Speak Korean! 4',
    levels: [{ level: 4, units: 12 }],
    publisher: '펜실베이니아 대학교',
    displayLevel: '4',
    totalUnits: 12,
    volume: '4',
  },
  'topik-grammar': {
    id: 'topik-grammar',
    name: 'TOPIK Grammar Collection',
    nameEn: 'TOPIK Grammar Collection',
    nameZh: 'TOPIK语法合集',
    nameVi: 'Bộ sưu tập Ngữ pháp TOPIK',
    nameMn: 'TOPIK дүрмийн эмхэтгэл',
    levels: [{ level: 1, units: 6 }],
    publisher: 'TOPIK Grammar Collection',
    displayLevel: 'TOPIK I-II',
    totalUnits: 6,
    volume: '1',
  },
};

function resolveInstituteSeed(courseId: string) {
  return (
    YSK_INSTITUTE_SEED[courseId] ?? {
      id: courseId,
      name: courseId,
      nameEn: courseId,
      nameZh: courseId,
      nameVi: courseId,
      nameMn: courseId,
      levels: [{ level: 1, units: 12 }],
      publisher: 'OER',
      displayLevel: '1',
      totalUnits: 12,
      volume: '1',
    }
  );
}

function normalizeGrammarTitleKey(value: string): string {
  return value.trim().toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ');
}

function isLowQualityText(value: string | undefined): boolean {
  const text = (value || '').trim();
  if (!text) return true;
  if (/^(?:\d+\s*)+$/.test(text)) return true;
  if (/^[0-9]{2,}$/.test(text)) return true;
  if (/^[-–—=~_./\\|]+$/.test(text)) return true;
  if (text.length < 3) return true;
  const compact = text.replace(/\s+/g, '');
  if (!compact) return true;
  const digitRatio = compact.replace(/[^0-9]/g, '').length / compact.length;
  return digitRatio >= 0.5;
}

function hasUsefulGrammarExamples(
  examples:
    | Array<{
        kr: string;
        cn: string;
        en?: string;
        vi?: string;
        mn?: string;
        audio?: string;
      }>
    | undefined
): boolean {
  if (!examples || examples.length === 0) return false;
  return examples.some(example => {
    const kr = example.kr?.trim() || '';
    return kr.length >= 4 && /[가-힣]/.test(kr);
  });
}

export const initInstitute = internalMutation({
  args: {
    courseId: v.optional(v.string()),
    totalUnits: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const courseId = args.courseId || DEFAULT_YSK_COURSE_ID;
    const seed = resolveInstituteSeed(courseId);
    const totalUnitsOverride =
      typeof args.totalUnits === 'number' && Number.isFinite(args.totalUnits) && args.totalUnits > 0
        ? Math.floor(args.totalUnits)
        : null;
    const effectiveTotalUnits = totalUnitsOverride ?? seed.totalUnits;
    const effectiveLevels = seed.levels.map((levelItem, idx) =>
      idx === 0 ? { ...levelItem, units: effectiveTotalUnits } : levelItem
    );

    const existing = await ctx.db
      .query('institutes')
      .withIndex('by_legacy_id', q => q.eq('id', seed.id))
      .unique();

    if (existing) {
      const patch: Partial<typeof existing> = {};
      if (existing.name !== seed.name) patch.name = seed.name;
      if (existing.nameEn !== seed.nameEn) patch.nameEn = seed.nameEn;
      if (existing.nameZh !== seed.nameZh) patch.nameZh = seed.nameZh;
      if (existing.nameVi !== seed.nameVi) patch.nameVi = seed.nameVi;
      if (existing.nameMn !== seed.nameMn) patch.nameMn = seed.nameMn;
      if (existing.publisher !== seed.publisher) patch.publisher = seed.publisher;
      if (existing.displayLevel !== seed.displayLevel) patch.displayLevel = seed.displayLevel;
      if (existing.totalUnits !== effectiveTotalUnits) patch.totalUnits = effectiveTotalUnits;
      if (existing.volume !== seed.volume) patch.volume = seed.volume;
      if (JSON.stringify(existing.levels) !== JSON.stringify(effectiveLevels))
        patch.levels = effectiveLevels;

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }

      return {
        inserted: false,
        instituteId: existing._id,
        courseId: seed.id,
      };
    }

    const instituteId = await ctx.db.insert('institutes', {
      id: seed.id,
      name: seed.name,
      nameEn: seed.nameEn,
      nameZh: seed.nameZh,
      nameVi: seed.nameVi,
      nameMn: seed.nameMn,
      levels: effectiveLevels,
      publisher: seed.publisher,
      displayLevel: seed.displayLevel,
      totalUnits: effectiveTotalUnits,
      volume: seed.volume,
    });

    return {
      inserted: true,
      instituteId,
      courseId: seed.id,
    };
  },
});

export const migrateYsk2UnitIndexToOneBased = internalMutation({
  args: {
    courseId: v.optional(v.string()),
    fromUnitStart: v.optional(v.number()),
    toUnitStart: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const courseId = args.courseId || 'ysk-2';
    const fromUnitStart = Math.max(1, Math.floor(args.fromUnitStart ?? 11));
    const toUnitStart = Math.max(1, Math.floor(args.toUnitStart ?? 1));
    const dryRun = args.dryRun ?? false;
    const delta = fromUnitStart - toUnitStart;

    if (delta <= 0) {
      return {
        success: false,
        reason: 'Invalid range: fromUnitStart must be greater than toUnitStart',
        courseId,
        fromUnitStart,
        toUnitStart,
        dryRun,
      };
    }

    const mapUnit = (unit: number) => (unit >= fromUnitStart ? unit - delta : unit);

    const units = await ctx.db
      .query('textbook_units')
      .withIndex('by_course', q => q.eq('courseId', courseId))
      .collect();
    const hasLowerUnits = units.some(unit => unit.unitIndex < fromUnitStart);
    const candidateUnits = units.filter(unit => unit.unitIndex >= fromUnitStart);

    if (candidateUnits.length === 0) {
      return {
        success: true,
        courseId,
        dryRun,
        applied: false,
        reason: 'No unit index requires migration',
        textbookUnitsUpdated: 0,
        vocabAppearancesUpdated: 0,
        courseGrammarLinksUpdated: 0,
        userCourseProgressUpdated: 0,
      };
    }

    if (hasLowerUnits) {
      return {
        success: true,
        courseId,
        dryRun,
        applied: false,
        reason: 'Detected one-based unit indices already present; skipped to avoid double-shift',
        textbookUnitsUpdated: 0,
        vocabAppearancesUpdated: 0,
        courseGrammarLinksUpdated: 0,
        userCourseProgressUpdated: 0,
      };
    }

    const unitKeyMap = new Map<string, Id<'textbook_units'>>();
    const collisions: string[] = [];
    for (const unit of units) {
      const targetUnit = mapUnit(unit.unitIndex);
      const key = `${targetUnit}::${unit.articleIndex}`;
      const existing = unitKeyMap.get(key);
      if (existing && existing !== unit._id) {
        collisions.push(key);
      } else {
        unitKeyMap.set(key, unit._id);
      }
    }

    if (collisions.length > 0) {
      return {
        success: false,
        courseId,
        dryRun,
        reason: 'Collision detected while remapping unit indices',
        collisions: collisions.slice(0, 20),
        textbookUnitsUpdated: 0,
        vocabAppearancesUpdated: 0,
        courseGrammarLinksUpdated: 0,
        userCourseProgressUpdated: 0,
      };
    }

    let textbookUnitsUpdated = 0;
    for (const unit of candidateUnits) {
      const nextUnitIndex = mapUnit(unit.unitIndex);
      if (nextUnitIndex === unit.unitIndex) continue;
      textbookUnitsUpdated += 1;
      if (!dryRun) {
        await ctx.db.patch(unit._id, { unitIndex: nextUnitIndex });
      }
    }

    const appearances = await ctx.db
      .query('vocabulary_appearances')
      .withIndex('by_course_unit', q => q.eq('courseId', courseId))
      .collect();
    let vocabAppearancesUpdated = 0;
    for (const appearance of appearances) {
      const nextUnitId = mapUnit(appearance.unitId);
      if (nextUnitId === appearance.unitId) continue;
      vocabAppearancesUpdated += 1;
      if (!dryRun) {
        await ctx.db.patch(appearance._id, { unitId: nextUnitId });
      }
    }

    const grammarLinks = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', courseId))
      .collect();
    let courseGrammarLinksUpdated = 0;
    for (const link of grammarLinks) {
      const nextUnitId = mapUnit(link.unitId);
      if (nextUnitId === link.unitId) continue;
      courseGrammarLinksUpdated += 1;
      if (!dryRun) {
        await ctx.db.patch(link._id, { unitId: nextUnitId });
      }
    }

    const userCourseProgress = await ctx.db.query('user_course_progress').collect();
    let userCourseProgressUpdated = 0;
    for (const progress of userCourseProgress) {
      if (progress.courseId !== courseId) continue;
      const nextCompleted = progress.completedUnits.map(mapUnit);
      const nextLast =
        progress.lastUnitIndex !== undefined ? mapUnit(progress.lastUnitIndex) : undefined;
      const completedChanged =
        JSON.stringify(progress.completedUnits) !== JSON.stringify(nextCompleted);
      const lastChanged = progress.lastUnitIndex !== nextLast;
      if (!completedChanged && !lastChanged) continue;

      userCourseProgressUpdated += 1;
      if (!dryRun) {
        await ctx.db.patch(progress._id, {
          completedUnits: nextCompleted,
          lastUnitIndex: nextLast,
        });
      }
    }

    const finalUnitSet = new Set(units.map(unit => mapUnit(unit.unitIndex)));
    const normalizedUnitCount = finalUnitSet.size;
    const institute = await ctx.db
      .query('institutes')
      .withIndex('by_legacy_id', q => q.eq('id', courseId))
      .unique();
    let instituteUpdated = false;
    if (institute) {
      const nextLevels = institute.levels.map((level, idx) =>
        typeof level === 'number'
          ? level
          : idx === 0
            ? { ...level, units: normalizedUnitCount }
            : level
      );

      const patch: Partial<typeof institute> = {};
      if (institute.totalUnits !== normalizedUnitCount) patch.totalUnits = normalizedUnitCount;
      if (JSON.stringify(nextLevels) !== JSON.stringify(institute.levels))
        patch.levels = nextLevels;

      if (Object.keys(patch).length > 0) {
        instituteUpdated = true;
        if (!dryRun) {
          await ctx.db.patch(institute._id, patch);
        }
      }
    }

    return {
      success: true,
      courseId,
      dryRun,
      applied: true,
      fromUnitStart,
      toUnitStart,
      textbookUnitsUpdated,
      vocabAppearancesUpdated,
      courseGrammarLinksUpdated,
      userCourseProgressUpdated,
      normalizedUnitCount,
      instituteUpdated,
    };
  },
});

export const normalizeYskInstituteAndPublisher = internalMutation({
  args: {
    courseId: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const courseId = args.courseId || DEFAULT_YSK_COURSE_ID;
    const dryRun = args.dryRun ?? false;
    const publisherName = '펜실베이니아 대학교';

    const institute = await ctx.db
      .query('institutes')
      .withIndex('by_legacy_id', q => q.eq('id', courseId))
      .unique();

    if (!institute) {
      return {
        success: false,
        courseId,
        reason: 'Institute not found',
      };
    }

    const expectedLevels = [{ level: 1, units: 12 }];
    const institutePatch: Partial<typeof institute> = {};

    if (institute.publisher !== publisherName) institutePatch.publisher = publisherName;
    if (institute.nameEn !== 'You Speak Korean! 1') institutePatch.nameEn = 'You Speak Korean! 1';
    if (institute.nameZh !== 'You Speak Korean! 1') institutePatch.nameZh = 'You Speak Korean! 1';
    if (institute.nameVi !== 'You Speak Korean! 1') institutePatch.nameVi = 'You Speak Korean! 1';
    if (institute.nameMn !== 'You Speak Korean! 1') institutePatch.nameMn = 'You Speak Korean! 1';
    if (institute.displayLevel !== '1') institutePatch.displayLevel = '1';
    if (institute.totalUnits !== 12) institutePatch.totalUnits = 12;
    if (institute.volume !== '1') institutePatch.volume = '1';
    if (JSON.stringify(institute.levels) !== JSON.stringify(expectedLevels)) {
      institutePatch.levels = expectedLevels;
    }

    let instituteUpdated = false;
    if (Object.keys(institutePatch).length > 0) {
      instituteUpdated = true;
      if (!dryRun) {
        await ctx.db.patch(institute._id, institutePatch);
      }
    }

    const publisher = await ctx.db
      .query('publishers')
      .withIndex('by_name', q => q.eq('name', publisherName))
      .first();

    const publisherPayload = {
      name: publisherName,
      nameKo: '펜실베이니아 대학교',
      nameZh: '宾夕法尼亚大学',
      nameEn: 'University of Pennsylvania',
      nameVi: 'Dai hoc Pennsylvania',
      nameMn: 'Пенсильванийн их сургууль',
    };

    let publisherInserted = false;
    let publisherUpdated = false;

    if (!publisher) {
      publisherInserted = true;
      if (!dryRun) {
        await ctx.db.insert('publishers', publisherPayload);
      }
    } else {
      const publisherPatch: Partial<typeof publisher> = {};
      if (publisher.nameKo !== publisherPayload.nameKo)
        publisherPatch.nameKo = publisherPayload.nameKo;
      if (publisher.nameZh !== publisherPayload.nameZh)
        publisherPatch.nameZh = publisherPayload.nameZh;
      if (publisher.nameEn !== publisherPayload.nameEn)
        publisherPatch.nameEn = publisherPayload.nameEn;
      if (publisher.nameVi !== publisherPayload.nameVi)
        publisherPatch.nameVi = publisherPayload.nameVi;
      if (publisher.nameMn !== publisherPayload.nameMn)
        publisherPatch.nameMn = publisherPayload.nameMn;

      if (Object.keys(publisherPatch).length > 0) {
        publisherUpdated = true;
        if (!dryRun) {
          await ctx.db.patch(publisher._id, publisherPatch);
        }
      }
    }

    return {
      success: true,
      courseId,
      dryRun,
      instituteUpdated,
      institutePatchKeys: Object.keys(institutePatch),
      publisherInserted,
      publisherUpdated,
    };
  },
});

export const setYskPublisherLogo = internalMutation({
  args: {
    publisherName: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const publisherName = args.publisherName || '펜실베이니아 대학교';
    const logoUrl =
      args.logoUrl ||
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/University_of_Pennsylvania_logo.svg/512px-University_of_Pennsylvania_logo.svg.png';
    const dryRun = args.dryRun ?? false;

    const publisher = await ctx.db
      .query('publishers')
      .withIndex('by_name', q => q.eq('name', publisherName))
      .first();

    if (!publisher) {
      return {
        success: false,
        dryRun,
        publisherName,
        reason: 'Publisher not found',
      };
    }

    const needsUpdate = publisher.imageUrl !== logoUrl;
    if (needsUpdate && !dryRun) {
      await ctx.db.patch(publisher._id, { imageUrl: logoUrl });
    }

    return {
      success: true,
      dryRun,
      publisherName,
      updated: needsUpdate,
      imageUrl: logoUrl,
    };
  },
});

export const upsertTextbookUnit = internalMutation({
  args: {
    courseId: v.string(),
    unitIndex: v.number(),
    title: v.string(),
    readingText: v.string(),
    articleIndex: v.optional(v.number()),
    audioUrl: v.optional(v.string()),
    translation: v.optional(v.string()),
    translationEn: v.optional(v.string()),
    translationVi: v.optional(v.string()),
    translationMn: v.optional(v.string()),
    transcriptData: v.optional(transcriptInputValidator),
  },
  handler: async (ctx, args) => {
    const articleIndex = args.articleIndex ?? 1;
    const normalizedTitle = args.title.trim().toLowerCase();
    const shouldUpdateTranscript = args.transcriptData !== undefined;

    const applyPatch = async (
      unitId: Id<'textbook_units'>,
      fallbackAudioUrl: string | undefined
    ) => {
      const basePatch = {
        title: args.title,
        readingText: args.readingText,
        translation: args.translation,
        translationEn: args.translationEn,
        translationVi: args.translationVi,
        translationMn: args.translationMn,
        audioUrl: args.audioUrl ?? fallbackAudioUrl,
      };

      if (!shouldUpdateTranscript) {
        await ctx.db.patch(unitId, basePatch);
        return;
      }

      const transcriptWrite = await replaceTextbookUnitTranscriptChunks(
        ctx,
        unitId,
        args.transcriptData ?? null
      );

      await ctx.db.patch(unitId, {
        ...basePatch,
        transcriptData: [],
        transcriptStorage: transcriptWrite.chunkCount > 0 ? 'chunked' : 'inline',
        transcriptChunkCount: transcriptWrite.chunkCount,
        transcriptSegmentCount: transcriptWrite.segmentCount,
      });
    };

    // Guard 1: exact key lookup (deterministic articleIndex path).
    const existingExact = await ctx.db
      .query('textbook_units')
      .withIndex('by_course_unit_article', q =>
        q
          .eq('courseId', args.courseId)
          .eq('unitIndex', args.unitIndex)
          .eq('articleIndex', articleIndex)
      )
      .unique();
    if (existingExact) {
      await applyPatch(existingExact._id, existingExact.audioUrl);
      return {
        inserted: false,
        unitDocId: existingExact._id,
        courseId: args.courseId,
        unitIndex: args.unitIndex,
        articleIndex: existingExact.articleIndex,
      };
    }

    // Guard 2: same course+unit+title should be treated as the same chapter.
    const sameCourseUnits = await ctx.db
      .query('textbook_units')
      .withIndex('by_course', q => q.eq('courseId', args.courseId))
      .collect();
    const existingByTitle = sameCourseUnits.find(
      unit =>
        unit.unitIndex === args.unitIndex && unit.title.trim().toLowerCase() === normalizedTitle
    );

    if (existingByTitle) {
      await applyPatch(existingByTitle._id, existingByTitle.audioUrl);
      return {
        inserted: false,
        unitDocId: existingByTitle._id,
        courseId: args.courseId,
        unitIndex: args.unitIndex,
        articleIndex: existingByTitle.articleIndex,
      };
    }

    const unitDocId = await ctx.db.insert('textbook_units', {
      courseId: args.courseId,
      unitIndex: args.unitIndex,
      articleIndex,
      title: args.title,
      readingText: args.readingText,
      audioUrl: args.audioUrl,
      translation: args.translation,
      translationEn: args.translationEn,
      translationVi: args.translationVi,
      translationMn: args.translationMn,
      transcriptData: [],
      transcriptStorage: 'inline',
      transcriptChunkCount: 0,
      transcriptSegmentCount: 0,
      createdAt: Date.now(),
    });

    if (shouldUpdateTranscript) {
      const transcriptWrite = await replaceTextbookUnitTranscriptChunks(
        ctx,
        unitDocId,
        args.transcriptData ?? null
      );
      await ctx.db.patch(unitDocId, {
        transcriptStorage: transcriptWrite.chunkCount > 0 ? 'chunked' : 'inline',
        transcriptChunkCount: transcriptWrite.chunkCount,
        transcriptSegmentCount: transcriptWrite.segmentCount,
      });
    }

    return {
      inserted: true,
      unitDocId,
      courseId: args.courseId,
      unitIndex: args.unitIndex,
      articleIndex,
    };
  },
});

export const upsertCourseGrammar = internalMutation({
  args: {
    courseId: v.string(),
    unitId: v.number(),
    title: v.string(),
    summary: v.optional(v.string()),
    summaryEn: v.optional(v.string()),
    summaryVi: v.optional(v.string()),
    summaryMn: v.optional(v.string()),
    explanation: v.optional(v.string()),
    explanationEn: v.optional(v.string()),
    explanationVi: v.optional(v.string()),
    explanationMn: v.optional(v.string()),
    sections: v.optional(
      v.object({
        introduction: v.optional(
          v.object({
            zh: v.optional(v.string()),
            en: v.optional(v.string()),
            vi: v.optional(v.string()),
            mn: v.optional(v.string()),
          })
        ),
        core: v.optional(
          v.object({
            zh: v.optional(v.string()),
            en: v.optional(v.string()),
            vi: v.optional(v.string()),
            mn: v.optional(v.string()),
          })
        ),
        comparative: v.optional(
          v.object({
            zh: v.optional(v.string()),
            en: v.optional(v.string()),
            vi: v.optional(v.string()),
            mn: v.optional(v.string()),
          })
        ),
        cultural: v.optional(
          v.object({
            zh: v.optional(v.string()),
            en: v.optional(v.string()),
            vi: v.optional(v.string()),
            mn: v.optional(v.string()),
          })
        ),
        commonMistakes: v.optional(
          v.object({
            zh: v.optional(v.string()),
            en: v.optional(v.string()),
            vi: v.optional(v.string()),
            mn: v.optional(v.string()),
          })
        ),
        review: v.optional(
          v.object({
            zh: v.optional(v.string()),
            en: v.optional(v.string()),
            vi: v.optional(v.string()),
            mn: v.optional(v.string()),
          })
        ),
      })
    ),
    quizItems: v.optional(
      v.array(
        v.object({
          prompt: v.object({
            zh: v.optional(v.string()),
            en: v.optional(v.string()),
            vi: v.optional(v.string()),
            mn: v.optional(v.string()),
          }),
          answer: v.optional(
            v.object({
              zh: v.optional(v.string()),
              en: v.optional(v.string()),
              vi: v.optional(v.string()),
              mn: v.optional(v.string()),
            })
          ),
        })
      )
    ),
    sourceMeta: v.optional(
      v.object({
        sourceType: v.string(),
        sourcePath: v.optional(v.string()),
        sourceUrl: v.optional(v.string()),
        checksum: v.optional(v.string()),
        parserVersion: v.optional(v.string()),
        importedAt: v.number(),
      })
    ),
    examples: v.optional(
      v.array(
        v.object({
          kr: v.string(),
          cn: v.string(),
          en: v.optional(v.string()),
          vi: v.optional(v.string()),
          mn: v.optional(v.string()),
          audio: v.optional(v.string()),
        })
      )
    ),
    type: v.optional(v.string()),
    level: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    forceReplaceContent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    if (!title) {
      throw new Error('Grammar title cannot be empty');
    }

    const summary = args.summary?.trim() || '';
    const summaryEn = args.summaryEn?.trim() || undefined;
    const summaryVi = args.summaryVi?.trim() || undefined;
    const summaryMn = args.summaryMn?.trim() || undefined;
    const explanation = args.explanation?.trim() || '';
    const explanationEn = args.explanationEn?.trim() || undefined;
    const explanationVi = args.explanationVi?.trim() || undefined;
    const explanationMn = args.explanationMn?.trim() || undefined;
    const type = args.type?.trim() || 'GRAMMAR';
    const level = args.level?.trim() || 'Beginner';
    const normalizeLocalizedText = (value: {
      zh?: string;
      en?: string;
      vi?: string;
      mn?: string;
    }) => {
      const next = {
        zh: value.zh?.trim() || undefined,
        en: value.en?.trim() || undefined,
        vi: value.vi?.trim() || undefined,
        mn: value.mn?.trim() || undefined,
      };
      return next.zh || next.en || next.vi || next.mn ? next : undefined;
    };
    const sections = args.sections
      ? ({
          introduction: args.sections.introduction
            ? normalizeLocalizedText(args.sections.introduction)
            : undefined,
          core: args.sections.core ? normalizeLocalizedText(args.sections.core) : undefined,
          comparative: args.sections.comparative
            ? normalizeLocalizedText(args.sections.comparative)
            : undefined,
          cultural: args.sections.cultural
            ? normalizeLocalizedText(args.sections.cultural)
            : undefined,
          commonMistakes: args.sections.commonMistakes
            ? normalizeLocalizedText(args.sections.commonMistakes)
            : undefined,
          review: args.sections.review ? normalizeLocalizedText(args.sections.review) : undefined,
        } as const)
      : undefined;
    const hasSections =
      !!sections &&
      Object.values(sections).some(value => {
        if (!value) return false;
        return !!(value.zh || value.en || value.vi || value.mn);
      });
    const quizItems =
      args.quizItems
        ?.map(item => ({
          prompt: normalizeLocalizedText(item.prompt),
          answer: item.answer ? normalizeLocalizedText(item.answer) : undefined,
        }))
        .filter(item => !!item.prompt)
        .map(item => ({ prompt: item.prompt!, answer: item.answer })) || [];
    const sourceMeta = args.sourceMeta
      ? {
          sourceType: args.sourceMeta.sourceType.trim(),
          sourcePath: args.sourceMeta.sourcePath?.trim() || undefined,
          sourceUrl: args.sourceMeta.sourceUrl?.trim() || undefined,
          checksum: args.sourceMeta.checksum?.trim() || undefined,
          parserVersion: args.sourceMeta.parserVersion?.trim() || undefined,
          importedAt: args.sourceMeta.importedAt,
        }
      : undefined;
    const examples =
      args.examples
        ?.map(example => ({
          kr: example.kr.trim(),
          cn: example.cn.trim(),
          en: example.en?.trim() || undefined,
          vi: example.vi?.trim() || undefined,
          mn: example.mn?.trim() || undefined,
          audio: example.audio?.trim() || undefined,
        }))
        .filter(example => example.kr.length >= 4 && /[가-힣]/.test(example.kr))
        .slice(0, 12) || [];

    const existingByExactTitle = await ctx.db
      .query('grammar_points')
      .withIndex('by_title', q => q.eq('title', title))
      .unique();

    let grammarId = existingByExactTitle?._id;
    if (existingByExactTitle) {
      const forceReplaceContent = args.forceReplaceContent === true;
      const shouldPatchSummary =
        (forceReplaceContent && !!summary) ||
        (!!summary &&
          (!existingByExactTitle.summary || isLowQualityText(existingByExactTitle.summary))) ||
        (summary.length > existingByExactTitle.summary.length + 40 &&
          isLowQualityText(existingByExactTitle.summary));
      const shouldPatchExplanation =
        (forceReplaceContent && !!explanation) ||
        (!!explanation &&
          (!existingByExactTitle.explanation ||
            isLowQualityText(existingByExactTitle.explanation))) ||
        (explanation.length > existingByExactTitle.explanation.length + 80 &&
          isLowQualityText(existingByExactTitle.explanation));
      const shouldPatchExamples =
        (forceReplaceContent && hasUsefulGrammarExamples(examples)) ||
        (hasUsefulGrammarExamples(examples) &&
          !hasUsefulGrammarExamples(existingByExactTitle.examples));
      const shouldPatchSummaryEn =
        (forceReplaceContent && !!summaryEn) ||
        (!!summaryEn &&
          (!existingByExactTitle.summaryEn || isLowQualityText(existingByExactTitle.summaryEn)));
      const shouldPatchSummaryVi =
        (forceReplaceContent && !!summaryVi) ||
        (!!summaryVi &&
          (!existingByExactTitle.summaryVi || isLowQualityText(existingByExactTitle.summaryVi)));
      const shouldPatchSummaryMn =
        (forceReplaceContent && !!summaryMn) ||
        (!!summaryMn &&
          (!existingByExactTitle.summaryMn || isLowQualityText(existingByExactTitle.summaryMn)));
      const shouldPatchExplanationEn =
        (forceReplaceContent && !!explanationEn) ||
        (!!explanationEn &&
          (!existingByExactTitle.explanationEn ||
            isLowQualityText(existingByExactTitle.explanationEn)));
      const shouldPatchExplanationVi =
        (forceReplaceContent && !!explanationVi) ||
        (!!explanationVi &&
          (!existingByExactTitle.explanationVi ||
            isLowQualityText(existingByExactTitle.explanationVi)));
      const shouldPatchExplanationMn =
        (forceReplaceContent && !!explanationMn) ||
        (!!explanationMn &&
          (!existingByExactTitle.explanationMn ||
            isLowQualityText(existingByExactTitle.explanationMn)));
      const shouldPatchSections =
        (forceReplaceContent && hasSections) || (hasSections && !existingByExactTitle.sections);
      const shouldPatchQuizItems =
        (forceReplaceContent && quizItems.length > 0) ||
        (quizItems.length > 0 &&
          (!existingByExactTitle.quizItems || existingByExactTitle.quizItems.length === 0));
      const shouldPatchSourceMeta =
        (forceReplaceContent && !!sourceMeta) || (!!sourceMeta && !existingByExactTitle.sourceMeta);

      const patchPayload: Record<string, unknown> = {};
      if (shouldPatchSummary) patchPayload.summary = summary;
      if (shouldPatchSummaryEn) patchPayload.summaryEn = summaryEn;
      if (shouldPatchSummaryVi) patchPayload.summaryVi = summaryVi;
      if (shouldPatchSummaryMn) patchPayload.summaryMn = summaryMn;
      if (shouldPatchExplanation) patchPayload.explanation = explanation;
      if (shouldPatchExplanationEn) patchPayload.explanationEn = explanationEn;
      if (shouldPatchExplanationVi) patchPayload.explanationVi = explanationVi;
      if (shouldPatchExplanationMn) patchPayload.explanationMn = explanationMn;
      if (shouldPatchExamples) patchPayload.examples = examples;
      if (shouldPatchSections) patchPayload.sections = sections;
      if (shouldPatchQuizItems) patchPayload.quizItems = quizItems;
      if (shouldPatchSourceMeta) patchPayload.sourceMeta = sourceMeta;

      if (Object.keys(patchPayload).length > 0) {
        await ctx.db.patch(existingByExactTitle._id, {
          ...patchPayload,
          updatedAt: Date.now(),
        });
      }
    } else {
      grammarId = await ctx.db.insert('grammar_points', {
        title,
        level,
        type,
        summary,
        summaryEn,
        summaryVi,
        summaryMn,
        explanation,
        explanationEn,
        explanationVi,
        explanationMn,
        sections: hasSections ? sections : undefined,
        quizItems: quizItems.length > 0 ? quizItems : undefined,
        sourceMeta,
        examples,
        searchPatterns: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    if (!grammarId) {
      throw new Error(`Failed to resolve grammarId for title: ${title}`);
    }

    const unitLinks = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId).eq('unitId', args.unitId))
      .collect();

    const existingLink = unitLinks.find(link => link.grammarId === grammarId);
    if (existingLink) {
      if (
        args.displayOrder !== undefined &&
        Number.isFinite(args.displayOrder) &&
        existingLink.displayOrder !== args.displayOrder
      ) {
        await ctx.db.patch(existingLink._id, { displayOrder: args.displayOrder });
      }
      return {
        insertedGrammar: false,
        insertedLink: false,
        grammarId,
        linkId: existingLink._id,
        courseId: args.courseId,
        unitId: args.unitId,
      };
    }

    const nextDisplayOrder =
      args.displayOrder ??
      unitLinks.reduce((max, link) => Math.max(max, link.displayOrder || 0), 0) + 1;

    const linkId = await ctx.db.insert('course_grammars', {
      courseId: args.courseId,
      unitId: args.unitId,
      grammarId,
      displayOrder: nextDisplayOrder,
    });

    return {
      insertedGrammar: !existingByExactTitle,
      insertedLink: true,
      grammarId,
      linkId,
      courseId: args.courseId,
      unitId: args.unitId,
    };
  },
});

export const cleanupCourseGrammarLinks = internalMutation({
  args: {
    courseId: v.string(),
    unitId: v.number(),
    keepTitles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedKeep = new Set(
      args.keepTitles.map(title => normalizeGrammarTitleKey(title)).filter(Boolean)
    );
    if (normalizedKeep.size === 0) {
      return { removed: 0 };
    }

    const unitLinks = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId).eq('unitId', args.unitId))
      .collect();

    let removed = 0;
    for (const link of unitLinks) {
      const grammar = await ctx.db.get(link.grammarId);
      if (!grammar) {
        await ctx.db.delete(link._id);
        removed++;
        continue;
      }

      const key = normalizeGrammarTitleKey(grammar.title);
      if (!normalizedKeep.has(key)) {
        await ctx.db.delete(link._id);
        removed++;
      }
    }

    return { removed };
  },
});

export const bulkImportVocabulary = internalMutation({
  args: {
    items: v.array(
      v.object({
        word: v.string(),
        meaning: v.string(),
        partOfSpeech: v.optional(v.string()),
        meaningEn: v.optional(v.string()),
        meaningVi: v.optional(v.string()),
        meaningMn: v.optional(v.string()),
        courseId: v.string(),
        unitId: v.number(),
        exampleSentence: v.optional(v.string()),
        exampleMeaning: v.optional(v.string()),
        exampleMeaningEn: v.optional(v.string()),
        exampleMeaningVi: v.optional(v.string()),
        exampleMeaningMn: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let successCount = 0;
    let failedCount = 0;
    let newWordCount = 0;
    let updatedWordCount = 0;
    let insertedAppearanceCount = 0;
    let updatedAppearanceCount = 0;
    const errors: string[] = [];

    for (const item of args.items) {
      try {
        const existingWord = await ctx.db
          .query('words')
          .withIndex('by_word', q => q.eq('word', item.word))
          .unique();

        let wordId = existingWord?._id;

        if (existingWord) {
          const wordPatch = {
            meaning: item.meaning || existingWord.meaning,
            partOfSpeech: item.partOfSpeech || existingWord.partOfSpeech || 'NOUN',
            meaningEn: item.meaningEn,
            meaningVi: item.meaningVi,
            meaningMn: item.meaningMn,
            updatedAt: Date.now(),
          };
          await ctx.db.patch(existingWord._id, wordPatch);
          updatedWordCount++;
        } else {
          wordId = await ctx.db.insert('words', {
            word: item.word,
            meaning: item.meaning || '',
            partOfSpeech: item.partOfSpeech || 'NOUN',
            meaningEn: item.meaningEn,
            meaningVi: item.meaningVi,
            meaningMn: item.meaningMn,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          newWordCount++;
        }

        if (!wordId) {
          failedCount++;
          errors.push(`${item.word}: failed to resolve word id`);
          continue;
        }

        const existingAppearance = await ctx.db
          .query('vocabulary_appearances')
          .withIndex('by_word_course_unit', q =>
            q.eq('wordId', wordId).eq('courseId', item.courseId).eq('unitId', item.unitId)
          )
          .unique();

        const appearancePatch = {
          meaning: item.meaning,
          meaningEn: item.meaningEn,
          meaningVi: item.meaningVi,
          meaningMn: item.meaningMn,
          exampleSentence: item.exampleSentence,
          exampleMeaning: item.exampleMeaning,
          exampleMeaningEn: item.exampleMeaningEn,
          exampleMeaningVi: item.exampleMeaningVi,
          exampleMeaningMn: item.exampleMeaningMn,
        };

        if (existingAppearance) {
          await ctx.db.patch(existingAppearance._id, appearancePatch);
          updatedAppearanceCount++;
        } else {
          await ctx.db.insert('vocabulary_appearances', {
            wordId,
            courseId: item.courseId,
            unitId: item.unitId,
            ...appearancePatch,
            createdAt: Date.now(),
          });
          insertedAppearanceCount++;
        }

        successCount++;
      } catch (error) {
        failedCount++;
        errors.push(`${item.word}: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    return {
      success: true,
      results: {
        success: successCount,
        failed: failedCount,
        newWords: newWordCount,
        updatedWords: updatedWordCount,
        insertedAppearances: insertedAppearanceCount,
        updatedAppearances: updatedAppearanceCount,
        errors,
      },
    };
  },
});

const stripMeaningHtml = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const splitMeaningCandidates = (value: string): string[] => {
  const cleaned = stripMeaningHtml(value);
  if (!cleaned) return [];

  const parts = cleaned
    .split(/\s\/\s|\s\|\s|；|;|\n|／|·/g)
    .map(item => item.trim())
    .filter(Boolean);

  if (parts.length > 1) return parts;
  return [cleaned];
};

const isGenericMeaning = (value: string): boolean => {
  const text = value.trim().toLowerCase();
  return (
    /^(yes|no|okay|ok)$/i.test(text) ||
    /^to be$/.test(text) ||
    /^to not be$/.test(text) ||
    /^there is$/.test(text) ||
    /^there are$/.test(text) ||
    /^and$/.test(text) ||
    /^or$/.test(text) ||
    /^who$/.test(text) ||
    /^what$/.test(text) ||
    /^when$/.test(text)
  );
};

const looksLikeGrammarGloss = (value: string): boolean => {
  const text = value.toLowerCase();
  return (
    /particle|connector|subject|topic|sentence/.test(text) ||
    /\bto be\b|\bto not be\b|\bthere is\b|\bthere are\b|\blet's\b|how\/what about/.test(text) ||
    /together with|subject particle|topic particle/.test(text)
  );
};

const compactForMatch = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '')
    .trim();

const isEnglishGlossCandidate = (value: string): boolean => {
  const hasLatin = /[A-Za-z]/.test(value);
  if (!hasLatin) return false;

  const hasHangul = /[\u3131-\u318e\uac00-\ud7a3]/i.test(value);
  const hasLowercaseLatin = /[a-z]/.test(value);

  if (hasHangul && !hasLowercaseLatin) {
    // Cases like "SNS 아이디" are not reliable English meanings.
    return false;
  }

  return true;
};

const normalizeMeaningValue = (raw: string, word?: string): string | null => {
  const candidates = splitMeaningCandidates(raw);
  if (candidates.length === 0) return null;

  const normalizedCandidates = candidates
    .map(candidate =>
      candidate
        .replace(/^[-–•·\s]+/, '')
        .replace(/[-–•·\s]+$/, '')
        .trim()
    )
    .filter(candidate => candidate.length > 0);
  if (normalizedCandidates.length === 0) return null;

  const englishCandidates = normalizedCandidates.filter(isEnglishGlossCandidate);
  const first = normalizedCandidates[0];
  const firstHasLatin = isEnglishGlossCandidate(first);

  if (firstHasLatin && !isGenericMeaning(first) && !looksLikeGrammarGloss(first)) {
    return first;
  }

  const fallbackEnglish =
    englishCandidates.find(
      candidate =>
        !isGenericMeaning(candidate) &&
        !looksLikeGrammarGloss(candidate) &&
        candidate.split(/\s+/).length >= 2
    ) ||
    englishCandidates.find(
      candidate => !isGenericMeaning(candidate) && !looksLikeGrammarGloss(candidate)
    ) ||
    englishCandidates.find(candidate => !isGenericMeaning(candidate)) ||
    englishCandidates[0];

  if (fallbackEnglish) {
    return fallbackEnglish;
  }

  if (word) {
    const compactWord = compactForMatch(word);
    if (compactWord.length > 0) {
      const matchedCandidate = normalizedCandidates.find(candidate => {
        const compactCandidate = compactForMatch(candidate);
        return (
          compactCandidate.length > 0 &&
          (compactCandidate.includes(compactWord) || compactWord.includes(compactCandidate))
        );
      });
      if (matchedCandidate) {
        return matchedCandidate;
      }
    }
  }

  if (
    normalizedCandidates.length > 1 &&
    normalizedCandidates.every(candidate => !isEnglishGlossCandidate(candidate))
  ) {
    // Multiple non-English candidates are usually extraction artifacts; skip these ambiguous rows.
    return null;
  }

  return first;
};

export const sanitizeCourseVocabularyMeanings = internalMutation({
  args: {
    courseId: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    clearOtherLocales: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const courseId = args.courseId || DEFAULT_YSK_COURSE_ID;
    const dryRun = args.dryRun ?? false;
    const clearOtherLocales = args.clearOtherLocales ?? true;

    const appearances = await ctx.db
      .query('vocabulary_appearances')
      .withIndex('by_course_unit', q => q.eq('courseId', courseId))
      .collect();

    const wordIds = [...new Set(appearances.map(item => item.wordId))];
    const words = await Promise.all(wordIds.map(id => ctx.db.get(id)));
    const wordMap = new Map(words.filter(Boolean).map(word => [word!._id.toString(), word!]));

    let updated = 0;
    let unchanged = 0;
    let skipped = 0;
    const samples: Array<{
      word: string;
      before: string;
      after: string;
      appearanceId: Id<'vocabulary_appearances'>;
    }> = [];

    for (const appearance of appearances) {
      const wordDoc = wordMap.get(appearance.wordId.toString());
      const sourceMeaning =
        appearance.meaningEn?.trim() ||
        appearance.meaning?.trim() ||
        wordDoc?.meaningEn?.trim() ||
        wordDoc?.meaning?.trim() ||
        '';

      if (!sourceMeaning) {
        skipped++;
        continue;
      }

      const normalized = normalizeMeaningValue(sourceMeaning, wordDoc?.word);
      if (!normalized) {
        skipped++;
        continue;
      }

      const meaning = appearance.meaning?.trim() || '';
      const meaningEn = appearance.meaningEn?.trim() || '';
      const meaningVi = appearance.meaningVi?.trim() || '';
      const meaningMn = appearance.meaningMn?.trim() || '';

      const needsUpdate =
        meaning !== normalized ||
        meaningEn !== normalized ||
        (clearOtherLocales && (meaningVi.length > 0 || meaningMn.length > 0));

      if (!needsUpdate) {
        unchanged++;
        continue;
      }

      updated++;
      if (samples.length < 30) {
        samples.push({
          word: wordDoc?.word || '',
          before: sourceMeaning,
          after: normalized,
          appearanceId: appearance._id,
        });
      }

      if (!dryRun) {
        await ctx.db.patch(appearance._id, {
          meaning: normalized,
          meaningEn: normalized,
          meaningVi: clearOtherLocales ? '' : appearance.meaningVi,
          meaningMn: clearOtherLocales ? '' : appearance.meaningMn,
        });
      }
    }

    return {
      success: true,
      dryRun,
      courseId,
      processed: appearances.length,
      updated,
      unchanged,
      skipped,
      samples,
    };
  },
});

function normalizeSeedWordForm(value: string): string {
  let text = value.trim().replace(/\s+/g, ' ');
  if (!text) return '';

  const openParens = (text.match(/\(/g) || []).length;
  const closeParens = (text.match(/\)/g) || []).length;

  if (closeParens > openParens) {
    let remaining = closeParens - openParens;
    while (remaining > 0 && text.includes(')')) {
      text = text.replace(')', '');
      remaining--;
    }
  }

  if (openParens > closeParens) {
    text = text.replace(/\([^)]*$/g, '').trim();
  }

  return text.replace(/\s{2,}/g, ' ').trim();
}

export const sanitizeCourseVocabularyWordForms = internalMutation({
  args: {
    courseId: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const courseId = args.courseId || DEFAULT_YSK_COURSE_ID;
    const dryRun = args.dryRun ?? false;

    const appearances = await ctx.db
      .query('vocabulary_appearances')
      .withIndex('by_course_unit', q => q.eq('courseId', courseId))
      .collect();

    let renamedWords = 0;
    let reassignedAppearances = 0;
    let mergedDuplicates = 0;
    let skipped = 0;
    const samples: Array<{
      appearanceId: Id<'vocabulary_appearances'>;
      from: string;
      to: string;
      action: 'rename_word' | 'reassign_appearance' | 'merge_duplicate';
    }> = [];

    for (const appearance of appearances) {
      const word = await ctx.db.get(appearance.wordId);
      if (!word) {
        skipped++;
        continue;
      }

      const from = word.word.trim();
      const to = normalizeSeedWordForm(from);
      if (!to || from === to) continue;

      const existingTarget = await ctx.db
        .query('words')
        .withIndex('by_word', q => q.eq('word', to))
        .unique();

      if (existingTarget && existingTarget._id !== word._id) {
        const duplicateAppearance = await ctx.db
          .query('vocabulary_appearances')
          .withIndex('by_word_course_unit', q =>
            q
              .eq('wordId', existingTarget._id)
              .eq('courseId', appearance.courseId)
              .eq('unitId', appearance.unitId)
          )
          .unique();

        if (duplicateAppearance && duplicateAppearance._id !== appearance._id) {
          if (!dryRun) {
            await ctx.db.patch(duplicateAppearance._id, {
              meaning: duplicateAppearance.meaning || appearance.meaning,
              meaningEn: duplicateAppearance.meaningEn || appearance.meaningEn,
              meaningVi: duplicateAppearance.meaningVi || appearance.meaningVi,
              meaningMn: duplicateAppearance.meaningMn || appearance.meaningMn,
              exampleSentence: duplicateAppearance.exampleSentence || appearance.exampleSentence,
              exampleMeaning: duplicateAppearance.exampleMeaning || appearance.exampleMeaning,
              exampleMeaningEn: duplicateAppearance.exampleMeaningEn || appearance.exampleMeaningEn,
              exampleMeaningVi: duplicateAppearance.exampleMeaningVi || appearance.exampleMeaningVi,
              exampleMeaningMn: duplicateAppearance.exampleMeaningMn || appearance.exampleMeaningMn,
            });
            await ctx.db.delete(appearance._id);
          }
          mergedDuplicates++;
          if (samples.length < 40) {
            samples.push({
              appearanceId: appearance._id,
              from,
              to,
              action: 'merge_duplicate',
            });
          }
          continue;
        }

        if (!dryRun) {
          await ctx.db.patch(appearance._id, { wordId: existingTarget._id });
        }
        reassignedAppearances++;
        if (samples.length < 40) {
          samples.push({
            appearanceId: appearance._id,
            from,
            to,
            action: 'reassign_appearance',
          });
        }
        continue;
      }

      if (!dryRun) {
        await ctx.db.patch(word._id, { word: to });
      }
      renamedWords++;
      if (samples.length < 40) {
        samples.push({
          appearanceId: appearance._id,
          from,
          to,
          action: 'rename_word',
        });
      }
    }

    return {
      success: true,
      dryRun,
      courseId,
      processed: appearances.length,
      renamedWords,
      reassignedAppearances,
      mergedDuplicates,
      skipped,
      samples,
    };
  },
});

export const localizeYskCourse = internalMutation({
  args: {
    courseId: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    fillOtherLocales: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const courseId = args.courseId || DEFAULT_YSK_COURSE_ID;
    const dryRun = args.dryRun ?? false;
    const fillOtherLocales = args.fillOtherLocales ?? true;

    let instituteUpdated = 0;
    let appearanceUpdated = 0;
    let grammarUpdated = 0;
    let grammarExamplesUpdated = 0;

    const institute = await ctx.db
      .query('institutes')
      .withIndex('by_legacy_id', q => q.eq('id', courseId))
      .unique();

    if (institute) {
      const institutePatch: Partial<typeof institute> = {};
      if (!institute.nameEn) institutePatch.nameEn = institute.name;
      if (!institute.nameZh) institutePatch.nameZh = institute.name;
      if (!institute.nameVi && fillOtherLocales) institutePatch.nameVi = institute.name;
      if (!institute.nameMn && fillOtherLocales) institutePatch.nameMn = institute.name;

      if (Object.keys(institutePatch).length > 0) {
        instituteUpdated += 1;
        if (!dryRun) {
          await ctx.db.patch(institute._id, institutePatch);
        }
      }
    }

    const appearances = await ctx.db
      .query('vocabulary_appearances')
      .withIndex('by_course_unit', q => q.eq('courseId', courseId))
      .collect();

    for (const appearance of appearances) {
      const baseMeaning = appearance.meaning?.trim() || appearance.meaningEn?.trim() || '';
      const baseExample =
        appearance.exampleMeaning?.trim() || appearance.exampleMeaningEn?.trim() || '';
      if (!baseMeaning && !baseExample) continue;

      const patch: Partial<typeof appearance> = {};
      if (!appearance.meaningEn && baseMeaning) patch.meaningEn = baseMeaning;
      if (fillOtherLocales && !appearance.meaningVi && baseMeaning) patch.meaningVi = baseMeaning;
      if (fillOtherLocales && !appearance.meaningMn && baseMeaning) patch.meaningMn = baseMeaning;
      if (!appearance.exampleMeaningEn && baseExample) patch.exampleMeaningEn = baseExample;
      if (fillOtherLocales && !appearance.exampleMeaningVi && baseExample)
        patch.exampleMeaningVi = baseExample;
      if (fillOtherLocales && !appearance.exampleMeaningMn && baseExample)
        patch.exampleMeaningMn = baseExample;

      if (Object.keys(patch).length > 0) {
        appearanceUpdated += 1;
        if (!dryRun) {
          await ctx.db.patch(appearance._id, patch);
        }
      }
    }

    const courseGrammars = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', courseId))
      .collect();

    const grammarIds = [...new Set(courseGrammars.map(item => item.grammarId.toString()))];
    const grammars = await Promise.all(
      grammarIds.map(id => ctx.db.get(id as Id<'grammar_points'>))
    );

    for (const grammar of grammars.filter(Boolean)) {
      const patch: Partial<typeof grammar> = {};
      if (!grammar!.summaryEn) patch.summaryEn = grammar!.summary;
      if (!grammar!.explanationEn) patch.explanationEn = grammar!.explanation;
      if (fillOtherLocales && !grammar!.summaryVi) patch.summaryVi = grammar!.summary;
      if (fillOtherLocales && !grammar!.summaryMn) patch.summaryMn = grammar!.summary;
      if (fillOtherLocales && !grammar!.explanationVi) patch.explanationVi = grammar!.explanation;
      if (fillOtherLocales && !grammar!.explanationMn) patch.explanationMn = grammar!.explanation;

      let examplesUpdated = false;
      const updatedExamples = grammar!.examples.map(example => {
        const hasLatin = /[A-Za-z]/.test(example.cn || '');
        const updated = { ...example };
        if (!updated.en && hasLatin) updated.en = example.cn;
        if (fillOtherLocales && !updated.vi && hasLatin) updated.vi = example.cn;
        if (fillOtherLocales && !updated.mn && hasLatin) updated.mn = example.cn;
        if (updated.en !== example.en || updated.vi !== example.vi || updated.mn !== example.mn) {
          examplesUpdated = true;
        }
        return updated;
      });

      if (Object.keys(patch).length > 0 || examplesUpdated) {
        grammarUpdated += 1;
        if (examplesUpdated) grammarExamplesUpdated += 1;
        if (!dryRun) {
          await ctx.db.patch(grammar!._id, {
            ...patch,
            examples: updatedExamples,
            updatedAt: Date.now(),
          });
        }
      }
    }

    return {
      success: true,
      dryRun,
      courseId,
      instituteUpdated,
      appearanceUpdated,
      grammarUpdated,
      grammarExamplesUpdated,
    };
  },
});

function normalizeTextWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripLessonPrefix(value: string): string {
  return value.replace(/^Lesson\s*\d+\s*:\s*/i, '').trim();
}

function looksLikeBrokenReadingLine(value: string): boolean {
  const line = normalizeTextWhitespace(value);
  if (!line) return true;
  if (/^[,.;:!?()[\]{}\-_/\\]+$/.test(line)) return true;
  if (/^(?:해\s*봐요|해봐요|스스로\s*해봐요|스스로\s*해\s*봐요)(?:\s*[!?.])+$/i.test(line))
    return true;
  if (/^으\)\s*ㄹ래요\.?$/i.test(line)) return true;
  if (/^(?:부\s*){1}르\s*는\s*거\s*예요\.?$/i.test(line)) return true;
  if (/^\S+\s*\)\s*$/.test(line) && line.length < 8) return true;
  if (/^[\p{Script=Hangul}A-Za-z][\p{Script=Hangul}A-Za-z0-9\s·.'’()_-]{0,24}[:：]$/u.test(line))
    return true;
  if (/^[가-힣\s]{1,20}\s*:\s*(?:다|요|네|아니요|맞아요|아니에요)[.!?]?$/.test(line)) return true;
  if (/^[가-힣\s]{1,16}\s*:\s*[가-힣]{1,3}[.!?]?$/.test(line)) return true;
  if (/^(?:읽고\s*쓰기|듣기\s*스크립트|듣기\s*대본|읽기\s*자료)\s*$/i.test(line)) return true;
  if (/^(?:\d+\s*[.)]\s*)?[가-힣]{1,16}\s*\/\s*[가-힣]{1,16}(?:\s*[.,!?])*$/.test(line))
    return true;
  if (/^\S+\s*\(\s*\)\s*\d+\s*[–-]\s*\d+/.test(line)) return true;
  if (
    line.length <= 18 &&
    /[.]$/.test(line) &&
    !/[:?]/.test(line) &&
    !/(?:요|다|니다|까요|세요|예요|이에요|했다|됐다|한다)[.!?]?$/.test(line)
  ) {
    return true;
  }
  if (/^(?:[^:\n]{1,24}:\s*){2,}[^:\n]{0,24}:?$/.test(line)) return true;
  if ((line.match(/#/g) || []).length >= 2) return true;
  if (/^(?:#\S+\s*)+$/.test(line)) return true;

  const punctuationCount = (line.match(/[.,!?]/g) || []).length;
  const hangulCount = (line.match(/[가-힣]/g) || []).length;
  if (line.length > 0 && punctuationCount / line.length > 0.22 && hangulCount < 6) return true;
  if (/^[가-힣](?:\s+[가-힣]){3,}/.test(line) && line.length < 40) return true;
  return false;
}

function sanitizeReadingTextValue(title: string, readingText: string): string {
  const baseTitle = stripLessonPrefix(normalizeTextWhitespace(title || ''));
  const rawLines = String(readingText || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(line =>
      normalizeTextWhitespace(
        line
          .replace(/\*+/g, '')
          .replace(/_{3,}/g, ' ')
          .replace(/^맛보기\s*\)\s*/g, '')
          .replace(/\s*([.,!?])\s*(?:[.,!?]\s*){2,}/g, '$1 ')
      )
    )
    .map(stripLessonPrefix)
    .filter(Boolean);

  const lines = rawLines.filter(line => !looksLikeBrokenReadingLine(line));
  while (lines.length > 0 && looksLikeBrokenReadingLine(lines[0])) {
    lines.shift();
  }

  let cleaned = lines.join('\n').trim();
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  cleaned = cleaned.replace(/^(?:해\s*봐요!?)(?:\s*!+)?\s*\n+/i, '');

  if (!cleaned) return baseTitle || title;
  if (cleaned.length < 18) return baseTitle || cleaned;
  return cleaned;
}

export const sanitizeCourseReadingTexts = internalMutation({
  args: {
    courseId: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const courseId = args.courseId || DEFAULT_YSK_COURSE_ID;
    const dryRun = args.dryRun ?? false;

    const units = await ctx.db
      .query('textbook_units')
      .withIndex('by_course', q => q.eq('courseId', courseId))
      .collect();

    let updated = 0;
    let unchanged = 0;
    const samples: Array<{
      unitIndex: number;
      articleIndex: number;
      beforeFirstLine: string;
      afterFirstLine: string;
      beforeLength: number;
      afterLength: number;
      unitId: Id<'textbook_units'>;
    }> = [];

    for (const unit of units) {
      const before = unit.readingText || '';
      const after = sanitizeReadingTextValue(unit.title, before);
      if (after === before) {
        unchanged += 1;
        continue;
      }

      updated += 1;
      if (samples.length < 30) {
        samples.push({
          unitIndex: unit.unitIndex,
          articleIndex: unit.articleIndex,
          beforeFirstLine: normalizeTextWhitespace(before.split('\n')[0] || ''),
          afterFirstLine: normalizeTextWhitespace(after.split('\n')[0] || ''),
          beforeLength: before.length,
          afterLength: after.length,
          unitId: unit._id,
        });
      }

      if (!dryRun) {
        await ctx.db.patch(unit._id, { readingText: after });
      }
    }

    return {
      success: true,
      dryRun,
      courseId,
      total: units.length,
      updated,
      unchanged,
      samples,
    };
  },
});
