import type { Id, TableNames } from './_generated/dataModel';

export const asId = <T extends TableNames>(value: string): Id<T> => value as Id<T>;
