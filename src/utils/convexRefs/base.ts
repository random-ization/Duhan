import { makeFunctionReference } from 'convex/server';
import type { DefaultFunctionArgs } from 'convex/server';

export const qRef = <Args extends DefaultFunctionArgs, Ret>(name: string) =>
  makeFunctionReference<'query', Args, Ret>(name);

export const mRef = <Args extends DefaultFunctionArgs, Ret>(name: string) =>
  makeFunctionReference<'mutation', Args, Ret>(name);

export const aRef = <Args extends DefaultFunctionArgs, Ret>(name: string) =>
  makeFunctionReference<'action', Args, Ret>(name);
