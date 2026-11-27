'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket, getSocket, calculateReconnectionDelay, DEFAULT_RECONNECTION_CONFIG } from '@/lib/socket';

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

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

interface UseRealtimeOptions {
  postId: string;
  userId: string;
  userName: string;
  onPostUpdate?: (updates: Record<string, unknown>) => void;
  onUserJoin?: (user: UserPresence) => void;
  onUserLeave?: (userId: string) => void;
  onCursorUpdate?: (cursor: CursorPosition) => void;
}

interface ReconnectionState {
  attempt: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
  isReconnecting: boolean;
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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const userColorRef = useRef<string>('#E85D75');
  const handlersRef = useRef<Record<string, (...args: unknown[]) => void>>({});
  const reconnectionRef = useRef<ReconnectionState>({
    attempt: 0,
    timeoutId: null,
    isReconnecting: false,
  });
  const isMountedRef = useRef(true);
  const postIdRef = useRef(postId);
  const userIdRef = useRef(userId);

  // Keep refs updated without triggering re-renders
  useEffect(() => {
    postIdRef.current = postId;
    userIdRef.current = userId;
  }, [postId, userId]);

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

  const clearReconnectionTimeout = useCallback(() => {
    if (reconnectionRef.current.timeoutId) {
      clearTimeout(reconnectionRef.current.timeoutId);
      reconnectionRef.current.timeoutId = null;
    }
  }, []);

  const scheduleReconnection = useCallback((socket: Socket) => {
    const { attempt, isReconnecting } = reconnectionRef.current;

    if (!isMountedRef.current) return;
    if (attempt >= DEFAULT_RECONNECTION_CONFIG.maxRetries) {
      setConnectionStatus('failed');
      reconnectionRef.current.isReconnecting = false;
      return;
    }
    if (isReconnecting) return;

    reconnectionRef.current.isReconnecting = true;
    setConnectionStatus('reconnecting');

    const delay = calculateReconnectionDelay(attempt, DEFAULT_RECONNECTION_CONFIG);

    reconnectionRef.current.timeoutId = setTimeout(() => {
      if (!isMountedRef.current) return;

      reconnectionRef.current.attempt += 1;
      reconnectionRef.current.isReconnecting = false;

      if (!socket.connected && isMountedRef.current) {
        socket.connect();
      }
    }, delay);
  }, []);

  const resetReconnection = useCallback(() => {
    reconnectionRef.current.attempt = 0;
    reconnectionRef.current.isReconnecting = false;
    clearReconnectionTimeout();
  }, [clearReconnectionTimeout]);

  useEffect(() => {
    if (!postId) return;

    isMountedRef.current = true;
    resetReconnection();

    const socket = connectSocket();
    socketRef.current = socket;

    // Define all handlers with stable references
    const handlers = {
      connect: () => {
        if (!isMountedRef.current) return;
        resetReconnection();
        setConnectionStatus('connected');
        socket.emit('post:join', postIdRef.current);
      },
      connect_error: (error: Error) => {
        if (!isMountedRef.current) return;
        console.error('[Socket] Connection error:', error.message);
        setConnectionStatus('reconnecting');
        scheduleReconnection(socket);
      },
      disconnect: (reason: string) => {
        if (!isMountedRef.current) return;
        setConnectionStatus('disconnected');

        // Only attempt reconnection for non-intentional disconnects
        if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
          scheduleReconnection(socket);
        }
      },
      reconnect: (attemptNumber: number) => {
        if (!isMountedRef.current) return;
        resetReconnection();
        setConnectionStatus('connected');
        socket.emit('post:join', postIdRef.current);
      },
      reconnect_attempt: (attemptNumber: number) => {
        if (!isMountedRef.current) return;
        setConnectionStatus('reconnecting');
      },
      reconnect_failed: () => {
        if (!isMountedRef.current) return;
        setConnectionStatus('failed');
        reconnectionRef.current.isReconnecting = false;
      },
      'room:users': (roomUsers: UserPresence[]) => {
        if (!isMountedRef.current) return;
        setUsers(roomUsers.filter(u => u.id !== socket.id));
      },
      'room:cursors': (roomCursors: [string, CursorPosition][]) => {
        if (!isMountedRef.current) return;
        const cursorMap = new Map(roomCursors);
        if (socket.id) {
          cursorMap.delete(socket.id);
        }
        setCursors(cursorMap);
      },
      'presence:join': (user: UserPresence) => {
        if (!isMountedRef.current) return;
        setUsers(prev => {
          if (prev.some(u => u.id === user.id)) return prev;
          return [...prev, user];
        });
        onUserJoin?.(user);
      },
      'presence:leave': (leftUserId: string) => {
        if (!isMountedRef.current) return;
        setUsers(prev => prev.filter(u => u.id !== leftUserId));
        setCursors(prev => {
          const next = new Map(prev);
          next.delete(leftUserId);
          return next;
        });
        onUserLeave?.(leftUserId);
      },
      'cursor:update': (data: { userId: string; cursor: { x: number; y: number } }) => {
        if (!isMountedRef.current) return;
        if (data.userId === socket.id) return;
        setCursors(prev => {
          const next = new Map(prev);
          next.set(data.userId, { userId: data.userId, ...data.cursor });
          return next;
        });
        onCursorUpdate?.({ userId: data.userId, ...data.cursor });
      },
      'post:update': (data: { postId: string; updates: Record<string, unknown> }) => {
        if (!isMountedRef.current) return;
        if (data.postId === postIdRef.current) {
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

    // Initial connection
    setConnectionStatus('connecting');
    socket.emit('post:join', postId);

    // Cleanup function - properly remove all listeners and timers
    return () => {
      isMountedRef.current = false;
      clearReconnectionTimeout();

      socket.emit('post:leave', postId);
      Object.entries(handlersRef.current).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
      handlersRef.current = {};
    };
  }, [postId, onPostUpdate, onUserJoin, onUserLeave, onCursorUpdate, scheduleReconnection, resetReconnection, clearReconnectionTimeout]);

  const sendCursorPosition = useCallback((x: number, y: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('presence:update', {
        postId: postIdRef.current,
        userId: userIdRef.current,
        cursor: { x, y },
      });
    }
  }, []);

  const sendPostUpdate = useCallback((updates: Record<string, unknown>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('post:update', { postId: postIdRef.current, updates });
    }
  }, []);

  const getUserColor = useCallback((targetUserId: string) => {
    const user = users.find(u => u.id === targetUserId);
    return user?.color || userColorRef.current;
  }, [users]);

  const forceReconnect = useCallback(() => {
    const socket = socketRef.current;
    if (socket && isMountedRef.current) {
      resetReconnection();
      if (!socket.connected) {
        setConnectionStatus('connecting');
        socket.connect();
      }
    }
  }, [resetReconnection]);

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    users,
    cursors,
    sendCursorPosition,
    sendPostUpdate,
    getUserColor,
    myColor: userColorRef.current,
    forceReconnect,
  };
}