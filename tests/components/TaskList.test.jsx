import { render, screen } from '@testing-library/react';
import TaskList from '../../components/TaskList';

test('renderiza todas as tarefas', () => {
  render(<TaskList />);
  expect(screen.getByText('Criação de site institucional')).toBeInTheDocument();
  expect(screen.getByText('Desenvolvimento de app móvel')).toBeInTheDocument();
  expect(screen.getByText('Consultoria de UX/UI')).toBeInTheDocument();
});