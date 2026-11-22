'use client';

import { useEffect, useState } from 'react';
import { CursorPosition } from '@/hooks/useRealtime';

interface CursorOverlayProps {
  cursors: Map<string, CursorPosition>;
  getUserColor: (userId: string) => string;
  containerRef: React.RefObject<HTMLDivElement>;
  currentUserId: string;
}

export function CursorOverlay({
  cursors,
  getUserColor,
  containerRef,
  currentUserId,
}: CursorOverlayProps) {
  const [cursorElements, setCursorElements] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    const newCursors = new Map<string, { x: number; y: number }>();
    cursors.forEach((cursor, userId) => {
      if (userId !== currentUserId) {
        newCursors.set(userId, { x: cursor.x, y: cursor.y });
      }
    });
    setCursorElements(newCursors);
  }, [cursors, currentUserId]);

  if (cursorElements.size === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    >
      {Array.from(cursorElements.entries()).map(([userId, position]) => {
        const color = getUserColor(userId);
        const containerRect = containerRef.current?.getBoundingClientRect();

        if (!containerRect) return null;

        const relativeX = position.x - containerRect.left;
        const relativeY = position.y - containerRect.top;

        // Only show cursor if it's within the container
        if (
          relativeX < 0 ||
          relativeY < 0 ||
          relativeX > containerRect.width ||
          relativeY > containerRect.height
        ) {
          return null;
        }

        return (
          <div
            key={userId}
            className="pointer-events-none transition-all duration-100"
            style={{
              position: 'absolute',
              left: relativeX,
              top: relativeY,
              transform: 'translate(-50%, -50%)',
              zIndex: 50,
            }}
          >
            <div
              className="w-4 h-4"
              style={{
                backgroundColor: color,
                border: '2px solid white',
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            />
            <div
              className="absolute -top-6 left-1/2 -translate-x-1/2 white px-1.5 py-0.5 text-xs font-medium rounded shadow"
              style={{
                backgroundColor: color,
                color: 'white',
                whiteSpace: 'nowrap',
                transform: 'rotate(45deg) translateX(-50%)',
                transformOrigin: 'bottom center',
              }}
            >
              User
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface RemoteCursorProps {
  userId: string;
  position: { x: number; y: number };
  color: string;
  name: string;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function RemoteCursor({
  userId,
  position,
  color,
  name,
  containerRef,
}: RemoteCursorProps) {
  const containerRect = containerRef.current?.getBoundingClientRect();

  if (!containerRect) return null;

  const relativeX = position.x - containerRect.left;
  const relativeY = position.y - containerRect.top;

  if (
    relativeX < 0 ||
    relativeY < 0 ||
    relativeX > containerRect.width ||
    relativeY > containerRect.height
  ) {
    return null;
  }

  return (
    <div
      className="pointer-events-none transition-all duration-100"
      style={{
        position: 'absolute',
        left: relativeX,
        top: relativeY,
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
      }}
    >
      <div
        className="w-4 h-4"
        style={{
          backgroundColor: color,
          border: '2px solid white',
          borderRadius: '50% 50% 50% 0',
          transform: 'rotate(-45deg)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      />
      <div
        className="absolute -top-6 left-1/2 -translate-x-1/2 white px-1.5 py-0.5 text-xs font-medium rounded shadow"
        style={{
          backgroundColor: color,
          color: 'white',
          whiteSpace: 'nowrap',
          transform: 'rotate(45deg) translateX(-50%)',
          transformOrigin: 'bottom center',
        }}
      >
        {name}
      </div>
    </div>
  );
}