'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Save,
  Calendar,
  Tag,
  Image as ImageIcon,
  Video as VideoIcon,
  LayoutGrid,
  Sparkles,
  CheckCircle,
  ArrowLeft,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Separator } from '@/components/ui/Separator';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import { MediaUploader } from './MediaUploader';
import { AIPanel } from './AIPanel';
import { TemplateSelector } from './TemplateSelector';
import { BrandQuickApply } from './BrandQuickApply';
import { VideoValidator } from './VideoValidator';
import { PresenceAvatars, CursorOverlay, ConflictToast } from '@/components/realtime';
import { useRealtime } from '@/hooks/useRealtime';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type Post, type PostType, type PostStatus } from '@/lib/validations/post';

interface PostEditorProps {
  initialData?: Post;
  isEditing?: boolean;
}

const POST_TYPE_LABELS: Record<PostType, string> = {
  FEED: 'Feed',
  STORIES: 'Stories',
  REELS: 'Reels',
  WHATSAPP_STATUS: 'WhatsApp Status',
  WHATSAPP_CATALOG: 'WhatsApp Catálogo',
};

const POST_TYPE_ICONS: Record<PostType, React.ComponentType<{ className?: string }>> = {
  FEED: LayoutGrid,
  STORIES: ImageIcon,
  REELS: VideoIcon,
  WHATSAPP_STATUS: ImageIcon,
  WHATSAPP_CATALOG: LayoutGrid,
};

const STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: 'Rascunho',
  APPROVED: 'Aprovado',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado',
};

const STATUS_COLORS: Record<PostStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground border-dashed',
  APPROVED: 'bg-green-100 text-green-700 border-green-200',
  PUBLISHED: 'bg-blue-100 text-blue-700 border-blue-200',
  ARCHIVED: 'bg-muted text-muted-foreground',
};

