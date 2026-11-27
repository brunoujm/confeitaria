import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as NetServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

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
const userPresence = new Map<string, Map<string, { id: string; userId: string; name: string; color: string }>>();

// Store authenticated user data per socket connection
const socketUserData = new Map<string, { userId: string; userName: string; userEmail: string }>();

// Redis adapter for multi-instance scaling
let redisAdapterInitialized = false;

// Get user's accessible post IDs (owned posts)
async function getUserAccessiblePostIds(userId: string): Promise<Set<string>> {
  const posts = await prisma.post.findMany({
    where: { authorId: userId },
    select: { id: true },
  });
  return new Set(posts.map((p) => p.id));
}

// Check if user has access to a post
async function userHasPostAccess(userId: string, postId: string): Promise<boolean> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  return post?.authorId === userId;
}

export async function GET(request: CustomRequest) {
  const { socket } = request;

  // ============================================
  // AUTHENTICATION: Validate NextAuth token BEFORE allowing connection
  // ============================================
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NEXTAUTH_URL?.startsWith('https://'),
  });

  if (!token || !token.sub) {
    console.log('Socket connection rejected: Invalid or missing auth token');
    return new NextResponse('Unauthorized: Invalid or missing authentication token', { status: 401 });
  }

  const userId = token.sub;
  const userName = token.name || 'Unknown User';
  const userEmail = token.email || '';

  // Verify user exists in database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    console.log('Socket connection rejected: User not found in database', { userId });
    return new NextResponse('Unauthorized: User not found', { status: 401 });
  }

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

    io.on('connection', (clientSocket: Socket) => {
      // Store authenticated user data for this socket
      socketUserData.set(clientSocket.id, {
        userId,
        userName: user.name || userName,
        userEmail: user.email || userEmail,
      });

      console.log('Authenticated client connected:', {
        socketId: clientSocket.id,
        userId,
        userName: user.name || userName,
      });

      // Helper to get authenticated user data for this socket
      const getAuthUser = () => socketUserData.get(clientSocket.id);

      // ============================================
      // POST:JOIN - Validate ownership before allowing join
      // ============================================
      clientSocket.on('post:join', async (postId: string) => {
        const authUser = getAuthUser();
        if (!authUser) {
          clientSocket.emit('error', { code: 'UNAUTHENTICATED', message: 'User not authenticated' });
          return;
        }

        // Validate postId format
        if (!postId || typeof postId !== 'string') {
          clientSocket.emit('error', { code: 'INVALID_POST_ID', message: 'Invalid post ID' });
          return;
        }

        // Check if user has access to this post
        const hasAccess = await userHasPostAccess(authUser.userId, postId);
        if (!hasAccess) {
          console.log('Post join rejected: No access', { userId: authUser.userId, postId });
          clientSocket.emit('error', { code: 'FORBIDDEN', message: 'You do not have access to this post' });
          return;
        }

        // Join the room
        clientSocket.join(postId);

        if (!rooms.has(postId)) {
          rooms.set(postId, new Set());
        }
        rooms.get(postId)!.add(clientSocket.id);

        // Get existing users in room
        const usersInRoom = userPresence.get(postId) || new Map();
        const cursorsInRoom = userCursors.get(postId) || new Map();

        // Send current room state to joining user
        clientSocket.emit('room:users', Array.from(usersInRoom.values()));
        clientSocket.emit('room:cursors', Array.from(cursorsInRoom.entries()));

        // Register this user's presence
        const presenceData = {
          id: clientSocket.id,
          userId: authUser.userId,
          name: authUser.userName,
          color: getRandomColor(),
        };

        if (!userPresence.has(postId)) {
          userPresence.set(postId, new Map());
        }
        userPresence.get(postId)!.set(clientSocket.id, presenceData);

        // Notify others in room about new user
        clientSocket.to(postId).emit('presence:join', presenceData);
      });

      clientSocket.on('post:leave', (postId: string) => {
        if (!postId || typeof postId !== 'string') return;

        clientSocket.leave(postId);
        rooms.get(postId)?.delete(clientSocket.id);
        userCursors.get(postId)?.delete(clientSocket.id);
        userPresence.get(postId)?.delete(clientSocket.id);

        clientSocket.to(postId).emit('presence:leave', clientSocket.id);
      });

      // ============================================
      // PRESENCE:UPDATE - Validate userId matches authenticated user
      // ============================================
      clientSocket.on('presence:update', (data: { postId: string; userId: string; cursor?: { x: number; y: number } }) => {
        const authUser = getAuthUser();
        if (!authUser) {
          clientSocket.emit('error', { code: 'UNAUTHENTICATED', message: 'User not authenticated' });
          return;
        }

        const { postId, userId: payloadUserId, cursor } = data;

        // Validate userId in payload matches authenticated user
        if (payloadUserId !== authUser.userId) {
          console.warn('Presence update rejected: userId mismatch', {
            socketId: clientSocket.id,
            authenticatedUserId: authUser.userId,
            payloadUserId,
          });
          clientSocket.emit('error', { code: 'UNAUTHORIZED', message: 'User ID mismatch' });
          return;
        }

        // Validate postId
        if (!postId || typeof postId !== 'string') {
          clientSocket.emit('error', { code: 'INVALID_POST_ID', message: 'Invalid post ID' });
          return;
        }

        if (cursor) {
          if (!userCursors.has(postId)) {
            userCursors.set(postId, new Map());
          }
          userCursors.get(postId)!.set(authUser.userId, cursor);
          clientSocket.to(postId).emit('cursor:update', { userId: authUser.userId, cursor });
        }
      });

      // ============================================
      // POST:UPDATE - Validate userId matches authenticated user
      // ============================================
      clientSocket.on('post:update', async (data: { postId: string; userId: string; updates: Record<string, unknown> }) => {
        const authUser = getAuthUser();
        if (!authUser) {
          clientSocket.emit('error', { code: 'UNAUTHENTICATED', message: 'User not authenticated' });
          return;
        }

        const { postId, userId: payloadUserId, updates } = data;

        // Validate userId in payload matches authenticated user
        if (payloadUserId !== authUser.userId) {
          console.warn('Post update rejected: userId mismatch', {
            socketId: clientSocket.id,
            authenticatedUserId: authUser.userId,
            payloadUserId,
          });
          clientSocket.emit('error', { code: 'UNAUTHORIZED', message: 'User ID mismatch' });
          return;
        }

        // Validate postId
        if (!postId || typeof postId !== 'string') {
          clientSocket.emit('error', { code: 'INVALID_POST_ID', message: 'Invalid post ID' });
          return;
        }

        const hasAccess = await userHasPostAccess(authUser.userId, postId);
        if (!hasAccess) {
          console.log('Post update rejected: No access', { userId: authUser.userId, postId });
          clientSocket.emit('error', { code: 'FORBIDDEN', message: 'You do not have access to this post' });
          return;
        }

        // Broadcast update to other users in the room
        clientSocket.to(postId).emit('post:update', {
          postId,
          userId: authUser.userId,
          updates,
        });
      });

      clientSocket.on('disconnect', () => {
        const authUser = getAuthUser();
        console.log('Client disconnected:', {
          socketId: clientSocket.id,
          userId: authUser?.userId,
          userName: authUser?.userName,
        });

        // Clean up user data
        socketUserData.delete(clientSocket.id);

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

  return NextResponse.json({ success: true, authenticated: true, userId, userName: user.name });
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