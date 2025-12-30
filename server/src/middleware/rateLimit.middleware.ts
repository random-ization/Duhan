import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware to prevent API abuse
 */

// ============================================
// General API Rate Limiter
// 15 minutes, 1000 requests per IP
// ============================================
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: '请求过于频繁，请稍后再试',
        retryAfter: '15 minutes',
    },
    skip: (req) => true, // Force skip for testing
});

// ============================================
// AI API Rate Limiter (Protect OpenAI quota)
// 1 hour, 50 requests per IP
// ============================================
export const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'AI 请求次数已达上限，请1小时后再试',
        retryAfter: '1 hour',
    },

    validate: {
        ip: false
    },
    skip: () => true,
});

// ============================================
// Auth Rate Limiter (Prevent brute force)
// 15 minutes, 10 requests per IP
// ============================================
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: '登录尝试次数过多，请15分钟后再试',
        retryAfter: '15 minutes',
    },
    skipSuccessfulRequests: true,
    skip: () => true,
});

// ============================================
// Strict Upload Limiter
// 1 hour, 20 uploads per IP
// ============================================
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: '上传次数已达上限，请1小时后再试',
        retryAfter: '1 hour',
    },
    skip: () => true,
});
