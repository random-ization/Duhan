// server/src/lib/storage.ts - STUB VERSION
// 紧急回滚：移除 @aws-sdk/client-s3 引用，因为该库似乎导致生产环境崩溃

import multer from 'multer';

// 模拟 S3 客户端导出
export const s3Client = {};

// 模拟上传结果接口
export interface UploadJsonResult {
  url: string;
  key: string;
}

// 内存存储 Multer
const memoryStorage = multer.memoryStorage();
// 为了兼容，我们需要支持 .single()
const uploadMock = multer({ storage: memoryStorage });

// 兼容层：确保导出对象有 single 方法
const createCompatWrapper = () => {
  return {
    single: (fieldName: string) => uploadMock.single(fieldName)
  }
}

export const uploadAvatar = createCompatWrapper() as any;
export const uploadMedia = createCompatWrapper() as any;

// Mock 上传函数
export const uploadJsonToS3 = async (data: any, key: string): Promise<UploadJsonResult> => {
  console.warn('[storage STUB] uploadJsonToS3 called - S3 is disabled');
  return { url: '', key: key };
};

export const deleteFromS3 = async (key: string): Promise<void> => {
  console.warn('[storage STUB] deleteFromS3 called - S3 is disabled');
};

export const extractKeyFromUrl = (url: string): string | null => {
  return null;
};

// Mock 测试函数
export const testS3Connection = async (): Promise<{ success: boolean; message: string }> => {
  return { success: false, message: 'S3 Library Disabled (Stub Mode)' };
};