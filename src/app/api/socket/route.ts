import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import type { Server as NetServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

interface CustomServer extends NetServer {
  io?: SocketIOServer;
}

interface CustomRequest extends NextRequest {
  socket: {
    server: CustomServer;
  };
}

// In-memory state (fallback when Redis is not available)
const rooms = new Map<string, Set<string>>();
const userCursors = new Map<string, Map<string, { x: number; y: number }>>();
const userPresence = new Map<string, Map<string, { id: string; name: string; color: string }>>();

// Redis adapter for multi-instance scaling
let redisAdapterInitialized = false;

export async function GET(request: CustomRequest) {
  const { socket } = request;

  if (!socket.server.io) {
    console.log('Initializing Socket.io server...');
    const io = new SocketIOServer(socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // Initialize Redis adapter for multi-instance scaling
    if (!redisAdapterInitialized && process.env.REDIS_URL) {
      try {
        const pubClient = createClient({ url: process.env.REDIS_URL });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        redisAdapterInitialized = true;
        console.log('Socket.io Redis adapter initialized');
      } catch (error) {
        console.warn('Failed to initialize Redis adapter, using in-memory state:', error);
      }
    }

    io.on('connection', (clientSocket) => {
      console.log('Client connected:', clientSocket.id);

      clientSocket.on('post:join', (postId: string) => {
        clientSocket.join(postId);

        if (!rooms.has(postId)) {
          rooms.set(postId, new Set());
        }
        rooms.get(postId)!.add(clientSocket.id);

        // Get existing users in room
        const usersInRoom = userPresence.get(postId) || new Map();
        const cursorsInRoom = userCursors.get(postId) || new Map();

        clientSocket.emit('room:users', Array.from(usersInRoom.values()));
        clientSocket.emit('room:cursors', Array.from(cursorsInRoom.entries()));

        // Notify others
        clientSocket.to(postId).emit('presence:join', {
          id: clientSocket.id,
          name: `User ${clientSocket.id.slice(0, 4)}`,
          color: getRandomColor(),
        });
      });

      clientSocket.on('post:leave', (postId: string) => {
        clientSocket.leave(postId);
        rooms.get(postId)?.delete(clientSocket.id);
        userCursors.get(postId)?.delete(clientSocket.id);
        userPresence.get(postId)?.delete(clientSocket.id);

        clientSocket.to(postId).emit('presence:leave', clientSocket.id);
      });

      clientSocket.on('presence:update', (data: { postId: string; userId: string; cursor?: { x: number; y: number } }) => {
        const { postId, userId, cursor } = data;

        if (cursor) {
          if (!userCursors.has(postId)) {
            userCursors.set(postId, new Map());
          }
          userCursors.get(postId)!.set(userId, cursor);
          clientSocket.to(postId).emit('cursor:update', { userId, cursor });
        }
      });

      clientSocket.on('post:update', (data: { postId: string; updates: Record<string, unknown> }) => {
        clientSocket.to(data.postId).emit('post:update', data);
      });

      clientSocket.on('disconnect', () => {
        console.log('Client disconnected:', clientSocket.id);

        rooms.forEach((users, postId) => {
          if (users.has(clientSocket.id)) {
            users.delete(clientSocket.id);
            userCursors.get(postId)?.delete(clientSocket.id);
            userPresence.get(postId)?.delete(clientSocket.id);
            clientSocket.to(postId).emit('presence:leave', clientSocket.id);
          }
        });
      });
    });

    socket.server.io = io;
  }

  return NextResponse.json({ success: true });
}

function getRandomColor(): string {
  const colors = [
    '#E85D75', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
    '#85C1E9', '#F8B500', '#00CED1', '#FF69B4', '#32CD32',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';