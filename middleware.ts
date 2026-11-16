import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isPassaporte = pathname === '/passaporte' || pathname.startsWith('/passaporte/')
  const isBuscaAcervo = pathname === '/buscar' || pathname.startsWith('/buscar/')

  if (isPassaporte || isBuscaAcervo) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isApi = pathname.startsWith('/api/')
  const isLogin = pathname === '/login' || pathname.startsWith('/login/')

  if (!user && isApi) {
    return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  }
  if (!user && !isLogin) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isLogin) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Exclui assets estáticos e arquivos PWA (manifest, service worker e workers do workbox)
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|workbox-.*\\.js|swe-worker-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
