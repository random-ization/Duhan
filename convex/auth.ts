import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { compareSync, hashSync } from "bcryptjs";

// Custom bcrypt crypto for Password provider (to match legacy password hashes)
const bcryptCrypto = {
    async hashSecret(password: string): Promise<string> {
        return hashSync(password, 10);
    },
    async verifySecret(password: string, storedHash: string): Promise<boolean> {
        return compareSync(password, storedHash);
    },
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
    providers: [
        Google,
        Password({
            id: "password", // Explicitly set provider ID
            crypto: bcryptCrypto,
            profile(params) {
                const email = (params.email as string || "").trim().toLowerCase();
                return {
                    email,
                };
            },
        }),
    ],
    callbacks: {
        async redirect({ redirectTo }) {
            // Whitelist allowed frontend domains
            const allowedOrigins = [
                "https://koreanstudy.me",
                "https://www.koreanstudy.me",
                "http://localhost:5173",
                "http://localhost:3000"
            ];

            try {
                const url = new URL(redirectTo);
                if (allowedOrigins.includes(url.origin)) {
                    return redirectTo;
                }
            } catch {
                // Invalid URL or relative path
            }

            // Fallback to SITE_URL (backend)
            return process.env.SITE_URL!;
        },
    },
});
