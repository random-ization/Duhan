# Security Improvements

This document outlines the security enhancements made to the HanGyeol backend.

## 1. Input Validation with Zod

All API endpoints now validate incoming data using [Zod](https://zod.dev/) schemas before processing.

### Benefits:

- **Type Safety**: Zod provides runtime type checking and integrates with TypeScript
- **Data Validation**: Ensures all required fields are present and correctly formatted
- **Error Messages**: Clear validation error messages returned to clients
- **Attack Prevention**: Prevents malformed or malicious data from reaching the database

### Validation Schemas:

- `RegisterSchema` - User registration
- `LoginSchema` - User login
- `SaveWordSchema` - Vocabulary word saving
- `SaveAnnotationSchema` - Text annotations
- `SaveExamAttemptSchema` - Exam results
- `LogActivitySchema` - Learning activity logs
- `SaveTopikExamSchema` - TOPIK exam creation/editing
- And more...

### Example:

```typescript
// Before (no validation)
const { email, password } = req.body;

// After (with Zod validation)
const validatedData = RegisterSchema.parse(req.body);
const { email, password } = validatedData;
```

## 2. Removed Hardcoded Credentials

### Changes:

- Removed hardcoded admin password from `create-admin.ts`
- Now requires `ADMIN_PASSWORD` environment variable
- Password must be at least 8 characters for security

### Usage:

```bash
# Set in .env file
ADMIN_PASSWORD=your_secure_password_min_8_chars
ADMIN_EMAIL=admin@example.com

# Or set as environment variable
export ADMIN_PASSWORD=your_secure_password
npm run create-admin
```

### Security Benefits:

- No passwords in source code
- Different passwords for dev/staging/production
- Passwords not committed to version control
- Meets security best practices

## 3. Type Safety Improvements

### Eliminated `any` Types:

All controller functions now use proper TypeScript types:

**Before:**

```typescript
export const saveWord = async (req: any, res: any) => {
  // ...
};
```

**After:**

```typescript
import { AuthRequest } from '../middleware/auth.middleware';
import { Response } from 'express';

export const saveWord = async (req: AuthRequest, res: Response) => {
  const validatedData: SaveWordInput = SaveWordSchema.parse(req.body);
  // ...
};
```

### Benefits:

- **Compile-Time Safety**: TypeScript catches type errors before runtime
- **Better IDE Support**: Autocomplete and inline documentation
- **Clearer Code**: Explicit types make code easier to understand
- **Fewer Bugs**: Type mismatches caught during development

## 4. Error Handling

All controllers now include proper error handling:

```typescript
try {
  // Validate input
  const validatedData = SomeSchema.parse(req.body);
  // Process request...
} catch (e: any) {
  if (e.name === 'ZodError') {
    return res.status(400).json({
      error: 'Invalid input',
      details: e.errors,
    });
  }
  res.status(500).json({ error: 'Operation failed' });
}
```

### Error Response Format:

```json
{
  "error": "Invalid input",
  "details": [
    {
      "code": "too_small",
      "minimum": 6,
      "path": ["password"],
      "message": "Password must be at least 6 characters"
    }
  ]
}
```

## 5. Updated Controllers

All controllers have been enhanced:

- ✅ `auth.controller.ts` - Register, login, getMe
- ✅ `user.controller.ts` - All user data operations
- ✅ `content.controller.ts` - Institute, content, TOPIK exam management

## 6. Environment Variables

Required environment variables documented in `.env.example`:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="secure_password_here"
PORT=3001
```

## Setup Instructions

1. **Copy example environment file:**

   ```bash
   cp .env.example .env
   ```

2. **Set secure values in `.env`:**
   - Use a strong, random JWT_SECRET
   - Set a secure ADMIN_PASSWORD (min 8 characters)
   - Configure your DATABASE_URL

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Generate Prisma client:**

   ```bash
   npm run prisma:generate
   ```

5. **Create admin user:**
   ```bash
   npm run create-admin
   ```

## Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use different credentials** for dev/staging/production
3. **Rotate secrets regularly** in production
4. **Use strong passwords** (12+ characters, mixed case, numbers, symbols)
5. **Monitor logs** for suspicious activity
6. **Keep dependencies updated** - Run `npm audit` regularly

## Validation Example

Frontend receives clear error messages:

```typescript
// Client-side handling
try {
  const response = await fetch('/api/user/save-word', {
    method: 'POST',
    body: JSON.stringify({ korean: '', english: 'hello' }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.log(error.details); // Zod validation errors
  }
} catch (error) {
  console.error('Request failed:', error);
}
```

## Testing Validation

You can test the validation by sending invalid data:

```bash
# Missing required field
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test"}'
# Response: {"error": "Invalid input", "details": [...]}

# Invalid email format
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "not-an-email", "password": "pass123", "name": "Test"}'
# Response: {"error": "Invalid input", "details": [...]}
```

## Additional Resources

- [Zod Documentation](https://zod.dev/)
- [Express TypeScript Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
