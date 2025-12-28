/**
 * Global Error Handling Middleware
 * Catches all errors and returns structured responses
 */
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError';
import { Prisma } from '@prisma/client';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Handle Prisma database errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
    switch (error.code) {
        case 'P2002': {
            // Unique constraint violation
            const target = (error.meta?.target as string[])?.join(', ') || 'field';
            return new AppError(`${target} 已存在`, 409, true, 'UNIQUE_CONSTRAINT');
        }
        case 'P2025':
            // Record not found
            return AppError.notFound('记录不存在');
        case 'P2003':
            // Foreign key constraint failed
            return new AppError('关联数据不存在', 400, true, 'FOREIGN_KEY_CONSTRAINT');
        case 'P2014':
            // Required relation violation
            return new AppError('违反数据关联约束', 400, true, 'RELATION_VIOLATION');
        default:
            return new AppError(`数据库错误: ${error.code}`, 500, false, 'DATABASE_ERROR');
    }
}

/**
 * Handle Prisma validation errors
 */
function handlePrismaValidationError(error: Prisma.PrismaClientValidationError): AppError {
    return new AppError('数据验证失败', 400, true, 'VALIDATION_ERROR');
}

/**
 * Format error response for development
 */
function sendDevError(error: AppError, res: Response) {
    res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        stack: error.stack,
    });
}

/**
 * Format error response for production
 */
function sendProdError(error: AppError, res: Response) {
    // Only send operational (trusted) errors to client
    if (error.isOperational) {
        res.status(error.statusCode).json({
            success: false,
            error: error.message,
            code: error.code,
        });
    } else {
        // Log unknown errors for debugging
        console.error('[ERROR]', error);

        // Send generic message for non-operational errors
        res.status(500).json({
            success: false,
            error: '服务器内部错误，请稍后再试',
            code: 'INTERNAL_ERROR',
        });
    }
}

/**
 * Global Error Middleware
 * Must be registered LAST in Express middleware chain
 */
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    // Default to 500 internal error
    let error: AppError;

    if (err instanceof AppError) {
        error = err;
    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        error = handlePrismaError(err);
    } else if (err instanceof Prisma.PrismaClientValidationError) {
        error = handlePrismaValidationError(err);
    } else if (err instanceof Prisma.PrismaClientInitializationError) {
        error = new AppError('数据库连接失败', 503, false, 'DB_CONNECTION_ERROR');
    } else if (err.name === 'JsonWebTokenError') {
        error = AppError.unauthorized('无效的登录凭证');
    } else if (err.name === 'TokenExpiredError') {
        error = AppError.unauthorized('登录已过期，请重新登录');
    } else if (err.name === 'SyntaxError' && 'body' in err) {
        error = AppError.badRequest('请求数据格式错误');
    } else {
        // Unknown error - wrap it
        error = new AppError(
            isDev ? err.message : '服务器内部错误',
            500,
            false,
            'UNKNOWN_ERROR'
        );
    }

    // Log all errors in development
    if (isDev) {
        console.error(`[${error.statusCode}] ${error.message}`);
        if (!error.isOperational) {
            console.error(err.stack);
        }
    }

    // Send response
    if (isDev) {
        sendDevError(error, res);
    } else {
        sendProdError(error, res);
    }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

export default errorHandler;
