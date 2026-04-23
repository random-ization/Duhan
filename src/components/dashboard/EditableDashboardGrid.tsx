import React from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export type EditableDashboardGridItem = {
  readonly id: string;
  readonly className?: string;
  readonly content: React.ReactNode;
};

type EditableDashboardGridProps = {
  readonly items: EditableDashboardGridItem[];
  readonly cardOrder: string[];
  readonly gridClassName: string;
  readonly onUpdateCardOrder: (nextOrder: string[]) => void;
};

type SortableItemProps = {
  readonly id: string;
  readonly className?: string;
  readonly children: React.ReactNode;
};

function SortableItem({ id, className, children }: Readonly<SortableItemProps>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative cursor-move ${className ?? ''}`}
      {...attributes}
      {...listeners}
    >
      {children}
      <div className="absolute top-2 right-2 bg-card/80 p-1 rounded-full shadow-sm text-muted-foreground z-50 pointer-events-none">
        <GripVertical size={16} />
      </div>
      <div className="absolute inset-0 z-40 bg-transparent" />
    </div>
  );
}

export function EditableDashboardGrid({
  items,
  cardOrder,
  gridClassName,
  onUpdateCardOrder,
}: Readonly<EditableDashboardGridProps>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = cardOrder.indexOf(String(active.id));
    const newIndex = cardOrder.indexOf(String(over.id));

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    onUpdateCardOrder(arrayMove(cardOrder, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(item => item.id)} strategy={rectSortingStrategy}>
        <div className={gridClassName}>
          {items.map(item => (
            <SortableItem key={item.id} id={item.id} className={item.className}>
              {item.content}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
