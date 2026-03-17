import { useMutation, useQuery } from 'convex/react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { ANNOTATIONS, NOTE_PAGES } from '../../../utils/convexRefs';
import type { AnnotationKitColor, AnnotationAnchor } from '../types';

export interface ScopedAnnotation {
  id: string;
  contextKey: string;
  text: string;
  note?: string;
  color?: string;
  startOffset?: number;
  endOffset?: number;
  createdAt: number;
  updatedAt?: number;
  scopeType?: string;
  scopeId?: string;
  blockId?: string;
  quote?: string;
  contextBefore?: string;
  contextAfter?: string;
}

interface UseScopedAnnotationsOptions {
  scopeType: string;
  scopeId: string;
  blockId?: string;
  targetType?: string;
  sourceModule?: string;
  contentTitle?: string;
  extraTags?: string[];
}

export const useScopedAnnotations = ({
  scopeType,
  scopeId,
  blockId,
  targetType = 'TEXTBOOK',
  sourceModule,
  contentTitle,
  extraTags,
}: UseScopedAnnotationsOptions) => {
  const rows = useQuery(ANNOTATIONS.listByScope, { scopeType, scopeId, blockId, limit: 4000 });
  const upsertByAnchor = useMutation(ANNOTATIONS.upsertByAnchor);
  const deleteById = useMutation(ANNOTATIONS.deleteById);
  const updateNote = useMutation(ANNOTATIONS.updateNote);
  const ingestFromSource = useMutation(NOTE_PAGES.ingestFromSource);
  const deleteBySourceRef = useMutation(NOTE_PAGES.deleteBySourceRef);

  const annotations = (rows ?? []) as ScopedAnnotation[];
  const resolvedSourceModule = (sourceModule || scopeType).trim().toUpperCase();

  const buildSourceRef = ({
    anchor,
    quote,
    contextKey,
    annotationId,
  }: {
    anchor: AnnotationAnchor;
    quote: string;
    contextKey?: string;
    annotationId?: string;
  }) => ({
    module: resolvedSourceModule,
    scopeType,
    scopeId,
    blockId: anchor.blockId,
    start: anchor.start,
    end: anchor.end,
    quote,
    ...(contextKey ? { contextKey } : {}),
    ...(annotationId ? { annotationId } : {}),
  });

  const upsert = async ({
    anchor,
    note,
    color,
    contextKey,
  }: {
    anchor: AnnotationAnchor;
    note?: string;
    color?: AnnotationKitColor;
    contextKey?: string;
  }) => {
    const result = await upsertByAnchor({
      scopeType,
      scopeId,
      blockId: anchor.blockId,
      start: anchor.start,
      end: anchor.end,
      quote: anchor.quote,
      contextBefore: anchor.contextBefore,
      contextAfter: anchor.contextAfter,
      note,
      color: color === null ? '__none__' : color,
      contextKey,
      targetType,
    });

    const normalizedNote = note?.trim() || '';
    const shouldDeleteAsset = color === null && normalizedNote.length === 0;
    if (shouldDeleteAsset) {
      await deleteBySourceRef({
        sourceRef: buildSourceRef({
          anchor,
          quote: anchor.quote,
          contextKey,
          annotationId: String(result.id),
        }),
      });
      return result;
    }

    await ingestFromSource({
      sourceModule: resolvedSourceModule,
      sourceRef: buildSourceRef({
        anchor,
        quote: anchor.quote,
        contextKey,
        annotationId: String(result.id),
      }),
      noteType: 'manual',
      title: contentTitle || anchor.quote,
      quote: anchor.quote,
      note: normalizedNote || undefined,
      color: color === null ? '__none__' : color || undefined,
      tags: ['annotation', ...(extraTags || [])],
      status: 'Inbox',
      scopeType,
      scopeId,
      blockId: anchor.blockId,
      start: anchor.start,
      end: anchor.end,
      contextBefore: anchor.contextBefore,
      contextAfter: anchor.contextAfter,
      contextKey,
      contentId: scopeId,
      contentTitle,
      annotationId: String(result.id),
    });

    return result;
  };

  const remove = async (annotationId: string) => {
    const target = annotations.find(item => String(item.id) === annotationId);
    const result = await deleteById({ annotationId: annotationId as Id<'annotations'> });
    if (
      target &&
      typeof target.startOffset === 'number' &&
      typeof target.endOffset === 'number' &&
      typeof target.blockId === 'string'
    ) {
      await deleteBySourceRef({
        sourceRef: {
          module: resolvedSourceModule,
          scopeType,
          scopeId,
          blockId: target.blockId,
          start: target.startOffset,
          end: target.endOffset,
          quote: target.quote || target.text,
          annotationId,
        },
      });
    }
    return result;
  };

  const saveNote = async (annotationId: string, note: string) => {
    const result = await updateNote({ annotationId: annotationId as Id<'annotations'>, note });
    const target = annotations.find(item => String(item.id) === annotationId);
    if (
      target &&
      typeof target.startOffset === 'number' &&
      typeof target.endOffset === 'number' &&
      typeof target.blockId === 'string'
    ) {
      const normalizedNote = note.trim();
      const hasHighlight = typeof target.color === 'string' && target.color.trim().length > 0;
      if (!normalizedNote && !hasHighlight) {
        await deleteBySourceRef({
          sourceRef: {
            module: resolvedSourceModule,
            scopeType,
            scopeId,
            blockId: target.blockId,
            start: target.startOffset,
            end: target.endOffset,
            quote: target.quote || target.text,
            annotationId,
          },
        });
      } else {
        await ingestFromSource({
          sourceModule: resolvedSourceModule,
          sourceRef: {
            module: resolvedSourceModule,
            scopeType,
            scopeId,
            blockId: target.blockId,
            start: target.startOffset,
            end: target.endOffset,
            quote: target.quote || target.text,
            annotationId,
          },
          noteType: 'manual',
          title: contentTitle || target.quote || target.text,
          quote: target.quote || target.text,
          note: normalizedNote || undefined,
          color: hasHighlight ? target.color : '__none__',
          tags: ['annotation', ...(extraTags || [])],
          status: 'Inbox',
          scopeType,
          scopeId,
          blockId: target.blockId,
          start: target.startOffset,
          end: target.endOffset,
          contextBefore: target.contextBefore,
          contextAfter: target.contextAfter,
          contextKey: target.contextKey,
          contentId: scopeId,
          contentTitle,
          annotationId,
        });
      }
    }
    return result;
  };

  return {
    annotations,
    upsert,
    remove,
    saveNote,
  };
};

export default useScopedAnnotations;
