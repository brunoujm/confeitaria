'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Loader2,
  Key,
  Delete,
} from 'lucide-react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Switch } from '@/components/ui/Switch';
import { Separator } from '@/components/ui/Separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  emailNotifications: boolean;
  createdAt: string;
}

interface SettingsData {
  name: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'pt-BR' | 'en-US';
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'security' | 'danger'>('profile');
  const [saving, setSaving] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [settings, setSettings] = useState<SettingsData>({
    name: '',
    email: '',
    emailNotifications: true,
    pushNotifications: false,
    theme: 'system',
    language: 'pt-BR',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/user');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSettings({
          name: data.user.name || '',
          email: data.user.email,
          emailNotifications: data.user.emailNotifications,
          pushNotifications: false,
          theme: 'system',
          language: 'pt-BR',
        });
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: settings.name }),
      });
      if (response.ok) {
        const data = await response.json();
        setUser(prev => prev ? { ...prev, name: data.user.name } : null);
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotifications: settings.emailNotifications }),
      });
      if (response.ok) {
        const data = await response.json();
        setUser(prev => prev ? { ...prev, emailNotifications: data.user.emailNotifications } : null);
      }
    } catch (error) {
      console.error('Erro ao salvar notificações:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppearance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Save to localStorage for now
      localStorage.setItem('theme', settings.theme);
      localStorage.setItem('language', settings.language);
      // Apply theme
      if (settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Erro ao salvar aparência:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      alert('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      if (response.ok) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        alert('Senha alterada com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao alterar senha');
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      alert('Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie sua conta e preferências</p>
        </div>
        <Card variant="default">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Carregando configurações...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua conta e preferências</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'profile' | 'notifications' | 'appearance' | 'security' | 'danger')}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-2" /> Perfil</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" /> Notificações</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-4 w-4 mr-2" /> Aparência</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-2" /> Segurança</TabsTrigger>
          <TabsTrigger value="danger"><Delete className="h-4 w-4 mr-2" /> Zona de Perigo</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="pt-6 animate-fade-in">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
            </CardHeader>
            <form onSubmit={handleSaveProfile}>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {user?.image ? (
                        <NextImage src={user.image} alt={user.name || ''} fill className="object-cover" />
                      ) : (
                        <User className="h-12 w-12 text-primary" />
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="absolute bottom-0 right-0" disabled>
                      Alterar foto
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{user?.name || 'Usuário'}</h3>
                    <p className="text-muted-foreground">{user?.email}</p>
                    <Badge variant="outline">{user?.role || 'OWNER'}</Badge>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      value={settings.name}
                      onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Seu nome"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      value={settings.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar alterações
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="pt-6 animate-fade-in">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
            </CardHeader>
            <form onSubmit={handleSaveNotifications}>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Notificações por e-mail</Label>
                      <p className="text-sm text-muted-foreground">Receba atualizações sobre posts, aprovações e comentários</p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Notificações push</Label>
                      <p className="text-sm text-muted-foreground">Receba notificações no navegador (requer PWA instalado)</p>
                    </div>
                    <Switch
                      checked={settings.pushNotifications}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pushNotifications: checked }))}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar preferências
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="pt-6 animate-fade-in">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
            </CardHeader>
            <form onSubmit={handleSaveAppearance}>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Tema</Label>
                    <Select value={settings.theme} onValueChange={(v) => setSettings(prev => ({ ...prev, theme: v as any }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Escuro</SelectItem>
                        <SelectItem value="system">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Idioma</Label>
                    <Select value={settings.language} onValueChange={(v) => setSettings(prev => ({ ...prev, language: v as any }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar aparência
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="pt-6 animate-fade-in">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Alterar senha</h4>
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Senha atual</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">A senha deve ter pelo menos 8 caracteres</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                  Alterar senha
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger" className="pt-6 animate-fade-in">
          <Card variant="default" className="border-destructive/20 dark:border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <Delete className="h-5 w-5" />
                Zona de Perigo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 rounded-lg">
                <h4 className="font-medium text-destructive mb-2">Excluir conta permanentemente</h4>
                <p className="text-destructive/80 text-sm mb-4">
                  Esta ação é irreversível. Todos os seus dados (posts, templates, mídia, configurações) serão permanentemente excluídos.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="deleteConfirm">Digite &quot;EXCLUIR&quot; para confirmar</Label>
                  <Input
                    id="deleteConfirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="EXCLUIR"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                variant="destructive"
                onClick={async () => {
                  if (deleteConfirmText !== 'EXCLUIR') {
                    alert('Digite &quot;EXCLUIR&quot; para confirmar');
                    return;
                  }
                  setSaving(true);
                  try {
                    const response = await fetch('/api/user', { method: 'DELETE' });
                    if (response.ok) {
                      window.location.href = '/auth/login';
                    } else {
                      const error = await response.json();
                      alert(error.error || 'Erro ao excluir conta');
                    }
                  } catch (error) {
                    console.error('Erro ao excluir conta:', error);
                    alert('Erro ao excluir conta');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving || deleteConfirmText !== 'EXCLUIR'}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Delete className="h-4 w-4 mr-2" />}
                Excluir minha conta
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}