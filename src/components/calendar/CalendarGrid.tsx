'use client';

import { useCallback, useState, memo } from 'react';
import type {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent} from '@dnd-kit/core';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreHorizontal, Clock, User, ChevronDown, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type Post } from '@/lib/validations/post';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';

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
  maxVisiblePosts?: number;
}

interface SortablePostProps {
  post: Post;
  index: number;
  onClick?: (post: Post) => void;
  isCompact?: boolean;
}

// Constantes para cores por tipo e status
const TYPE_COLORS: Record<string, string> = {
  FEED: 'bg-primary/15 text-primary border-primary/30',
  STORIES: 'bg-purple/15 text-purple border-purple/30',
  REELS: 'bg-orange/15 text-orange border-orange/30',
  WHATSAPP_STATUS: 'bg-green/15 text-green border-green/30',
  WHATSAPP_CATALOG: 'bg-teal/15 text-teal border-teal/30',
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  FEED: 'bg-primary/20 text-primary',
  STORIES: 'bg-purple/20 text-purple',
  REELS: 'bg-orange/20 text-orange',
  WHATSAPP_STATUS: 'bg-green/20 text-green',
  WHATSAPP_CATALOG: 'bg-teal/20 text-teal',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground border-dashed',
  APPROVED: 'bg-green/15 text-green border-green/30',
  PUBLISHED: 'bg-blue/15 text-blue border-blue/30',
  ARCHIVED: 'bg-muted/50 text-muted-foreground border-muted',
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground border border-dashed',
  APPROVED: 'bg-green/20 text-green',
  PUBLISHED: 'bg-blue/20 text-blue',
  ARCHIVED: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  APPROVED: 'Aprovado',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado',
};

const TYPE_LABELS: Record<string, string> = {
  FEED: 'Feed',
  STORIES: 'Stories',
  REELS: 'Reels',
  WHATSAPP_STATUS: 'WhatsApp Status',
  WHATSAPP_CATALOG: 'WhatsApp Catálogo',
};

const SortablePost = memo(function SortablePost({ post, index, onClick, isCompact = false }: SortablePostProps) {
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

  const typeColor = TYPE_BADGE_COLORS[post.type] || TYPE_BADGE_COLORS.FEED;
  const statusColor = STATUS_BADGE_COLORS[post.status] || STATUS_BADGE_COLORS.DRAFT;
  const cardColor = TYPE_COLORS[post.type] || TYPE_COLORS.FEED;
  const statusBgColor = STATUS_COLORS[post.status] || STATUS_COLORS.DRAFT;

  const typeLabel = TYPE_LABELS[post.type] || post.type;
  const statusLabel = STATUS_LABELS[post.status] || post.status;

  const scheduledTime = post.scheduledAt
    ? format(new Date(post.scheduledAt), 'HH:mm', { locale: ptBR })
    : null;

  const authorName = post.author?.name || '—';

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.(post);
    }
  };

  return (
    <TooltipProvider>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group relative rounded-lg cursor-pointer transition-all w-full border',
          'hover:shadow-md hover:z-10',
          cardColor,
          isDragging && 'ring-2 ring-primary ring-offset-2',
          isCompact ? 'p-1.5' : 'p-2'
        )}
        onClick={() => onClick?.(post)}
        onKeyDown={handleKeyDown}
        aria-label={`Post: ${post.title}, ${typeLabel}, ${statusLabel}${scheduledTime ? `, agendado para ${scheduledTime}` : ''}`}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-start gap-1.5 min-w-0">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="flex items-center justify-center w-5 h-5 rounded hover:bg-black/5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            aria-label="Arrastar para reordenar"
          >
            <GripVertical className="h-2.5 w-2.5" />
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex items-center gap-1 text-[10px] font-medium flex-wrap mb-1">
              <span className={cn('px-1.5 py-0.5 rounded whitespace-nowrap shrink-0', typeColor)}>
                {typeLabel}
              </span>
              <span className={cn('px-1.5 py-0.5 rounded whitespace-nowrap shrink-0', statusColor)}>
                {statusLabel}
              </span>
            </div>

            {/* Title with tooltip on truncation */}
            <Tooltip>
              <TooltipTrigger asChild>
                <h4 className="font-medium truncate text-sm">{post.title}</h4>
              </TooltipTrigger>
              <TooltipContent side="top" align="start" className="max-w-xs">
                <p className="font-medium">{post.title}</p>
                {post.caption && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.caption}</p>}
              </TooltipContent>
            </Tooltip>

            {/* Meta info: time and author */}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
              {scheduledTime && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 whitespace-nowrap">
                      <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                      <span>{scheduledTime}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Agendado para {scheduledTime}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {post.author && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 whitespace-nowrap truncate max-w-[120px]">
                      <User className="h-2.5 w-2.5 flex-shrink-0" />
                      <span>{authorName}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Autor: {authorName}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* More actions button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-1 rounded flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Open context menu
                }}
                aria-label="Mais opções"
              >
                <MoreHorizontal className="h-3 w-3" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              <p className="text-xs">Mais opções</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
});

