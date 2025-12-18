/**
 * Fetches the user's country code based on their IP address.
 * Uses a public IP geolocation API.
 * 
 * @returns Promise<string | null> Two-letter country code (e.g., 'CN', 'US') or null if failed
 */
export async function fetchUserCountry(): Promise<string | null> {
    try {
        // Attempt 1: ipapi.co (Free, rate limited)
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data.country_code || null;
    } catch (error) {
        console.warn('Failed to fetch user country via ipapi.co:', error);

        // Fallback? For now just return null and let the app default to English or stored language
        return null;
    }
}
