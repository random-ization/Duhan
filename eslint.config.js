import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
    // Global ignores (migrated from .eslintignore)
    {
        ignores: [
            "convex/_generated/",
            "**/_generated/",
            "dist/",
            "build/",
            ".next/",
            "node_modules/",
            "coverage/",
        ],
    },

    // Base JavaScript recommended rules
    js.configs.recommended,

    // TypeScript and React configuration
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
                ecmaVersion: "latest",
                sourceType: "module",
            },
            globals: {
                ...globals.browser,
                ...globals.es2021,
                ...globals.node,
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
        },
        rules: {
            // TypeScript ESLint recommended rules
            ...tsPlugin.configs.recommended.rules,

            // React plugin recommended rules
            ...reactPlugin.configs.recommended.rules,

            // React Hooks recommended rules
            ...reactHooksPlugin.configs.recommended.rules,

            // Custom rules
            "react/react-in-jsx-scope": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "react/prop-types": "off",
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },

    // JavaScript files configuration
    {
        files: ["**/*.{js,mjs,cjs}"],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2021,
            },
        },
    },
];
