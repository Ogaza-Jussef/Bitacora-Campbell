import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth';

export function LoginPage() {
  const { token, user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  if (token && user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await login(email, password);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo iniciar sesión');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login">
      <section className="login-card">
        <img src="/logo-campbell.png" alt="Fundación Campbell" width={168} height={168} />
        <h1>Bitácora de Soportes</h1>
        <p>Registro diario del equipo de tecnología.</p>
        <form onSubmit={onSubmit}>
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
          {error ? <p className="alert" role="alert">{error}</p> : null}
          <button type="submit" disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </section>
    </main>
  );
}
