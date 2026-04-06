# Convex 后端集成测试

本文档说明如何为 Convex 后端编写和运行集成测试。

## 测试框架

我们使用 `convex-test` 配合 `vitest` 进行 Convex 后端的集成测试。

## 测试结构

```
tests/convex/
├── setup.ts              # 全局测试配置
├── auth.test.ts           # 用户认证和权限测试
├── vocab.test.ts          # 词汇模块测试
├── notePages.test.ts      # 笔记页面模块测试
├── learning.test.ts       # 学习进度跟踪测试
└── adminUserUtils.test.ts # 管理员工具测试
```

## 运行测试

### 运行所有 Convex 测试
```bash
npm run test:convex
```

### 监视模式运行测试
```bash
npm run test:convex:watch
```

### 运行测试并生成覆盖率报告
```bash
npm run test:convex:coverage
```

### 运行特定测试文件
```bash
npx vitest run --config vitest.convex.config.ts tests/convex/vocab.test.ts
```

## 编写测试

### 基本测试结构

```typescript
import { describe, expect, it, beforeAll } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from '../../convex/_generated/api';

describe('Module Name Tests', () => {
  let test: ReturnType<typeof convexTest>;

  beforeAll(() => {
    test = convexTest(api);
  });

  it('should do something', async () => {
    // 创建测试数据
    const userId = await test.run(async (ctx) => {
      const user = await ctx.db.insert('users', {
        email: 'test@example.com',
        name: 'Test User',
        // ... 其他必需字段
      });
      return user;
    });

    // 执行测试
    const result = await test.query(api.module.function, {
      // 参数
    });

    // 断言结果
    expect(result).toBeDefined();
  });
});
```

### 测试认证和权限

```typescript
// 创建用户并测试认证
const result = await test.withIdentity(userId).query(api.protectedFunction);
```

### 测试数据库操作

```typescript
// 在测试中创建数据
const testId = await test.run(async (ctx) => {
  const id = await ctx.db.insert('table', {
    // 数据
  });
  return id;
});
```

## 测试最佳实践

1. **隔离测试**: 每个测试都应该独立运行，不依赖其他测试的状态
2. **清理数据**: 使用 `beforeAll` 和 `afterAll` 适当设置和清理测试数据
3. **真实数据**: 使用真实的数据结构，但使用测试专用的数据
4. **覆盖边界情况**: 测试成功、失败和边界情况
5. **权限测试**: 确保只有授权用户能访问相应功能

## 测试覆盖的模块

### 1. 用户认证 (auth.test.ts)
- 用户创建和验证
- 登录和注销
- 权限检查
- 用户资料管理
- 订阅管理

### 2. 词汇模块 (vocab.test.ts)
- 词汇查询和搜索
- 词汇保存和更新
- 学习进度跟踪
- 批量导入功能
- 每日短语功能

### 3. 笔记页面 (notePages.test.ts)
- 页面创建和管理
- 笔记本操作
- 搜索功能
- 权限控制
- 归档和置顶

### 4. 学习进度 (learning.test.ts)
- 学习事件跟踪
- 分析数据
- 考试尝试
- 错误记录
- 学习快照

## 持续集成

测试会在以下情况下自动运行：
- 提交代码时 (pre-commit hook)
- 创建 Pull Request 时
- 发布版本前

确保所有测试通过后再合并代码。

## 故障排除

### 常见问题

1. **测试超时**: 增加测试超时时间或优化测试数据
2. **数据库约束**: 确保测试数据符合数据库约束
3. **权限错误**: 使用正确的用户身份进行测试
4. **异步操作**: 正确处理 Promise 和异步操作

### 调试技巧

1. 使用 `console.log` 或测试框架的调试功能
2. 检查测试数据库的状态
3. 验证测试数据的完整性
4. 使用断点调试复杂逻辑