export function PostEditor({ initialData, isEditing = false }: PostEditorProps) {
  const router = useRouter();
  const params = useParams();
  const postId = params?.id as string;
  const editorRef = useRef<HTMLDivElement>(null);

  // Current user (in real app, get from session)
  const currentUserId = useRef(`user-${Math.random().toString(36).substr(2, 9)}`).current;
  const currentUserName = 'Você';

  // Form state
  const [title, setTitle] = useState(initialData?.title || '');
  const [caption, setCaption] = useState(initialData?.caption || '');
  const [hashtags, setHashtags] = useState<string[]>(initialData?.hashtags || []);
  const [type, setType] = useState<PostType>(initialData?.type || 'FEED');
  const [status, setStatus] = useState<PostStatus>(initialData?.status || 'DRAFT');
  const [scheduledAt, setScheduledAt] = useState<string>(
    initialData?.scheduledAt ? format(new Date(initialData.scheduledAt), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [templateId, setTemplateId] = useState<string | null>(initialData?.templateId || null);
  const [media, setMedia] = useState<{ url: string; type: 'IMAGE' | 'VIDEO'; size?: number; width?: number; height?: number; duration?: number }[]>(
    initialData?.media?.map((m) => ({
      url: m.url,
      type: m.type,
      size: m.size || undefined,
      width: m.width || undefined,
      height: m.height || undefined,
      duration: m.duration || undefined,
    })) || []
  );

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'media' | 'ai' | 'settings'>('content');
  const [appliedTemplate, setAppliedTemplate] = useState<{ caption?: string; hashtags?: string[] } | null>(null);

  // Realtime state
  const [conflicts, setConflicts] = useState<Record<string, { local: unknown; remote: unknown; user: string }>>({});

  // Video file for validation
  const videoFileRef = useRef<File | null>(null);

  // Realtime hook
  const {
    isConnected,
    users,
    cursors,
    sendCursorPosition,
    sendPostUpdate,
    getUserColor,
    myColor,
  } = useRealtime({
    postId: isEditing ? postId : `new-${currentUserId}`,
    userId: currentUserId,
    userName: currentUserName,
    onPostUpdate: (updates) => {
      // Check for conflicts
      Object.entries(updates).forEach(([field, remoteValue]) => {
        const localValue = (() => {
          switch (field) {
            case 'title': return title;
            case 'caption': return caption;
            case 'hashtags': return hashtags;
            case 'type': return type;
            case 'status': return status;
            case 'scheduledAt': return scheduledAt;
            case 'templateId': return templateId;
            case 'media': return media;
            default: return undefined;
          }
        })();

        if (localValue !== undefined && JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
          setConflicts(prev => ({
            ...prev,
            [field]: { local: localValue, remote: remoteValue, user: 'Outro usuário' },
          }));
        }
      });
    },
    onUserJoin: (user) => console.log('User joined:', user.name),
    onUserLeave: (userId) => console.log('User left:', userId),
    onCursorUpdate: (cursor) => console.log('Cursor update:', cursor),
  });

  const resolveConflict = useCallback((field: string, value: unknown) => {
    // Apply the resolved value
    switch (field) {
      case 'title': setTitle(value as string); break;
      case 'caption': setCaption(value as string); break;
      case 'hashtags': setHashtags(value as string[]); break;
      case 'type': setType(value as PostType); break;
      case 'status': setStatus(value as PostStatus); break;
      case 'scheduledAt': setScheduledAt(value as string); break;
      case 'templateId': setTemplateId(value as string | null); break;
      case 'media': setMedia(value as typeof media); break;
    }

    setConflicts(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const dismissConflict = useCallback(() => {
    setConflicts({});
  }, []);

  // Track cursor position
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (editorRef.current && isConnected) {
      const rect = editorRef.current.getBoundingClientRect();
      sendCursorPosition(e.clientX - rect.left, e.clientY - rect.top);
    }
  }, [isConnected, sendCursorPosition]);

  // Send updates to other users
  const broadcastUpdate = useCallback((field: string, value: unknown) => {
    if (isConnected) {
      sendPostUpdate({ [field]: value });
    }
  }, [isConnected, sendPostUpdate]);

  const handleSave = async (newStatus?: PostStatus) => {
    if (!title.trim()) {
      alert('Título é obrigatório');
      return;
    }

    if (newStatus === 'PUBLISHED' && !scheduledAt) {
      setShowPublishConfirm(true);
      return;
    }

    setIsSaving(true);

    try {
      const postData = {
        title,
        caption: caption || null,
        hashtags,
        type,
        status: newStatus || status,
        scheduledAt: scheduledAt || null,
        templateId: templateId || null,
        media: media.map((m, index) => ({
          ...m,
          order: index,
        })),
      };

      const url = isEditing ? `/api/posts/${postId}` : '/api/posts';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar post');
      }

      const savedPost = await response.json();

      // Broadcast save to other users
      broadcastUpdate('status', newStatus || status);

      if (newStatus === 'PUBLISHED' && !scheduledAt) {
        // Post published immediately
        router.push(`/posts/${savedPost.id}`);
        router.refresh();
      } else {
        router.push('/calendar');
        router.refresh();
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert(error instanceof Error ? error.message : 'Erro ao salvar post');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing) return;

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir post');
      }

      router.push('/calendar');
      router.refresh();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert(error instanceof Error ? error.message : 'Erro ao excluir post');
    }
  };

  const handleMediaChange = useCallback((newMedia: typeof media) => {
    setMedia(newMedia);
    broadcastUpdate('media', newMedia);
  }, [broadcastUpdate]);

  const handleGenerateCaption = useCallback((newCaption: string) => {
    setCaption(newCaption);
    broadcastUpdate('caption', newCaption);
  }, [broadcastUpdate]);

  const handleGenerateHashtags = useCallback((newHashtags: string[]) => {
    setHashtags((prev) => {
      const combined = [...prev, ...newHashtags];
      return [...new Set(combined)];
    });
    broadcastUpdate('hashtags', [...new Set([...hashtags, ...newHashtags])]);
  }, [broadcastUpdate, hashtags]);

  const handleGenerateImage = useCallback((imageUrl: string) => {
    setMedia((prev) => [...prev, { url: imageUrl, type: 'IMAGE' }]);
  }, []);

  const handleApplyTemplate = useCallback((template: any) => {
    setTemplateId(template.id);
    broadcastUpdate('templateId', template.id);
    if (template.structure.caption) {
      setCaption(template.structure.caption);
      broadcastUpdate('caption', template.structure.caption);
    }
    if (template.structure.hashtags?.length) {
      setHashtags((prev) => {
        const combined = [...prev, ...template.structure.hashtags!];
        return [...new Set(combined)];
      });
    }
    if (template.structure.type) {
      setType(template.structure.type);
    }
    setAppliedTemplate({
      caption: template.structure.caption,
      hashtags: template.structure.hashtags,
    });
  }, []);

  const handleApplyBrandColors = useCallback(() => {
    // Colors are applied via CSS variables or Tailwind config
    console.log('Brand colors applied');
  }, []);

  const handleApplyBrandFonts = useCallback(() => {
    // Fonts are applied via CSS variables
    console.log('Brand fonts applied');
  }, []);

  const handleApplyBrandHashtags = useCallback((brandHashtags: string[]) => {
    setHashtags((prev) => {
      const combined = [...prev, ...brandHashtags];
      return [...new Set(combined)];
    });
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-80 bg-card border-r flex flex-col hidden lg:flex">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Editor de Post</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isEditing ? 'Editando post existente' : 'Criando novo post'}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {(['content', 'media', 'ai', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {tab === 'content' && <LayoutGrid className="h-5 w-5" />}
              {tab === 'media' && <ImageIcon className="h-5 w-5" />}
              {tab === 'ai' && <Sparkles className="h-5 w-5" />}
              {tab === 'settings' && <Tag className="h-5 w-5" />}
              <span>{tab === 'content' ? 'Conteúdo' : tab === 'media' ? 'Mídia' : tab === 'ai' ? 'IA' : 'Configurações'}</span>
            </button>
          ))}

          {isEditing && (
            <>
              <Separator className="my-4" />
              <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full justify-start">
                    <Trash2 className="h-5 w-5 mr-2" />
                    Excluir Post
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Excluir post</DialogTitle>
                    <DialogDescription>
                      Esta ação moverá o post para &quot;Arquivado&quot;. Tem certeza?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      Arquivar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </nav>

        {/* Save Actions */}
        <div className="p-4 border-t space-y-2">
          <Button
            onClick={() => handleSave('DRAFT')}
            disabled={isSaving}
            variant="outline"
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar como Rascunho'}
          </Button>

          <Button
            onClick={() => handleSave('APPROVED')}
            disabled={isSaving || !title.trim()}
            className="w-full"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Salvar como Aprovado
          </Button>

          <Dialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
            <DialogTrigger asChild>
              <Button
                onClick={() => handleSave('PUBLISHED')}
                disabled={isSaving || !title.trim()}
                variant="primary"
                className="w-full"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Publicar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publicar post</DialogTitle>
                <DialogDescription>
                  {scheduledAt
                    ? `O post será agendado para ${format(parseISO(scheduledAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.`
                    : 'O post será publicado imediatamente. Deseja continuar?'}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPublishConfirm(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleSave('PUBLISHED')}>
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 lg:flex-none flex items-center gap-4">
            <h1 className="text-xl font-semibold">
              {isEditing ? 'Editar Post' : 'Novo Post'}
            </h1>
            {/* Collaboration Indicators */}
            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <PresenceAvatars
                        users={[{ id: currentUserId, name: currentUserName, color: myColor }, ...users]}
                        currentUserId={currentUserId}
                        maxVisible={3}
                        size="sm"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-medium">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: myColor }}
                        />
                        <span>Você</span>
                      </div>
                      {users.length > 0 && (
                        <div className="pl-5 space-y-1 border-l border-muted">
                          {users.map(user => (
                            <div key={user.id} className="flex items-center gap-1.5 text-sm">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: user.color }}
                              />
                              <span>{user.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                      isConnected
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    )}>
                      {isConnected ? (
                        <>
                          <Wifi className="h-3.5 w-3.5" />
                          Online
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-3.5 w-3.5" />
                          Offline
                        </>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end">
                    {isConnected
                      ? 'Conectado - colaborando em tempo real'
                      : 'Desconectado - alterações salvas localmente'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(value) => {
              setStatus(value as PostStatus);
              broadcastUpdate('status', value);
            }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as PostStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className={cn('flex items-center gap-2 px-2 py-1 rounded', STATUS_COLORS[s])}>
                      {STATUS_LABELS[s]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* Conflict Toast */}
        {Object.keys(conflicts).length > 0 && (
          <ConflictToast
            conflicts={Object.entries(conflicts).map(([field, data]) => ({
              field,
              localValue: data.local,
              remoteValue: data.remote,
              remoteUser: data.user,
              timestamp: Date.now(),
            }))}
            onResolve={resolveConflict}
            onDismiss={dismissConflict}
          />
        )}

        {/* Cursor Overlay */}
        <CursorOverlay
          cursors={cursors}
          getUserColor={getUserColor}
          containerRef={editorRef}
          currentUserId={currentUserId}
        />

        {/* Editor Content */}
        <div ref={editorRef} className="flex-1 overflow-y-auto p-4 lg:p-6" onMouseMove={handleMouseMove}>
          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle>Conteúdo do Post</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      placeholder="Título do post..."
                      value={title}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTitle(value);
                        broadcastUpdate('title', value);
                      }}
                      maxLength={200}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="caption">Legenda</Label>
                    <Textarea
                      id="caption"
                      placeholder="Escreva a legenda do seu post..."
                      value={caption}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCaption(value);
                        broadcastUpdate('caption', value);
                      }}
                      rows={6}
                    />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{caption.length} caracteres</span>
                      <span>Ideal: 125-150 para Feed, até 2200</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Hashtags</Label>
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const newHashtags = hashtags.filter((_, i) => i !== index);
                              setHashtags(newHashtags);
                              broadcastUpdate('hashtags', newHashtags);
                            }}
                            className="hover:text-primary/70"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder="Adicionar hashtag (#...)"
                        className="flex-1 min-w-[150px] px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            e.preventDefault();
                            const tag = e.currentTarget.value.trim().startsWith('#')
                              ? e.currentTarget.value.trim()
                              : `#${e.currentTarget.value.trim()}`;
                            const newHashtags = [...new Set([...hashtags, tag])];
                            setHashtags(newHashtags);
                            broadcastUpdate('hashtags', newHashtags);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pressione Enter para adicionar. Máximo recomendado: 30 hashtags.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Post Type Selector */}
              <Card>
                <CardHeader>
                  <CardTitle>Tipo de Post</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(Object.keys(POST_TYPE_LABELS) as PostType[]).map((postType) => {
                      const Icon = POST_TYPE_ICONS[postType];
                      return (
                        <button
                          key={postType}
                          onClick={() => {
                            setType(postType);
                            broadcastUpdate('type', postType);
                          }}
                          className={cn(
                            'relative p-4 rounded-lg border-2 transition-all text-left',
                            type === postType
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn('p-2 rounded-lg', type === postType ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <span className="font-medium">{POST_TYPE_LABELS[postType]}</span>
                          </div>
                          {type === postType && (
                            <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Scheduling */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Agendamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduledAt">Data e Hora</Label>
                      <Input
                        id="scheduledAt"
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => {
                          const value = e.target.value;
                          setScheduledAt(value);
                          broadcastUpdate('scheduledAt', value);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status ao Publicar</Label>
                      <Select value={status} onValueChange={(value) => {
                        setStatus(value as PostStatus);
                        broadcastUpdate('status', value);
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Rascunho</SelectItem>
                          <SelectItem value="APPROVED">Aprovado</SelectItem>
                          <SelectItem value="PUBLISHED">Publicado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {scheduledAt && (
                    <p className="text-sm text-muted-foreground">
                      Agendado para {format(parseISO(scheduledAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
              <MediaUploader onMediaChange={handleMediaChange} maxFiles={10} maxSizeMB={50} />

              {/* Video Validator */}
              {media.some((m) => m.type === 'VIDEO') && (
                <VideoValidator
                  videoFile={videoFileRef.current}
                  postType={type}
                  onValidationComplete={(result) => {
                    if (!result.valid) {
                      console.warn('Vídeo com problemas:', result.errors);
                    }
                  }}
                />
              )}
            </div>
          )}

          {/* AI Tab */}
          {activeTab === 'ai' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <AIPanel
                    onGenerateCaption={handleGenerateCaption}
                    onGenerateHashtags={handleGenerateHashtags}
                    onGenerateImage={handleGenerateImage}
                    postType={type}
                  />
                </div>
                <div className="space-y-6">
                  <TemplateSelector
                    onSelectTemplate={handleApplyTemplate}
                    postType={type}
                    currentTemplateId={templateId || undefined}
                  />
                  <BrandQuickApply
                    onApplyColors={handleApplyBrandColors}
                    onApplyFonts={handleApplyBrandFonts}
                    onApplyLogo={() => {}}
                    onApplyWatermark={() => {}}
                    onApplyHashtags={handleApplyBrandHashtags}
                    currentHashtags={hashtags}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Avançadas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="templateId">Template</Label>
                    <Select value={templateId || ''} onValueChange={(v) => setTemplateId(v || null)}>
                      <SelectTrigger id="templateId">
                        <SelectValue placeholder="Selecionar template (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {/* Templates would be loaded dynamically */}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Permissões de Visualização</Label>
                    <Select value="private" onValueChange={() => {}}>
                      <SelectTrigger>
                        <SelectValue placeholder="Privado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Privado (apenas eu)</SelectItem>
                        <SelectItem value="team">Equipe</SelectItem>
                        <SelectItem value="public">Público (link compartilhável)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Colaboração</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-input" defaultChecked />
                        <span className="text-sm">Permitir comentários da equipe</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-input" />
                        <span className="text-sm">Notificar equipe ao publicar</span>
                      </label>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>SEO e Compartilhamento</Label>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="ogTitle">Título para Redes Sociais (og:title)</Label>
                        <Input id="ogTitle" placeholder={title} value={title} onChange={(e) => setTitle(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ogDescription">Descrição para Redes Sociais (og:description)</Label>
                        <Textarea id="ogDescription" placeholder={caption} value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}