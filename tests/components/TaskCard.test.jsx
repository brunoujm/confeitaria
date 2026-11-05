import { render, screen } from '@testing-library/react';
import TaskCard from '../../components/TaskCard';

test('renderiza todas as props da tarefa', () => {
  render(<TaskCard title="Setup" client="Cliente Teste" value={1000} status="Em andamento" />);
  expect(screen.getByText('Setup')).toBeInTheDocument();
  expect(screen.getByText('Cliente: Cliente Teste')).toBeInTheDocument();
  // Valor formatado pelo Intl.NumberFormat (pt-BR) inclui separador de milhares e espaço não-quebrável
  expect(screen.getByText((content) => content.includes('Valor: R$') && content.includes('1.000,00'))).toBeInTheDocument();
  expect(screen.getByText('Status: Em andamento')).toBeInTheDocument();
});