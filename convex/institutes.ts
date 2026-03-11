import { query, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';

const isVisibleInstitute = (institute: { isArchived?: boolean }) => institute.isArchived !== true;
type InstituteDoc = Doc<'institutes'>;
type LevelConfig = { level: number; units: number };

export type InstituteClientDto = {
  _id: string;
  _creationTime: number;
  id: string;
  name: string;
  nameZh?: string;
  nameEn?: string;
  nameVi?: string;
  nameMn?: string;
  levels: Array<number | LevelConfig>;
  coverUrl?: string;
  themeColor?: string;
  publisher?: string;
  displayLevel?: string;
  totalUnits?: number;
  volume?: string;
};

type IntegrityIssue = {
  courseName: string;
  courseId: string;
  volume?: string;
  missingUnits: number[];
};

const isLevelConfig = (value: unknown): value is LevelConfig => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { level?: unknown; units?: unknown };
  return (
    typeof candidate.level === 'number' &&
    Number.isFinite(candidate.level) &&
    typeof candidate.units === 'number' &&
    Number.isFinite(candidate.units)
  );
};

const normalizeInstituteLevels = (levelsRaw: unknown): Array<number | LevelConfig> => {
  if (typeof levelsRaw === 'string') {
    try {
      return normalizeInstituteLevels(JSON.parse(levelsRaw));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(levelsRaw)) return [];

  const normalized: Array<number | LevelConfig> = [];
  for (const level of levelsRaw) {
    if (typeof level === 'number' && Number.isFinite(level)) {
      normalized.push(level);
      continue;
    }
    if (isLevelConfig(level)) {
      normalized.push({
        level: level.level,
        units: level.units,
      });
    }
  }
  return normalized;
};

const normalizeInstitute = (institute: InstituteDoc): InstituteClientDto => ({
  _id: String(institute._id),
  _creationTime: institute._creationTime,
  id: institute.id?.trim() || String(institute._id),
  name: institute.name,
  nameZh: institute.nameZh,
  nameEn: institute.nameEn,
  nameVi: institute.nameVi,
  nameMn: institute.nameMn,
  levels: normalizeInstituteLevels(institute.levels),
  coverUrl: institute.coverUrl,
  themeColor: institute.themeColor,
  publisher: institute.publisher,
  displayLevel: institute.displayLevel,
  totalUnits: institute.totalUnits,
  volume: institute.volume,
});

const sortInstitutesByCreationTime = (institutes: InstituteDoc[]) =>
  institutes.slice().sort((a, b) => a._creationTime - b._creationTime);

const getVisibleInstitutes = async (ctx: QueryCtx): Promise<InstituteDoc[]> => {
  const visibleFalse = await ctx.db
    .query('institutes')
    .withIndex('by_archived', q => q.eq('isArchived', false))
    .collect();
  const visibleUndefined = await ctx.db
    .query('institutes')
    .withIndex('by_archived', q => q.eq('isArchived', undefined))
    .collect();

  const deduped = new Map<string, InstituteDoc>();
  for (const institute of [...visibleFalse, ...visibleUndefined]) {
    deduped.set(institute._id.toString(), institute);
  }

  return sortInstitutesByCreationTime([...deduped.values()]);
};

export const getAll = query({
  args: {},
  handler: async ctx => {
    const institutes = await getVisibleInstitutes(ctx);
    return institutes.filter(isVisibleInstitute).map(normalizeInstitute);
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const institute = await ctx.db
      .query('institutes')
      .withIndex('by_legacy_id', q => q.eq('id', args.id))
      .unique();
    return institute && isVisibleInstitute(institute) ? normalizeInstitute(institute) : null;
  },
});

export const checkIntegrity = query({
  args: {},
  handler: async ctx => {
    const courses = (await getVisibleInstitutes(ctx)).filter(isVisibleInstitute);
    const report: IntegrityIssue[] = [];

    for (const course of courses) {
      const reportItem = await processCourseIntegrity(ctx, course);
      if (reportItem) {
        report.push(reportItem);
      }
    }
    return report;
  },
});

// Helper functions for institutes.ts complexity reduction

function calculateExpectedUnits(course: InstituteDoc): number[] {
  let expectedUnits: number[] = [];
  if (course.levels && course.levels.length > 0) {
    const firstLevel = course.levels[0];
    const count = typeof firstLevel === 'object' && 'units' in firstLevel ? firstLevel.units : 10;
    for (let i = 1; i <= count; i++) expectedUnits.push(i);
  }

  if (expectedUnits.length === 0) {
    // Default to 10 if not specified
    expectedUnits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  }
  return expectedUnits;
}

async function processCourseIntegrity(
  ctx: QueryCtx,
  course: InstituteDoc
): Promise<IntegrityIssue | null> {
  const expectedUnits = calculateExpectedUnits(course);
  const missingUnits: number[] = [];

  for (const unitId of expectedUnits) {
    // Handle mapping logic locally to match getUnitGrammar
    let storageUnitId = unitId;
    const isYonsei1B = course.id === 'course_yonsei_1b_appendix' || course.id === '-mk2y2qkh';
    if (isYonsei1B && unitId <= 10) {
      storageUnitId = unitId + 10;
    }

    const count = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', course.id).eq('unitId', storageUnitId))
      .collect();

    if (count.length === 0) {
      // Check offset 10 just in case
      const offsetCount = await ctx.db
        .query('course_grammars')
        .withIndex('by_course_unit', q =>
          q.eq('courseId', course.id).eq('unitId', storageUnitId + 10)
        )
        .collect();

      if (offsetCount.length > 0) {
        // It exists but at offset
        missingUnits.push(-unitId); // Mark as negative to indicate "Found at +10"
      } else {
        missingUnits.push(unitId);
      }
    }
  }

  if (missingUnits.length > 0) {
    return {
      courseName: course.name,
      courseId: course.id,
      volume: course.volume,
      missingUnits,
    };
  }
  return null;
}
