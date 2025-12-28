/**
 * Custom Application Error Class
 * Provides structured error handling with HTTP status codes
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code?: string;

    constructor(
        message: string,
        statusCode: number = 500,
        isOperational: boolean = true,
        code?: string
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;

        // Capture stack trace (excluding constructor)
        Error.captureStackTrace(this, this.constructor);

        // Set prototype explicitly for proper instanceof checks
        Object.setPrototypeOf(this, AppError.prototype);
    }

    // Factory methods for common errors
    static badRequest(message: string = '请求参数错误') {
        return new AppError(message, 400, true, 'BAD_REQUEST');
    }

    static unauthorized(message: string = '请先登录') {
        return new AppError(message, 401, true, 'UNAUTHORIZED');
    }

    static forbidden(message: string = '没有权限访问') {
        return new AppError(message, 403, true, 'FORBIDDEN');
    }

    static notFound(message: string = '资源不存在') {
        return new AppError(message, 404, true, 'NOT_FOUND');
    }

    static conflict(message: string = '资源冲突') {
        return new AppError(message, 409, true, 'CONFLICT');
    }

    static tooManyRequests(message: string = '请求过于频繁') {
        return new AppError(message, 429, true, 'TOO_MANY_REQUESTS');
    }

    static internal(message: string = '服务器内部错误') {
        return new AppError(message, 500, false, 'INTERNAL_ERROR');
    }

    static serviceUnavailable(message: string = '服务暂时不可用') {
        return new AppError(message, 503, false, 'SERVICE_UNAVAILABLE');
    }
}

export default AppError;
