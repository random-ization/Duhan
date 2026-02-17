import React from 'react';
import { BookOpen, GraduationCap, XCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

// Type icons mapping
const TYPE_CONFIG: Record<
  string,
  { icon: React.ComponentType<any>; color: string; bgColor: string }
> = {
  VOCAB: {
    icon: BookOpen,
    color: 'text-indigo-600 dark:text-indigo-200',
    bgColor: 'bg-indigo-50 dark:bg-indigo-400/12',
  },
  GRAMMAR: {
    icon: GraduationCap,
    color: 'text-emerald-600 dark:text-emerald-200',
    bgColor: 'bg-emerald-50 dark:bg-emerald-400/12',
  },
  MISTAKE: {
    icon: XCircle,
    color: 'text-red-500 dark:text-rose-200',
    bgColor: 'bg-red-50 dark:bg-rose-400/12',
  },
  GENERAL: { icon: FileText, color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

interface NoteCardProps {
  type: string;
  title: string;
  preview: string | null;
  tags: string[];
  createdAt: string;
  onClick: () => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ type, title, preview, tags, createdAt, onClick }) => {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.GENERAL;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, boxShadow: '0 12px 24px -8px rgba(0,0,0,0.15)' }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer group"
    >
      {/* Header */}
      <div className={`flex items-center gap-3 p-4 ${config.bgColor}`}>
        <div
          className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center border border-white/50 dark:border-border/60`}
        >
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-muted-foreground truncate text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
            {title}
          </h3>
          <span className={`text-xs font-medium ${config.color} uppercase tracking-wider`}>
            {type}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {preview ? (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{preview}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">暂无预览内容</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, 3).map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-medium rounded-full"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {formatRelativeTime(createdAt)}
        </span>
      </div>
    </motion.div>
  );
};

export default NoteCard;
