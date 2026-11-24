'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Video, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { cn } from '@/lib/utils';

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: 'IMAGE' | 'VIDEO';
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  uploadedUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}

interface MediaUploaderProps {
  onMediaChange: (media: { url: string; type: 'IMAGE' | 'VIDEO'; size?: number; width?: number; height?: number; duration?: number }[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export function MediaUploader({
  onMediaChange,
  maxFiles = 10,
  maxSizeMB = 50,
  acceptedTypes = ['image/*', 'video/mp4', 'video/webm', 'video/quicktime'],
}: MediaUploaderProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generatePreview = (file: File): string => {
    return URL.createObjectURL(file);
  };

  const getVideoDuration = (file: File): Promise<number | null> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('video/')) {
        resolve(null);
        return;
      }
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number } | null> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve(null);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `Arquivo muito grande. Máximo: ${maxSizeMB}MB`;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      return 'Tipo de arquivo não suportado. Use imagens ou vídeos.';
    }

    if (isVideo) {
      const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (!allowedVideoTypes.includes(file.type)) {
        return 'Formato de vídeo não suportado. Use MP4, WebM ou MOV.';
      }
    }

    return null;
  }, [maxSizeMB]);

  const addFiles = useCallback(async (newFiles: File[]) => {
    const remainingSlots = maxFiles - files.length;
    const filesToAdd = newFiles.slice(0, remainingSlots);

    for (const file of filesToAdd) {
      const error = validateFile(file);
      if (error) {
        setFiles((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            file,
            preview: generatePreview(file),
            type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
            progress: 0,
            status: 'error',
            error,
          },
        ]);
        continue;
      }

      await Promise.all([
        getVideoDuration(file),
        getImageDimensions(file),
      ]);

      const newMediaFile: MediaFile = {
        id: crypto.randomUUID(),
        file,
        preview: generatePreview(file),
        type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
        progress: 0,
        status: 'pending',
      };

      setFiles((prev) => [...prev, newMediaFile]);
    }
  }, [files.length, maxFiles, validateFile]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const uploadFile = async (mediaFile: MediaFile) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === mediaFile.id ? { ...f, status: 'uploading' as const, progress: 0 } : f))
    );

    try {
      const formData = new FormData();
      formData.append('file', mediaFile.file);

      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro no upload');
      }

      const data = await response.json();

      setFiles((prev) =>
        prev.map((f) =>
          f.id === mediaFile.id
            ? { ...f, status: 'completed' as const, progress: 100, uploadedUrl: data.url }
            : f
        )
      );

      // Pre-compute dimensions/durations for all files before mapping
      const otherFiles = files.filter((f) => f.id !== mediaFile.id);
      const fileMetadata = await Promise.all(
        otherFiles.map(async (f) => ({
          id: f.id,
          width: f.type === 'IMAGE' ? (await getImageDimensions(f.file))?.width : undefined,
          height: f.type === 'IMAGE' ? (await getImageDimensions(f.file))?.height : undefined,
          duration: f.type === 'VIDEO' ? (await getVideoDuration(f.file)) ?? undefined : undefined,
        }))
      );

      const metadataMap = new Map(fileMetadata.map(m => [m.id, m]));

      const updatedMedia = otherFiles.map((f) => {
        const meta = metadataMap.get(f.id);
        return {
          url: f.uploadedUrl || f.preview,
          type: f.type,
          size: f.file.size,
          width: meta?.width,
          height: meta?.height,
          duration: meta?.duration,
        };
      });

      // Get metadata for the newly uploaded file
      const newFileWidth = mediaFile.type === 'IMAGE' ? (await getImageDimensions(mediaFile.file))?.width : undefined;
      const newFileHeight = mediaFile.type === 'IMAGE' ? (await getImageDimensions(mediaFile.file))?.height : undefined;
      const newFileDuration = mediaFile.type === 'VIDEO' ? (await getVideoDuration(mediaFile.file)) ?? undefined : undefined;

      updatedMedia.push({
        url: data.url,
        type: mediaFile.type,
        size: mediaFile.file.size,
        width: newFileWidth,
        height: newFileHeight,
        duration: newFileDuration,
      });

      onMediaChange(updatedMedia);
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === mediaFile.id
            ? { ...f, status: 'error' as const, error: error instanceof Error ? error.message : 'Erro no upload' }
            : f
        )
      );
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    for (const file of pendingFiles) {
      await uploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const completedCount = files.filter((f) => f.status === 'completed').length;
  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <Card className={cn('transition-all', isDragOver && 'ring-2 ring-primary')}>
      <CardContent className="pt-6">
        {/* Drop Zone */}
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={files.length >= maxFiles}
          />
          <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-1">
            Arraste e solte arquivos ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground">
            Suporta: JPG, PNG, WebP, MP4, WebM, MOV (máx. {maxSizeMB}MB cada)
          </p>
          {files.length >= maxFiles && (
            <p className="text-xs text-amber-500 mt-2">Limite de {maxFiles} arquivos atingido</p>
          )}
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  file.status === 'error' && 'border-red-200 bg-red-50',
                  file.status === 'completed' && 'border-green-200 bg-green-50',
                  file.status === 'uploading' && 'border-blue-200 bg-blue-50',
                  file.status === 'pending' && 'border-border bg-background'
                )}
              >
                <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden">
                  {file.type === 'IMAGE' ? (
                    <NextImage src={file.preview} alt="" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Video className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  {file.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                  {file.status === 'completed' && (
                    <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {file.status === 'error' && (
                    <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{file.file.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {file.type}
                    </span>
                    {file.status === 'completed' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                        Enviado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
                    {file.duration && <span>• {Math.round(file.duration)}s</span>}
                    {file.width && file.height && <span>• {file.width}×{file.height}</span>}
                  </div>
                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="mt-2 h-1" />
                  )}
                  {file.status === 'error' && (
                    <p className="text-xs text-red-500 mt-1">{file.error}</p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(file.id)}
                  disabled={file.status === 'uploading'}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {pendingCount > 0 && (
              <Button onClick={handleUploadAll} className="w-full mt-2" disabled={pendingCount === 0}>
                <Upload className="h-4 w-4 mr-2" />
                Enviar {pendingCount} arquivo{pendingCount > 1 ? 's' : ''} pendente{pendingCount > 1 ? 's' : ''}
              </Button>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Total: {files.length}</span>
              <span className="text-green-600">✓ {completedCount}</span>
              {pendingCount > 0 && <span className="text-blue-600">⟳ {pendingCount}</span>}
              {errorCount > 0 && <span className="text-red-600">✗ {errorCount}</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}