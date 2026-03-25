import { login } from './actions'

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams
  return (
    <div className="flex h-screen items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm p-8 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-2">Acesso CLARICE</h1>
        <p className="text-sm text-zinc-400 mb-8">Faça login para continuar</p>

        {searchParams.error && (
          <div className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm p-3 rounded-md mb-6">
            {searchParams.error}
          </div>
        )}

        <form className="w-full flex flex-col gap-4" action={login}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-zinc-300">
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
            <label htmlFor="password" className="text-sm font-medium text-zinc-300">
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
