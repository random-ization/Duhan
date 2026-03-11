export interface NotebookListItem {
  id: string;
  type: string;
  title: string;
  preview?: string | null;
  tags: string[];
  createdAt: string;
}

export interface NotebookListResult {
  success: boolean;
  data?: NotebookListItem[];
}
