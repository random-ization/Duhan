/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountRecovery from "../accountRecovery.js";
import type * as accountRecoveryInternal from "../accountRecoveryInternal.js";
import type * as achievements from "../achievements.js";
import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as aiCache from "../aiCache.js";
import type * as aiUsageLogs from "../aiUsageLogs.js";
import type * as aiWritingEvaluation from "../aiWritingEvaluation.js";
import type * as annotations from "../annotations.js";
import type * as auth from "../auth.js";
import type * as canvas from "../canvas.js";
import type * as crons from "../crons.js";
import type * as diagnostics from "../diagnostics.js";
import type * as dictionary from "../dictionary.js";
import type * as dictionaryQueries from "../dictionaryQueries.js";
import type * as errors from "../errors.js";
import type * as files from "../files.js";
import type * as fsrs from "../fsrs.js";
import type * as grammarMapping from "../grammarMapping.js";
import type * as grammars from "../grammars.js";
import type * as http from "../http.js";
import type * as id from "../id.js";
import type * as init from "../init.js";
import type * as institutes from "../institutes.js";
import type * as kiwi from "../kiwi.js";
import type * as legal from "../legal.js";
import type * as lemonsqueezy from "../lemonsqueezy.js";
import type * as migrations_migrateAudioToSpaces from "../migrations/migrateAudioToSpaces.js";
import type * as migrations_migrateAudioToSpacesQueries from "../migrations/migrateAudioToSpacesQueries.js";
import type * as migrations_migrateVocabNotebooks from "../migrations/migrateVocabNotebooks.js";
import type * as newsAdmin from "../newsAdmin.js";
import type * as newsConfig from "../newsConfig.js";
import type * as newsIngestion from "../newsIngestion.js";
import type * as newsProjection from "../newsProjection.js";
import type * as newsSources from "../newsSources.js";
import type * as notebooks from "../notebooks.js";
import type * as payments from "../payments.js";
import type * as paymentsMutations from "../paymentsMutations.js";
import type * as pdfHelpers from "../pdfHelpers.js";
import type * as podcastActions from "../podcastActions.js";
import type * as podcastTranscripts from "../podcastTranscripts.js";
import type * as podcasts from "../podcasts.js";
import type * as progress from "../progress.js";
import type * as publishers from "../publishers.js";
import type * as qa from "../qa.js";
import type * as queryLimits from "../queryLimits.js";
import type * as settings from "../settings.js";
import type * as setupDailyPhrases from "../setupDailyPhrases.js";
import type * as storage from "../storage.js";
import type * as storagePresign from "../storagePresign.js";
import type * as subscription from "../subscription.js";
import type * as topik from "../topik.js";
import type * as topikWriting from "../topikWriting.js";
import type * as topikWritingSeed from "../topikWritingSeed.js";
import type * as transcriptMigrations from "../transcriptMigrations.js";
import type * as transcriptSchema from "../transcriptSchema.js";
import type * as transcriptStorage from "../transcriptStorage.js";
import type * as tts from "../tts.js";
import type * as ttsCache from "../ttsCache.js";
import type * as typing from "../typing.js";
import type * as units from "../units.js";
import type * as user from "../user.js";
import type * as userStats from "../userStats.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";
import type * as validation from "../validation.js";
import type * as videos from "../videos.js";
import type * as vocab from "../vocab.js";
import type * as vocabHelpers from "../vocabHelpers.js";
import type * as vocabPdf from "../vocabPdf.js";
import type * as vocabPdfQueries from "../vocabPdfQueries.js";
import type * as xp from "../xp.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accountRecovery: typeof accountRecovery;
  accountRecoveryInternal: typeof accountRecoveryInternal;
  achievements: typeof achievements;
  admin: typeof admin;
  ai: typeof ai;
  aiCache: typeof aiCache;
  aiUsageLogs: typeof aiUsageLogs;
  aiWritingEvaluation: typeof aiWritingEvaluation;
  annotations: typeof annotations;
  auth: typeof auth;
  canvas: typeof canvas;
  crons: typeof crons;
  diagnostics: typeof diagnostics;
  dictionary: typeof dictionary;
  dictionaryQueries: typeof dictionaryQueries;
  errors: typeof errors;
  files: typeof files;
  fsrs: typeof fsrs;
  grammarMapping: typeof grammarMapping;
  grammars: typeof grammars;
  http: typeof http;
  id: typeof id;
  init: typeof init;
  institutes: typeof institutes;
  kiwi: typeof kiwi;
  legal: typeof legal;
  lemonsqueezy: typeof lemonsqueezy;
  "migrations/migrateAudioToSpaces": typeof migrations_migrateAudioToSpaces;
  "migrations/migrateAudioToSpacesQueries": typeof migrations_migrateAudioToSpacesQueries;
  "migrations/migrateVocabNotebooks": typeof migrations_migrateVocabNotebooks;
  newsAdmin: typeof newsAdmin;
  newsConfig: typeof newsConfig;
  newsIngestion: typeof newsIngestion;
  newsProjection: typeof newsProjection;
  newsSources: typeof newsSources;
  notebooks: typeof notebooks;
  payments: typeof payments;
  paymentsMutations: typeof paymentsMutations;
  pdfHelpers: typeof pdfHelpers;
  podcastActions: typeof podcastActions;
  podcastTranscripts: typeof podcastTranscripts;
  podcasts: typeof podcasts;
  progress: typeof progress;
  publishers: typeof publishers;
  qa: typeof qa;
  queryLimits: typeof queryLimits;
  settings: typeof settings;
  setupDailyPhrases: typeof setupDailyPhrases;
  storage: typeof storage;
  storagePresign: typeof storagePresign;
  subscription: typeof subscription;
  topik: typeof topik;
  topikWriting: typeof topikWriting;
  topikWritingSeed: typeof topikWritingSeed;
  transcriptMigrations: typeof transcriptMigrations;
  transcriptSchema: typeof transcriptSchema;
  transcriptStorage: typeof transcriptStorage;
  tts: typeof tts;
  ttsCache: typeof ttsCache;
  typing: typeof typing;
  units: typeof units;
  user: typeof user;
  userStats: typeof userStats;
  users: typeof users;
  utils: typeof utils;
  validation: typeof validation;
  videos: typeof videos;
  vocab: typeof vocab;
  vocabHelpers: typeof vocabHelpers;
  vocabPdf: typeof vocabPdf;
  vocabPdfQueries: typeof vocabPdfQueries;
  xp: typeof xp;
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
