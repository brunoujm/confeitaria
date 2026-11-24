'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { connectSocket, getSocket } from '@/lib/socket';

export interface UserPresence {
  id: string;
  name: string;
  color: string;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
}

interface UseRealtimeOptions {
  postId: string;
  userId: string;
  userName: string;
  onPostUpdate?: (updates: Record<string, unknown>) => void;
  onUserJoin?: (user: UserPresence) => void;
  onUserLeave?: (userId: string) => void;
  onCursorUpdate?: (cursor: CursorPosition) => void;
}

export function useRealtime({
  postId,
  userId,
  userName,
  onPostUpdate,
  onUserJoin,
  onUserLeave,
  onCursorUpdate,
}: UseRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const userColorRef = useRef<string>('#E85D75');
  const handlersRef = useRef<Record<string, (...args: unknown[]) => void>>({});

  // Generate consistent color for user
  useEffect(() => {
    const colors = [
      '#E85D75', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
      '#85C1E9', '#F8B500', '#00CED1', '#FF69B4', '#32CD32',
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    userColorRef.current = colors[Math.abs(hash) % colors.length];
  }, [userId]);

  useEffect(() => {
    if (!postId) return;

    const socket = connectSocket();
    socketRef.current = socket;

    // Define all handlers with stable references (type inferred, cast for storage)
    const handlers = {
      connect: () => {
        setIsConnected(true);
        socket.emit('post:join', postId);
      },
      disconnect: () => {
        setIsConnected(false);
      },
      'room:users': (roomUsers: UserPresence[]) => {
        setUsers(roomUsers.filter(u => u.id !== socket.id));
      },
      'room:cursors': (roomCursors: [string, CursorPosition][]) => {
        const cursorMap = new Map(roomCursors);
        if (socket.id) {
          cursorMap.delete(socket.id);
        }
        setCursors(cursorMap);
      },
      'presence:join': (user: UserPresence) => {
        setUsers(prev => {
          if (prev.some(u => u.id === user.id)) return prev;
          return [...prev, user];
        });
        onUserJoin?.(user);
      },
      'presence:leave': (userId: string) => {
        setUsers(prev => prev.filter(u => u.id !== userId));
        setCursors(prev => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
        onUserLeave?.(userId);
      },
      'cursor:update': (data: { userId: string; cursor: { x: number; y: number } }) => {
        if (data.userId === socket.id) return;
        setCursors(prev => {
          const next = new Map(prev);
          next.set(data.userId, { userId: data.userId, ...data.cursor });
          return next;
        });
        onCursorUpdate?.({ userId: data.userId, ...data.cursor });
      },
      'post:update': (data: { postId: string; updates: Record<string, unknown> }) => {
        if (data.postId === postId) {
          onPostUpdate?.(data.updates);
        }
      },
    };

    // Store handlers for cleanup
    handlersRef.current = handlers as Record<string, (...args: unknown[]) => void>;

    // Register all event listeners
    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    socket.emit('post:join', postId);

    // Cleanup function - properly remove all listeners
    return () => {
      socket.emit('post:leave', postId);
      Object.entries(handlersRef.current).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
      handlersRef.current = {};
    };
  }, [postId, userId, onPostUpdate, onUserJoin, onUserLeave, onCursorUpdate]);

  const sendCursorPosition = useCallback((x: number, y: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('presence:update', {
        postId,
        userId,
        cursor: { x, y },
      });
    }
  }, [postId, userId]);

  const sendPostUpdate = useCallback((updates: Record<string, unknown>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('post:update', { postId, updates });
    }
  }, [postId]);

  const getUserColor = useCallback((targetUserId: string) => {
    const user = users.find(u => u.id === targetUserId);
    return user?.color || userColorRef.current;
  }, [users]);

  return {
    isConnected,
    users,
    cursors,
    sendCursorPosition,
    sendPostUpdate,
    getUserColor,
    myColor: userColorRef.current,
  };
}