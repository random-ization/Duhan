"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import Parser from "rss-parser";

// RSS Parser instance
const parser = new Parser();

// ============================================
// Actions (External API calls)
// ============================================

/**
 * Search podcasts using iTunes API
 */
export const searchPodcasts = action({
    args: { term: v.string() },
    handler: async (ctx, args) => {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(args.term)}&media=podcast&entity=podcast&limit=15`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.results) return [];

        return data.results
            .map((item: any) => ({
                id: item.collectionId?.toString() || "",
                title: item.collectionName || "Unknown",
                author: item.artistName || "Unknown",
                feedUrl: item.feedUrl || "",
                artwork: item.artworkUrl600 || item.artworkUrl100 || "",
                description: item.collectionName || "",
            }))
            .filter((p: any) => p.feedUrl);
    },
});

/**
 * Get episodes from a podcast RSS feed
 */
export const getEpisodes = action({
    args: { feedUrl: v.string() },
    handler: async (ctx, args) => {
        try {
            const feed = await parser.parseURL(args.feedUrl);

            const episodes = feed.items.slice(0, 50).map(item => ({
                title: item.title || "Untitled Episode",
                audioUrl: item.enclosure?.url,
                pubDate: item.pubDate,
                duration: (item as any).itunes?.duration || (item as any)["itunes:duration"],
                description: item.contentSnippet || item.content || "",
                guid: item.guid || item.link || item.title,
            }));

            return {
                channel: {
                    title: feed.title,
                    description: feed.description,
                    image: feed.image?.url || (feed as any).itunes?.image,
                    author: (feed as any).itunes?.author,
                },
                episodes: episodes.filter(ep => ep.audioUrl),
            };
        } catch (error) {
            console.error("[RSS Parse Error]", error);
            throw new Error("FAILED_TO_PARSE_RSS");
        }
    },
});
