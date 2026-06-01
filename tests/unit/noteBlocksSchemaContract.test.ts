import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('note block schema contract', () => {
  it('uses a deep JSON validator for TipTap editor document content', () => {
    const schemaContent = readProjectFile('convex/schema.ts');
    const jsonValidatorsContent = readProjectFile('convex/jsonValidators.ts');
    const vocabSessionsStart = schemaContent.indexOf('vocab_learning_sessions: defineTable');
    const vocabSessionsEnd = schemaContent.indexOf('notebooks: defineTable');
    const vocabSessionsSchema = schemaContent.slice(vocabSessionsStart, vocabSessionsEnd);
    const noteBlocksStart = schemaContent.indexOf('note_blocks: defineTable');
    const noteBlocksEnd = schemaContent.indexOf('note_links: defineTable');
    const noteBlocksSchema = schemaContent.slice(noteBlocksStart, noteBlocksEnd);

    expect(jsonValidatorsContent).toContain('export const LooseJsonDeepValueValidator = v.union');
    expect(schemaContent).toContain("} from './jsonValidators'");
    expect(vocabSessionsSchema).toContain('snapshot: v.optional(LooseJsonDeepValueValidator)');
    expect(noteBlocksSchema).toContain('content: LooseJsonDeepValueValidator');
  });
});
