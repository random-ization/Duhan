import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getAll = query({
  args: {},
  handler: async ctx => {
    const publishers = await ctx.db.query('publishers').collect();
    return await Promise.all(
      publishers.map(async p => {
        let url = p.imageUrl;
        if (url && !url.startsWith('http')) {
          // Assume it's a storage ID
          url = (await ctx.storage.getUrl(url)) || undefined;
        }
        return { ...p, imageUrl: url };
      })
    );
  },
});

export const save = mutation({
  args: {
    name: v.string(),
    nameKo: v.optional(v.string()),
    nameZh: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    nameVi: v.optional(v.string()),
    nameMn: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('publishers')
      .withIndex('by_name', q => q.eq('name', args.name))
      .first();

    const updates: Record<string, string | undefined> = {
      nameKo: args.nameKo,
      nameZh: args.nameZh,
      nameEn: args.nameEn,
      nameVi: args.nameVi,
      nameMn: args.nameMn,
    };

    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...updates,
        imageUrl: args.imageUrl,
      });
    } else {
      await ctx.db.insert('publishers', {
        name: args.name,
        ...updates,
        imageUrl: args.imageUrl,
      });
    }
  },
});

export const generateUploadUrl = mutation(async ctx => {
  return await ctx.storage.generateUploadUrl();
});
