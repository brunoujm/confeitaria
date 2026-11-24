'use client';

import { useEffect, useState } from 'react';

/**
 * Componente que só renderiza os filhos no lado do cliente.
 * Útil para evitar erros de hidratação e para componentes que dependem
 * de APIs apenas do navegador (como React Query hooks).
 */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <>{children}</>;
}