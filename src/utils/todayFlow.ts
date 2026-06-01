import { appendReturnToPath } from './navigation';

export const addTodayFlowParam = (path: string, taskId?: string): string => {
  const [pathWithoutHash, hash = ''] = path.split('#');
  const [pathname, query = ''] = pathWithoutHash.split('?');
  const params = new URLSearchParams(query);
  params.set('flow', 'today');
  if (taskId) {
    params.set('taskId', taskId);
  }
  const nextQuery = params.toString();
  const nextPath = nextQuery ? `${pathname}?${nextQuery}` : pathname;
  return hash ? `${nextPath}#${hash}` : nextPath;
};

type TodayTaskLink = {
  kind?: string;
  linkPath?: string;
  taskId?: string;
};

export const normalizeTodayTaskLinkPath = (task: TodayTaskLink): string | undefined => {
  if (task.kind === 'vocab_20' && task.linkPath === '/review') {
    return '/review/quiz?mode=full';
  }
  return task.linkPath;
};

export const buildTodayTaskPath = (task: TodayTaskLink, returnToPath: string): string | null => {
  const linkPath = normalizeTodayTaskLinkPath(task);
  if (!linkPath) return null;
  return appendReturnToPath(addTodayFlowParam(linkPath, task.taskId), returnToPath);
};
