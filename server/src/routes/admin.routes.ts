import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getUsers, updateUser, deleteUser } from '../controllers/admin.user.controller';

const router = Router();

// 所有 admin 路由都需要登录，控制器内部再检查 role 是否为 ADMIN
router.use(authenticate);

router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;