function DayCell({ date, isCurrentMonth, isToday, posts, onPostClick, maxVisiblePosts = 3 }: DayCellProps) {
  const dayNumber = date.getDate();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const [showAllPosts, setShowAllPosts] = useState(false);

  const visiblePosts = showAllPosts ? posts : posts.slice(0, maxVisiblePosts);
  const hiddenCount = posts.length - maxVisiblePosts;

  return (
    <div
      className={cn(
        'relative min-h-[112px] p-2 border border-border bg-background flex flex-col',
        !isCurrentMonth && 'text-muted-foreground/50 bg-muted/30',
        isToday && 'ring-2 ring-primary relative',
        isWeekend && 'bg-muted/20'
      )}
    >
      {/* Day number with today indicator */}
      <div className={cn('flex items-center justify-between mb-1', isToday && 'text-primary font-semibold')}>
        <span className={cn('text-sm font-medium', isToday && 'text-primary')}>
          {dayNumber}
        </span>
        {isToday && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            Hoje
          </span>
        )}
      </div>

      {posts.length > 0 && (
        <SortableContext
          items={posts.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-1 space-y-1 flex-1 min-h-0 overflow-hidden">
            {visiblePosts.map((post, index) => (
              <SortablePost
                key={post.id}
                post={post}
                index={index}
                onClick={onPostClick}
                isCompact={posts.length > maxVisiblePosts}
              />
            ))}
          </div>
        </SortableContext>
      )}

      {/* "+N mais" indicator */}
      {hiddenCount > 0 && !showAllPosts && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAllPosts(true);
          }}
          className="mt-1 w-full text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-accent transition-colors flex items-center justify-center gap-1"
        >
          <ChevronDown className="h-3 w-3" />
          <span>+{hiddenCount} mais</span>
        </button>
      )}

      {/* Show less button when expanded */}
      {showAllPosts && hiddenCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAllPosts(false);
          }}
          className="mt-1 w-full text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-accent transition-colors flex items-center justify-center gap-1"
        >
          <X className="h-3 w-3" />
          <span>Mostrar menos</span>
        </button>
      )}

      {/* Empty state for non-current month days */}
      {!isCurrentMonth && posts.length === 0 && (
        <div className="mt-4 text-center text-xs text-muted-foreground/50 flex-1">
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
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-7 gap-1 bg-border rounded-lg overflow-hidden">
          {/* Day headers */}
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div
              key={day}
              className="bg-muted p-3 text-center text-sm font-semibold text-muted-foreground border-b border-border"
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
              maxVisiblePosts={3}
            />
          ))}
        </div>
      </DndContext>
    </TooltipProvider>
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
    <TooltipProvider>
      <div className="grid grid-cols-7 gap-1 bg-border rounded-lg overflow-hidden">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayPosts = postsByDate.get(dateKey) || [];
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <div
              key={day.toISOString()}
              className={`relative min-h-[200px] p-2 border border-border bg-background flex flex-col ${isToday ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn('font-medium', isToday && 'text-primary')}>
                  {format(day, 'EEE dd', { locale: ptBR })}
                </span>
                <span className="text-xs text-muted-foreground">{dayPosts.length} posts</span>
              </div>
              <div className="space-y-1 flex-1 min-h-0 overflow-hidden">
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
    </TooltipProvider>
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
    <TooltipProvider>
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
    </TooltipProvider>
  );
}