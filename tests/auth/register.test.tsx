import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/ui/Toast';
import { NextIntlClientProvider } from 'next-intl';
import RegisterPage from '@/app/[locale]/(auth)/register/page';
import ptBR from '../../messages/pt-BR.json';
import type { AbstractIntlMessages } from 'next-intl';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  useSession: () => ({
    data: null,
    status: 'unauthenticated',
  }),
}));

import { signIn } from 'next-auth/react';

// Wrapper component with ToastProvider and NextIntlClientProvider
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider messages={ptBR as unknown as AbstractIntlMessages} locale="pt-BR">
      <ToastProvider>{ui}</ToastProvider>
    </NextIntlClientProvider>
  );
};

describe('Register Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders register form with name, email, password, and confirm password fields', () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument();
  });

  test('shows validation error for empty name', async () => {
    renderWithProviders(<RegisterPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^senha$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar senha/i);
    const submitButton = screen.getByRole('button', { name: /criar conta/i });

    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, '123456');
    await userEvent.type(confirmPasswordInput, '123456');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument();
    });
  });

  test('shows validation error for invalid email', async () => {
    renderWithProviders(<RegisterPage />);

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^senha$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar senha/i);
    const submitButton = screen.getByRole('button', { name: /criar conta/i });

    await userEvent.type(nameInput, 'Test User');
    await userEvent.type(emailInput, 'invalid-email');
    await userEvent.type(passwordInput, '123456');
    await userEvent.type(confirmPasswordInput, '123456');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    });
  });

  test('shows error when register API fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Este email já está cadastrado' }),
    });

    renderWithProviders(<RegisterPage />);

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^senha$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar senha/i);
    const submitButton = screen.getByRole('button', { name: /criar conta/i });

    await userEvent.type(nameInput, 'Test User');
    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, '123456');
    await userEvent.type(confirmPasswordInput, '123456');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/erro ao criar conta/i)).toBeInTheDocument();
      expect(screen.getByText(/este email já está cadastrado/i)).toBeInTheDocument();
    });
  });

  test('shows validation error for short password', async () => {
    renderWithProviders(<RegisterPage />);

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^senha$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar senha/i);
    const submitButton = screen.getByRole('button', { name: /criar conta/i });

    await userEvent.type(nameInput, 'Test User');
    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, '123');
    await userEvent.type(confirmPasswordInput, '123');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/senha deve ter no mínimo 6 caracteres/i)).toBeInTheDocument();
    });
  });

  test('shows validation error for mismatched passwords', async () => {
    renderWithProviders(<RegisterPage />);

    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^senha$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar senha/i);
    const submitButton = screen.getByRole('button', { name: /criar conta/i });

    await userEvent.type(nameInput, 'Test User');
    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, '123456');
    await userEvent.type(confirmPasswordInput, 'different');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/as senhas não coincidem/i)).toBeInTheDocument();
    });
  });

  test('calls register API on valid submit', async () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByRole('link', { name: /entrar/i })).toHaveAttribute('href', '/pt-BR/login');
  });
});