const https = require('https');

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function debugCharts() {
    try {
        const url = 'https://rss.marketingtools.apple.com/api/v2/kr/podcasts/top/25/podcasts.json';
        console.log('Fetching RSS:', url);
        const rssData = await fetch(url);

        if (!rssData.feed || !rssData.feed.results) {
            console.error('No results in RSS');
            return;
        }

        const topItems = rssData.feed.results.slice(0, 10);
        console.log(`Found ${topItems.length} items.`);

        const ids = topItems.map(item => item.id).join(',');
        console.log('IDs:', ids);

        const lookupUrl = `https://itunes.apple.com/lookup?id=${ids}`;
        console.log('Fetching Lookup:', lookupUrl);
        const lookupData = await fetch(lookupUrl);

        const results = lookupData.results || [];
        console.log(`Lookup returned ${results.length} items.`);

        results.forEach(item => {
            console.log(`ID: ${item.collectionId}, Feed: ${item.feedUrl}`);
        });

    } catch (e) {
        console.error('Error:', e);
    }
}

debugCharts();
