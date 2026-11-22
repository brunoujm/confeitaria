'use client';

import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';

export function AccountMenu() {
  const { data: session } = useSession();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-accent transition-colors"
        aria-label="Menu da conta do usuário"
      >
        <Avatar className="h-8 w-8">
          {session?.user?.image ? (
            <AvatarImage src={session.user.image} alt={session.user.name || ''} />
          ) : (
            <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
          )}
        </Avatar>
        <span className="hidden sm:inline">{session?.user?.name || 'Usuário'}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">{session?.user?.name || 'Usuário'}</p>
          <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Conta</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/ai" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>IA</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-destructive focus:text-destructive flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
