

export const normalizeSortOrder = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) ? Number(value) : fallback;


export const generatePreview = (content: unknown, maxLength: number = 200): string => {
  if (typeof content === 'string') {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  }
  
  if (Array.isArray(content)) {
    const textBlocks = (content as Array<Record<string, unknown>>)
      .map((block) => (typeof block.content === 'string' ? block.content : ''))
      .filter((text) => text.length > 0)
      .join(' ');
    return textBlocks.length > maxLength ? textBlocks.substring(0, maxLength) + '...' : textBlocks;
  }
  
  if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>;
    const text = obj.text || obj.content || '';
    return typeof text === 'string' && text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : (typeof text === 'string' ? text : '');
  }
  
  return '';
};

export const generateSnippet = (content: unknown, query?: string, maxLength: number = 280): string => {
  const preview = generatePreview(content, maxLength);
  
  if (!query || !preview.toLowerCase().includes(query.toLowerCase())) {
    return preview;
  }
  
  const index = preview.toLowerCase().indexOf(query.toLowerCase());
  const start = Math.max(0, index - 50);
  const end = Math.min(preview.length, index + query.length + 50);
  
  let snippet = preview.substring(start, end);
  
  if (start > 0) snippet = '...' + snippet;
  if (end < preview.length) snippet = snippet + '...';
  
  return snippet;
};

export const validatePageInput = (input: Record<string, unknown>) => {
  const { title, notebookKey, kind, tags, blocks } = input;
  
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('Title is required and must be a non-empty string');
  }
  
  if (!notebookKey || typeof notebookKey !== 'string') {
    throw new Error('Notebook key is required');
  }
  
  if (!kind || typeof kind !== 'string') {
    throw new Error('Kind is required');
  }
  
  if (!Array.isArray(tags)) {
    throw new Error('Tags must be an array');
  }
  
  if (!Array.isArray(blocks)) {
    throw new Error('Blocks must be an array');
  }
  
  return true;
};

export const validateUpdatePageInput = (input: Record<string, unknown>) => {
  const { title, tags, blocks } = input;
  
  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    throw new Error('Title must be a non-empty string if provided');
  }
  
  if (tags !== undefined && !Array.isArray(tags)) {
    throw new Error('Tags must be an array if provided');
  }
  
  if (blocks !== undefined && !Array.isArray(blocks)) {
    throw new Error('Blocks must be an array if provided');
  }
  
  return true;
};
