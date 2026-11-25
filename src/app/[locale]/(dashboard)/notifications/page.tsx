'use client';

import React, { useState, useEffect, useCallback } from 'react';

export const viewport = {
  themeColor: "#E85D75",
  width: "device-width",
  initialScale: 1,
};
import {
  Bell,
  BellOff,
  Check,
  MessageSquare,
  AlertTriangle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  POST_APPROVED: { label: 'Post Aprovado', icon: <Check className="h-3 w-3" />, color: 'bg-success/10 text-success' },
  POST_PUBLISHED: { label: 'Post Publicado', icon: <MessageSquare className="h-3 w-3" />, color: 'bg-primary/10 text-primary' },
  POST_COMMENT: { label: 'Comentário', icon: <MessageSquare className="h-3 w-3" />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  MENTION: { label: 'Menção', icon: <AlertTriangle className="h-3 w-3" />, color: 'bg-warning/10 text-warning' },
  SYSTEM: { label: 'Sistema', icon: <Bell className="h-3 w-3" />, color: 'bg-muted text-muted-foreground' },
};

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'POST_APPROVED', label: 'Post Aprovado' },
  { value: 'POST_PUBLISHED', label: 'Post Publicado' },
  { value: 'POST_COMMENT', label: 'Comentário' },
  { value: 'MENTION', label: 'Menção' },
  { value: 'SYSTEM', label: 'Sistema' },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (showOnlyUnread) params.set('unread', 'true');

      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, showOnlyUnread]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const filteredNotifications = notifications;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Notificações
          </h1>
          <p className="text-muted-foreground">Gerencie suas notificações e alertas</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Marcar todas como lidas ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card variant="default">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="unread-only"
                checked={showOnlyUnread}
                onChange={(e) => setShowOnlyUnread(e.target.checked)}
                className="rounded border-[hsl(var(--input))]"
              />
              <Label htmlFor="unread-only" className="cursor-pointer mb-0">
                Apenas não lidas
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {isLoading ? (
        <Card variant="default">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Carregando notificações...</p>
          </CardContent>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card variant="default">
          <CardContent className="py-12 text-center">
            <BellOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {typeFilter !== 'all' || showOnlyUnread
                ? 'Nenhuma notificação encontrada com estes filtros'
                : 'Nenhuma notificação ainda'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map(notification => {
            const typeInfo = TYPE_LABELS[notification.type] || TYPE_LABELS.SYSTEM;

            return (
              <Card
                key={notification.id}
                variant="default"
                className={cn(
                  'transition-colors',
                  !notification.read && 'bg-primary/5 border-primary/20'
                )}
              >
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                      typeInfo.color
                    )}>
                      {typeInfo.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-medium">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="gap-1">
                              {typeInfo.icon}
                              {typeInfo.label}
                            </Badge>
                            <span>{formatDate(notification.createdAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-primary hover:text-primary/80"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(notification.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {notification.data && (
                        <details className="mt-3">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            Ver detalhes
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto text-muted-foreground">
                            {notification.data}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}