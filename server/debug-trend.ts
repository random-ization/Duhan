
import dotenv from 'dotenv';
import path from 'path';

// Load env before imports
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { getTrending, searchPodcasts } from './src/services/podcast.service';

async function run() {
    console.log('=== STARTING DEBUG ===');

    console.log('\n1. Testing Search ("Korean Culture")...');
    try {
        const searchResults = await searchPodcasts('Korean Culture');
        console.log(`   > Results found: ${searchResults.length}`);
        if (searchResults.length > 0) {
            console.log(`   > First Item: ${searchResults[0].title} (Feed: ${searchResults[0].feedUrl})`);
        } else {
            console.log('   > ❌ SEARCH IS EMPTY');
        }
    } catch (e: any) {
        console.error('   > ❌ Search Error:', e.message);
    }

    console.log('\n2. Testing Trending (Force Refresh)...');
    try {
        const trending = await getTrending(true);
        console.log(`   > External (Apple): ${trending.external.length}`);
        console.log(`   > Internal (DB): ${trending.internal.length}`);

        if (trending.external.length === 0) {
            console.log('   > ❌ EXTERNAL TRENDING IS EMPTY');
        } else {
            console.log(`   > First External: ${trending.external[0].title} (Feed: ${trending.external[0].feedUrl})`);
        }
    } catch (e: any) {
        console.error('   > ❌ Trending Error:', e.message);
        console.error(e);
    }

    console.log('\n=== END DEBUG ===');
    process.exit(0);
}

run();
