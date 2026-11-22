'use client';

import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreHorizontal, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type Post } from '@/lib/validations/post';
import { cn } from '@/lib/utils';

interface CalendarGridProps {
  posts: Post[];
  currentMonth: Date;
  onPostDrop?: (postId: string, newDate: Date) => void;
  onPostClick?: (post: Post) => void;
}

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  posts: Post[];
  onPostClick?: (post: Post) => void;
}

interface SortablePostProps {
  post: Post;
  index: number;
  onClick?: (post: Post) => void;
}

function SortablePost({ post, index, onClick }: SortablePostProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeColors: Record<string, string> = {
    FEED: 'bg-primary/20 text-primary',
    STORIES: 'bg-purple/20 text-purple',
    REELS: 'bg-orange/20 text-orange',
    WHATSAPP_STATUS: 'bg-green/20 text-green',
    WHATSAPP_CATALOG: 'bg-teal/20 text-teal',
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-muted text-muted-foreground border-dashed',
    APPROVED: 'bg-green/20 text-green',
    PUBLISHED: 'bg-blue/20 text-blue',
    ARCHIVED: 'bg-muted text-muted-foreground',
  };

  const typeLabel = post.type;
  const statusLabel = post.status;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative p-2 rounded-lg cursor-pointer transition-all',
        'hover:shadow-md hover:z-10',
        statusColors[post.status] || 'bg-muted'
      )}
      onClick={() => onClick?.(post)}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-black/10 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Arrastar"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', typeColors[post.type])}>
              {typeLabel}
            </span>
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', statusColors[post.status])}>
              {statusLabel}
            </span>
          </div>
          <h4 className="font-medium text-sm truncate mt-1">{post.title}</h4>
          {post.scheduledAt && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              <span>{format(new Date(post.scheduledAt), 'HH:mm', { locale: ptBR })}</span>
            </div>
          )}
          {post.author && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <User className="h-3 w-3" />
              <span className="truncate">{post.author.name}</span>
            </div>
          )}
        </div>
        <button
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-1 rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function DayCell({ date, isCurrentMonth, isToday, posts, onPostClick }: DayCellProps) {
  const dayNumber = date.getDate();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div
      className={cn(
        'relative min-h-[120px] p-2 border border-border bg-background',
        !isCurrentMonth && 'text-muted-foreground/50 bg-muted/30',
        isToday && 'ring-2 ring-primary relative',
        isWeekend && 'bg-muted/20'
      )}
    >
      <div className={cn('text-sm font-medium', isToday && 'text-primary')}>
        {dayNumber}
      </div>

      {posts.length > 0 && (
        <SortableContext
          items={posts.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-1 space-y-1 max-h-[80px] overflow-y-auto">
            {posts.map((post, index) => (
              <SortablePost
                key={post.id}
                post={post}
                index={index}
                onClick={onPostClick}
              />
            ))}
          </div>
        </SortableContext>
      )}

      {!isCurrentMonth && posts.length === 0 && (
        <div className="mt-4 text-center text-xs text-muted-foreground/50">
          —
        </div>
      )}
    </div>
  );
}

export function CalendarGrid({
  posts,
  currentMonth,
  onPostDrop,
  onPostClick,
}: CalendarGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const post = posts.find((p) => p.id === event.active.id);
    if (post) {
      // Track dragged post for potential future use
    }
  }, [posts]);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Visual feedback during drag
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Find the target date based on the drop zone
      // This would need to be implemented based on the drop target
      // For now, we just handle reordering within the same day
    },
    []
  );

  // Group posts by date
  const postsByDate = new Map<string, Post[]>();
  posts.forEach((post) => {
    if (post.scheduledAt) {
      const dateKey = format(new Date(post.scheduledAt), 'yyyy-MM-dd');
      if (!postsByDate.has(dateKey)) {
        postsByDate.set(dateKey, []);
      }
      postsByDate.get(dateKey)!.push(post);
    }
  });

  // Sort posts within each day by scheduled time
  postsByDate.forEach((dayPosts) => {
    dayPosts.sort((a, b) => {
      if (!a.scheduledAt || !b.scheduledAt) return 0;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });
  });

  // Generate calendar days
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: { date: Date; isCurrentMonth: boolean; isToday: boolean; posts: Post[] }[] = [];

  // Previous month days
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    const dateKey = format(d, 'yyyy-MM-dd');
    days.push({
      date: d,
      isCurrentMonth: false,
      isToday: false,
      posts: postsByDate.get(dateKey) || [],
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateKey = format(d, 'yyyy-MM-dd');
    days.push({
      date: d,
      isCurrentMonth: true,
      isToday: d.getTime() === today.getTime(),
      posts: postsByDate.get(dateKey) || [],
    });
  }

  // Next month days to fill grid (42 cells = 6 weeks)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    const dateKey = format(d, 'yyyy-MM-dd');
    days.push({
      date: d,
      isCurrentMonth: false,
      isToday: false,
      posts: postsByDate.get(dateKey) || [],
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {/* Day headers */}
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div
            key={day}
            className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}

        {/* Days */}
        {days.map((day) => (
          <DayCell
            key={day.date.toISOString()}
            date={day.date}
            isCurrentMonth={day.isCurrentMonth}
            isToday={day.isToday}
            posts={day.posts}
            onPostClick={onPostClick}
          />
        ))}
      </div>
    </DndContext>
  );
}

export function CalendarWeekView({
  posts,
  currentDate,
  onPostClick,
}: {
  posts: Post[];
  currentDate: Date;
  onPostClick?: (post: Post) => void;
}) {
  // Week view implementation
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const postsByDate = new Map<string, Post[]>();
  posts.forEach((post) => {
    if (post.scheduledAt) {
      const dateKey = format(new Date(post.scheduledAt), 'yyyy-MM-dd');
      if (!postsByDate.has(dateKey)) {
        postsByDate.set(dateKey, []);
      }
      postsByDate.get(dateKey)!.push(post);
    }
  });

  postsByDate.forEach((dayPosts) => {
    dayPosts.sort((a, b) => {
      if (!a.scheduledAt || !b.scheduledAt) return 0;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });
  });

  return (
    <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
      {days.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayPosts = postsByDate.get(dateKey) || [];
        const isToday = day.toDateString() === new Date().toDateString();

        return (
          <div
            key={day.toISOString()}
            className={`relative min-h-[200px] p-2 border border-border bg-background ${isToday ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn('font-medium', isToday && 'text-primary')}>
                {format(day, 'EEE dd', { locale: ptBR })}
              </span>
              <span className="text-xs text-muted-foreground">{dayPosts.length} posts</span>
            </div>
            <div className="space-y-1 max-h-[160px] overflow-y-auto">
              {dayPosts.map((post, index) => (
                <SortablePost
                  key={post.id}
                  post={post}
                  index={index}
                  onClick={onPostClick}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CalendarListView({
  posts,
  onPostClick,
}: {
  posts: Post[];
  onPostClick?: (post: Post) => void;
}) {
  const sortedPosts = [...posts].sort((a, b) => {
    if (!a.scheduledAt || !b.scheduledAt) return 0;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });

  return (
    <div className="space-y-2">
      {sortedPosts.map((post, index) => (
        <SortablePost
          key={post.id}
          post={post}
          index={index}
          onClick={onPostClick}
        />
      ))}
    </div>
  );
}