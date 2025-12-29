
import axios from 'axios';

// Hardcoded for absolute certainty
const API_KEY = 'creem_test_2qk1sFcddNAjNt83TVMABY';

console.log('------------------------------------------------');
console.log('🔍 DEBUG: Testing Creem API directly (Hardcoded Key)');
console.log(`🔑 Key: ${API_KEY}`);
console.log('------------------------------------------------');

async function test() {
    // Test 1: List Products (simplest read operation)
    try {
        console.log('\n[1] Testing GET /v1/products...');
        const res = await axios.get('https://api.creem.io/v1/products', {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Success! Status:', res.status);
        console.log('📦 Data:', JSON.stringify(res.data, null, 2));
    } catch (err: any) {
        console.log('❌ Failed.');
        if (err.response) {
            console.log(`   Status: ${err.response.status} ${err.response.statusText}`);
            console.log(`   Body: ${JSON.stringify(err.response.data)}`);
            console.log(`   Headers: ${JSON.stringify(err.response.headers)}`);
        } else {
            console.log(`   Error: ${err.message}`);
        }
    }

    // Test 2: Create Dummy Checkout (to see if we get 403 or 400)
    // If we get 403, it's Auth. If we get 400/404, Auth is OK.
    try {
        console.log('\n[2] Testing POST /v1/checkouts (Dummy Data)...');
        const res = await axios.post('https://api.creem.io/v1/checkouts', {
            product_id: 'prod_dummy_12345', // Intentionally fake
            mode: 'payment',
            success_url: 'http://localhost:3000/success',
            cancel_url: 'http://localhost:3000/cancel'
        }, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Success! (Unexpected for dummy ID)');
    } catch (err: any) {
        console.log('❌ Failed.');
        if (err.response) {
            console.log(`   Status: ${err.response.status} ${err.response.statusText}`);
            console.log(`   Body: ${JSON.stringify(err.response.data)}`);
        } else {
            console.log(`   Error: ${err.message}`);
        }
    }
}

test();
