import { describe, expect, it, beforeAll } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from '../../convex/_generated/api';

describe('Auth and Permissions Integration Tests', () => {
  let test: ReturnType<typeof convexTest>;

  beforeAll(() => {
    test = convexTest(api);
  });

  describe('User Authentication', () => {
    it('should create a new user', async () => {
      const result = await test.mutation(api.users.create, {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('newuser@example.com');
      expect(result.user?.name).toBe('New User');
      expect(result.user?.role).toBe('STUDENT');
    });

    it('should not create user with duplicate email', async () => {
      // First user creation
      await test.mutation(api.users.create, {
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'First User',
      });

      // Second user creation with same email
      const result = await test.mutation(api.users.create, {
        email: 'duplicate@example.com',
        password: 'password456',
        name: 'Second User',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should authenticate user with correct credentials', async () => {
      // Create user first
      await test.mutation(api.users.create, {
        email: 'auth@example.com',
        password: 'correctpassword',
        name: 'Auth User',
      });

      // Authenticate
      const result = await test.mutation(api.users.authenticate, {
        email: 'auth@example.com',
        password: 'correctpassword',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('auth@example.com');
    });

    it('should reject authentication with wrong password', async () => {
      // Create user first
      await test.mutation(api.users.create, {
        email: 'wrong@example.com',
        password: 'correctpassword',
        name: 'Wrong User',
      });

      // Try to authenticate with wrong password
      const result = await test.mutation(api.users.authenticate, {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });
  });

  describe('Admin Permissions', () => {
    it('should allow admin to access admin functions', async () => {
      // Create admin user
      const adminId = await test.run(async (ctx) => {
        const user = await ctx.db.insert('users', {
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });
        return user;
      });

      // Test admin function access
      const result = await test.withIdentity(adminId).query(api.users.list);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should reject non-admin access to admin functions', async () => {
      // Create regular user
      const userId = await test.run(async (ctx) => {
        const user = await ctx.db.insert('users', {
          email: 'student@example.com',
          name: 'Student User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });
        return user;
      });

      // Try to access admin function
      await expect(
        test.withIdentity(userId).query(api.users.list)
      ).rejects.toThrow();
    });
  });

  describe('User Profile Management', () => {
    it('should update user profile', async () => {
      const userId = await test.run(async (ctx) => {
        const user = await ctx.db.insert('users', {
          email: 'profile@example.com',
          name: 'Original Name',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });
        return user;
      });

      const result = await test.withIdentity(userId).mutation(api.users.updateProfile, {
        name: 'Updated Name',
        image: 'https://example.com/avatar.jpg',
      });

      expect(result.success).toBe(true);
    });

    it('should change user password', async () => {
      const userId = await test.run(async (ctx) => {
        const user = await ctx.db.insert('users', {
          email: 'password@example.com',
          name: 'Password User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });
        return user;
      });

      const result = await test.withIdentity(userId).mutation(api.users.changePassword, {
        currentPassword: 'password123',
        newPassword: 'newpassword456',
      });

      expect(result.success).toBe(true);
    });

    it('should reject password change with wrong current password', async () => {
      const userId = await test.run(async (ctx) => {
        const user = await ctx.db.insert('users', {
          email: 'wrongpass@example.com',
          name: 'Wrong Pass User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });
        return user;
      });

      const result = await test.withIdentity(userId).mutation(api.users.changePassword, {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword456',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Current password is incorrect');
    });
  });

  describe('User Subscription Management', () => {
    it('should upgrade user subscription', async () => {
      const userId = await test.run(async (ctx) => {
        const user = await ctx.db.insert('users', {
          email: 'premium@example.com',
          name: 'Premium User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });
        return user;
      });

      const result = await test.mutation(api.users.upgradeSubscription, {
        userId,
        plan: 'PREMIUM',
        expiryDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
      });

      expect(result.success).toBe(true);
    });

    it('should check subscription status', async () => {
      const userId = await test.run(async (ctx) => {
        const user = await ctx.db.insert('users', {
          email: 'subscription@example.com',
          name: 'Subscription User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'PREMIUM',
          subscriptionType: 'PREMIUM',
          subscriptionExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });
        return user;
      });

      const result = await test.withIdentity(userId).query(api.users.getSubscriptionStatus);

      expect(result.plan).toBe('PREMIUM');
      expect(result.isActive).toBe(true);
      expect(result.expiryDate).toBeDefined();
    });
  });
});
