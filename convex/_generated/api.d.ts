/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as annotations from "../annotations.js";
import type * as auth from "../auth.js";
import type * as grammars from "../grammars.js";
import type * as institutes from "../institutes.js";
import type * as migrations from "../migrations.js";
import type * as notebooks from "../notebooks.js";
import type * as podcastActions from "../podcastActions.js";
import type * as podcasts from "../podcasts.js";
import type * as progress from "../progress.js";
import type * as storage from "../storage.js";
import type * as topik from "../topik.js";
import type * as units from "../units.js";
import type * as userStats from "../userStats.js";
import type * as videos from "../videos.js";
import type * as vocab from "../vocab.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  annotations: typeof annotations;
  auth: typeof auth;
  grammars: typeof grammars;
  institutes: typeof institutes;
  migrations: typeof migrations;
  notebooks: typeof notebooks;
  podcastActions: typeof podcastActions;
  podcasts: typeof podcasts;
  progress: typeof progress;
  storage: typeof storage;
  topik: typeof topik;
  units: typeof units;
  userStats: typeof userStats;
  videos: typeof videos;
  vocab: typeof vocab;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
