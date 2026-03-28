import { login } from './actions'

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams
  return (
    <div className="flex h-screen items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm p-8 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Acesso Clarice
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Faça login para continuar
        </p>

        {searchParams.error && (
          <div
            className="w-full text-sm p-3 rounded-md mb-6"
            style={{
              background: 'var(--accent-rose-soft)',
              border: '1px solid rgba(251, 113, 133, 0.2)',
              color: 'var(--accent-rose)',
            }}
          >
            {searchParams.error}
          </div>
        )}

        <form className="w-full flex flex-col gap-4" action={login}>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="dark-input w-full"
              placeholder="seu@email.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="dark-input w-full"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-primary w-full mt-4">
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
