'use client';

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  ReactNode,
  HTMLAttributes,
} from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  contentRef: React.RefObject<HTMLDivElement>;
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
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, className, asChild, ...props }: { children: ReactNode; className?: string; asChild?: boolean } & HTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, triggerRef } = useDropdownMenu();

  const handleClick = () => setOpen(!open);

  if (asChild) {
    // Slot expects a single React element child
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
      <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
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
        'fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
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
  ...props
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  asChild?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  const { setOpen } = useDropdownMenu();

  const handleClick = () => {
    onClick?.();
    setOpen(false);
  };

  if (asChild) {
    // Slot expects a single React element child
    const childArray = React.Children.toArray(children);
    const validChild = childArray.find(React.isValidElement) as React.ReactElement | undefined;

    if (!validChild) return null;

    return (
      <Slot>
        {React.cloneElement(validChild, {
          className: cn(
            'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            validChild.props.className,
            className
          ),
          onClick: (e: React.MouseEvent) => {
            handleClick();
            validChild.props.onClick?.(e);
          },
          ...props,
          ...validChild.props,
        })}
      </Slot>
    );
  }

  return (
    <div
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className, ...props }: { className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />
  );
}