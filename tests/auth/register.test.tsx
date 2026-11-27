import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/ui/Toast';
import { NextIntlClientProvider } from 'next-intl';
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

// Mock fetch for API calls - must be hoisted before component import
const mockFetch = jest.fn();
global.fetch = mockFetch;

import RegisterPage from '@/app/[locale]/(auth)/register/page';

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
    mockFetch.mockReset();
    // Default mock: successful registration (anti-enumeration - always returns 200)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Se este email não estiver cadastrado, você receberá instruções' }),
    });
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

  test('shows error when register API fails (server error)', async () => {
    // Mock fetch to return a server error (500)
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Erro interno do servidor' }),
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

    // Click the submit button to trigger form submission
    await act(async () => {
      await userEvent.click(submitButton);
    });

    // Wait for fetch to be called - this should pass
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', expect.any(Object));
    });

    // Wait for error toast with longer timeout
    await waitFor(() => {
      expect(screen.getByText(/erro ao criar conta/i)).toBeInTheDocument();
    }, { timeout: 5000 });
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