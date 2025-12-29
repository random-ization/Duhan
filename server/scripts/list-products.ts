
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CREEM_API_KEY = process.env.CREEM_API_KEY;
const CREEM_API_URL = 'https://api.creem.io/v1/products';

if (!CREEM_API_KEY) {
    console.error('❌ CREEM_API_KEY is missing');
    process.exit(1);
}

console.log(`Using API Key: ${CREEM_API_KEY.slice(0, 15)}...`);

async function main() {
    try {
        console.log('Fetching products from Creem...');
        const response = await axios.get(CREEM_API_URL, {
            headers: {
                'Authorization': `Bearer ${CREEM_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const products = response.data.items || response.data;

        if (products.length === 0) {
            console.log('⚠️  No products found in this account.');
        } else {
            console.log('✅ Found Products:');
            products.forEach((p: any) => {
                console.log(`-----------------------------------`);
                console.log(`ID:   ${p.id}`);
                console.log(`Name: ${p.name}`);
                console.log(`Price: ${p.price_amount} ${p.price_currency}`);
            });
            console.log(`-----------------------------------`);
        }

    } catch (error: any) {
        console.error('❌ Failed to fetch products:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Body:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

main();
