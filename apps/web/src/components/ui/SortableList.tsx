/**
 * SortableList Component
 *
 * A reusable drag and drop sortable list using @dnd-kit
 * Supports both vertical and horizontal sorting with fluid animations
 */

import { ReactNode, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { clsx } from 'clsx';

export interface SortableItemData {
  id: string;
  [key: string]: any;
}

interface SortableItemProps {
  id: string;
  children: ReactNode;
  className?: string;
  dragHandleClassName?: string;
  showDragHandle?: boolean;
  disabled?: boolean;
}

export function SortableItem({
  id,
  children,
  className = '',
  dragHandleClassName = '',
  showDragHandle = true,
  disabled = false,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'relative',
        isDragging && 'shadow-lg ring-2 ring-primary-500/50 rounded-lg',
        className
      )}
    >
      {showDragHandle ? (
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className={clsx(
              'cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors touch-none',
              disabled && 'cursor-not-allowed opacity-50',
              dragHandleClassName
            )}
            disabled={disabled}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="flex-1">{children}</div>
        </div>
      ) : (
        <div {...attributes} {...listeners} className={clsx(!disabled && 'cursor-grab active:cursor-grabbing touch-none')}>
          {children}
        </div>
      )}
    </div>
  );
}

interface SortableListProps<T extends SortableItemData> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  direction?: 'vertical' | 'horizontal' | 'grid';
  className?: string;
  itemClassName?: string;
  showDragHandles?: boolean;
  disabled?: boolean;
  renderOverlay?: (item: T | null) => ReactNode;
}

export function SortableList<T extends SortableItemData>({
  items,
  onReorder,
  renderItem,
  direction = 'vertical',
  className = '',
  itemClassName = '',
  showDragHandles = true,
  disabled = false,
  renderOverlay,
}: SortableListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeItem = items.find((item) => item.id === activeId) || null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  const strategy =
    direction === 'horizontal'
      ? horizontalListSortingStrategy
      : direction === 'grid'
      ? rectSortingStrategy
      : verticalListSortingStrategy;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={strategy}>
        <div
          className={clsx(
            direction === 'horizontal' && 'flex flex-row gap-2',
            direction === 'grid' && 'grid gap-2',
            direction === 'vertical' && 'flex flex-col gap-1',
            className
          )}
        >
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              id={item.id}
              showDragHandle={showDragHandles}
              disabled={disabled}
              className={itemClassName}
            >
              {renderItem(item, index)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem && renderOverlay ? (
          renderOverlay(activeItem)
        ) : activeItem ? (
          <div className="opacity-80 shadow-xl rounded-lg bg-white dark:bg-gray-800 p-2">
            {renderItem(activeItem, items.indexOf(activeItem))}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Hook to persist order in localStorage
export function usePersistedOrder<T extends SortableItemData>(
  key: string,
  defaultItems: T[]
): [T[], (items: T[]) => void] {
  const [items, setItems] = useState<T[]>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const orderIds = JSON.parse(stored) as string[];
        // Reorder default items based on stored order
        const ordered: T[] = [];
        const itemMap = new Map(defaultItems.map((item) => [item.id, item]));

        // Add items in stored order
        for (const id of orderIds) {
          const item = itemMap.get(id);
          if (item) {
            ordered.push(item);
            itemMap.delete(id);
          }
        }

        // Add any new items not in stored order
        for (const item of itemMap.values()) {
          ordered.push(item);
        }

        return ordered;
      }
    } catch (e) {
      console.error('Failed to load persisted order:', e);
    }
    return defaultItems;
  });

  const setItemsAndPersist = (newItems: T[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(key, JSON.stringify(newItems.map((i) => i.id)));
    } catch (e) {
      console.error('Failed to persist order:', e);
    }
  };

  return [items, setItemsAndPersist];
}
