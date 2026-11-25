'use client';

import type {
  ReactNode,
  HTMLAttributes} from 'react';
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  contentRef: React.RefObject<HTMLDivElement>;
  itemsRef: React.RefObject<HTMLDivElement[]>;
  registerItem: (el: HTMLDivElement | null) => void;
  unregisterItem: (el: HTMLDivElement | null) => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextType | null>(null);

function useDropdownMenu() {
  const context = useContext(DropdownMenuContext);
  if (!context) throw new Error('DropdownMenu components must be used within DropdownMenu');
  return context;
}

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement[]>([]);

  const registerItem = useCallback((el: HTMLDivElement | null) => {
    if (el && !itemsRef.current.includes(el)) {
      itemsRef.current.push(el);
    }
  }, []);

  const unregisterItem = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      itemsRef.current = itemsRef.current.filter(item => item !== el);
    }
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!open) return;

    const items = itemsRef.current.filter(el => !el.hasAttribute('data-disabled'));
    if (items.length === 0) return;

    const activeIndex = items.findIndex(el => el === document.activeElement);

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        break;
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = (activeIndex + 1) % items.length;
        items[nextIndex]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = (activeIndex - 1 + items.length) % items.length;
        items[prevIndex]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Enter':
      case ' ':
        if (activeIndex >= 0) {
          event.preventDefault();
          items[activeIndex].click();
        }
        break;
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef, contentRef, itemsRef, registerItem, unregisterItem }}>
      <div onKeyDown={handleKeyDown}>{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, className, asChild, ...props }: { children: ReactNode; className?: string; asChild?: boolean } & HTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, triggerRef } = useDropdownMenu();

  const handleClick = () => setOpen(!open);

  if (asChild) {
    const childArray = React.Children.toArray(children);
    const validChild = childArray.find(React.isValidElement) as React.ReactElement | undefined;

    if (!validChild) return null;

    return (
      <Slot>
        {React.cloneElement(validChild, {
          ref: triggerRef,
          className: cn('inline-flex items-center gap-1', validChild.props.className, className),
          onClick: (e: React.MouseEvent) => {
            handleClick();
            validChild.props.onClick?.(e);
          },
          'aria-expanded': open,
          'aria-haspopup': 'true',
          ...props,
          ...validChild.props,
        })}
      </Slot>
    );
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      className={cn('inline-flex items-center gap-1', className)}
      onClick={handleClick}
      aria-expanded={open}
      aria-haspopup="true"
      {...props}
    >
      {children}
      {!asChild && (
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      )}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  className,
  align = 'start',
  forceMount = false,
  ...props
}: {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end' | 'center';
  forceMount?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  const { open, contentRef } = useDropdownMenu();

  if (!open && !forceMount) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        'fixed z-50 min-w-[12rem] overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-popover p-1 text-popover-foreground shadow-lg',
        align === 'end' && 'right-0',
        align === 'center' && 'left-1/2 -translate-x-1/2'
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  className,
  onClick,
  asChild,
  disabled,
  ...props
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  asChild?: boolean;
  disabled?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  const { setOpen, registerItem, unregisterItem } = useDropdownMenu();
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerItem(itemRef.current);
    return () => unregisterItem(itemRef.current);
  }, [registerItem, unregisterItem]);

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  if (asChild) {
    const childArray = React.Children.toArray(children);
    const validChild = childArray.find(React.isValidElement) as React.ReactElement | undefined;

    if (!validChild) return null;

    return (
      <Slot>
        {React.cloneElement(validChild, {
          ref: itemRef,
          tabIndex: disabled ? undefined : 0,
          'data-disabled': disabled ? '' : undefined,
          className: cn(
            'relative flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus:bg-[hsl(var(--accent))] focus:text-[hsl(var(--accent-foreground))] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            validChild.props.className,
            className
          ),
          onClick: (e: React.MouseEvent) => {
            handleClick();
            validChild.props.onClick?.(e);
          },
          onKeyDown: (e: React.KeyboardEvent) => {
            handleKeyDown(e);
            validChild.props.onKeyDown?.(e);
          },
          ...props,
          ...validChild.props,
        })}
      </Slot>
    );
  }

  return (
    <div
      ref={itemRef}
      tabIndex={disabled ? undefined : 0}
      data-disabled={disabled ? '' : undefined}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus:bg-[hsl(var(--accent))] focus:text-[hsl(var(--accent-foreground))] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className, ...props }: { className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('-mx-1 my-1 h-px bg-[hsl(var(--border))]', className)} {...props} />
  );
}