import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import LoginPage from '@/app/[locale]/(auth)/login/page';
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

// Wrapper with NextIntlClientProvider
const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider messages={ptBR as unknown as AbstractIntlMessages} locale="pt-BR">
      {ui}
    </NextIntlClientProvider>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form with email and password fields', () => {
    renderWithIntl(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  test('shows validation error for invalid email', async () => {
    renderWithIntl(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    await userEvent.type(emailInput, 'invalid-email');
    await userEvent.type(passwordInput, '123456');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    });
  });

  test('shows validation error for short password', async () => {
    renderWithIntl(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, '123');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/senha deve ter no mínimo 6 caracteres/i)).toBeInTheDocument();
    });
  });

  test('calls signIn with credentials on valid submit', async () => {
    (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });

    renderWithIntl(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, '123456');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'test@test.com',
        password: '123456',
        redirect: false,
      });
    });
  });

  test('shows error when signIn fails', async () => {
    (signIn as jest.Mock).mockResolvedValue({ ok: false, error: 'Credenciais inválidas' });

    renderWithIntl(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, '123456');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument();
    });
  });

  test('has link to register page', () => {
    renderWithIntl(<LoginPage />);

    expect(screen.getByRole('link', { name: /criar conta/i })).toHaveAttribute('href', '/pt-BR/register');
  });
});