'use client';

import { cn } from '@/lib/utils';
import { UserPresence } from '@/hooks/useRealtime';

interface PresenceAvatarsProps {
  users: UserPresence[];
  currentUserId: string;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

const RING_CLASSES = {
  sm: 'ring-2 ring-background',
  md: 'ring-2 ring-background',
  lg: 'ring-2 ring-background',
};

export function PresenceAvatars({
  users,
  currentUserId,
  maxVisible = 5,
  size = 'md',
  className,
}: PresenceAvatarsProps) {
  const otherUsers = users.filter(u => u.id !== currentUserId);
  const visibleUsers = otherUsers.slice(0, maxVisible);
  const remainingCount = otherUsers.length - maxVisible;

  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {visibleUsers.map((user, _index) => (
        <div
          key={user.id}
          className={cn(
            'relative flex items-center justify-center font-medium text-white transition-transform hover:z-10 hover:scale-110',
            SIZE_CLASSES[size],
            RING_CLASSES[size],
            'rounded-full bg-gradient-to-br'
          )}
          style={{ background: `linear-gradient(135deg, ${user.color}, ${adjustColor(user.color, -20)})` }}
          title={user.name}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'flex items-center justify-center font-medium text-muted-foreground transition-transform hover:z-10 hover:scale-110',
            SIZE_CLASSES[size],
            RING_CLASSES[size],
            'rounded-full bg-muted'
          )}
          title={`${remainingCount} mais`}
        >
          +{remainingCount}
        </div>
      )}
      {users.length === 0 && (
        <div
          className={cn(
            'flex items-center justify-center text-muted-foreground',
            SIZE_CLASSES[size]
          )}
        >
          <span className="text-xs">Apenas você</span>
        </div>
      )}
    </div>
  );
}

function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}