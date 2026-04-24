import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'capas'
const TIMEOUT_MS = 10_000
const MAX_BYTES = 5 * 1024 * 1024

const HOSTS_PERMITIDOS = new Set([
  'covers.openlibrary.org',
  'books.google.com',
  'books.googleusercontent.com',
  'encrypted-tbn0.gstatic.com',
  'encrypted-tbn1.gstatic.com',
  'encrypted-tbn2.gstatic.com',
  'encrypted-tbn3.gstatic.com',
])

const EXT_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  }

  let body: { url?: string; acervoId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erro: 'JSON inválido' }, { status: 400 })
  }

  const url = (body.url ?? '').trim()
  const acervoId = (body.acervoId ?? '').trim()
  if (!url || !acervoId) {
    return NextResponse.json(
      { erro: 'url e acervoId são obrigatórios' },
      { status: 400 },
    )
  }

  // Evita path traversal / caracteres arbitrarios no caminho do Storage.
  // acervo.id e uuid no schema atual.
  const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!RE_UUID.test(acervoId)) {
    return NextResponse.json(
      { erro: 'acervoId deve ser UUID' },
      { status: 400 },
    )
  }

  // Garante que o titulo existe antes de subir bytes para o bucket.
  const { data: alvo, error: alvoErr } = await supabase
    .from('acervo')
    .select('id')
    .eq('id', acervoId)
    .maybeSingle()
  if (alvoErr || !alvo) {
    return NextResponse.json(
      { erro: 'Título não encontrado' },
      { status: 404 },
    )
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ erro: 'URL inválida' }, { status: 400 })
  }
  if (parsed.protocol !== 'https:') {
    return NextResponse.json({ erro: 'Somente HTTPS' }, { status: 400 })
  }
  if (!HOSTS_PERMITIDOS.has(parsed.hostname)) {
    return NextResponse.json(
      { erro: `Host não permitido: ${parsed.hostname}` },
      { status: 400 },
    )
  }

  // Fetch com timeout
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let resp: Response
  try {
    resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Clarice-Biblioteca/1.0 (+capas)' },
    })
  } catch (err) {
    clearTimeout(timer)
    return NextResponse.json(
      { erro: `Falha ao baixar: ${(err as Error).message}` },
      { status: 502 },
    )
  }
  clearTimeout(timer)

  if (!resp.ok) {
    return NextResponse.json(
      { erro: `Origem respondeu ${resp.status}` },
      { status: 502 },
    )
  }

  const tipo = (resp.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  const ext = EXT_POR_MIME[tipo]
  if (!ext) {
    return NextResponse.json(
      { erro: `Content-type não é imagem: ${tipo || 'desconhecido'}` },
      { status: 415 },
    )
  }

  const contentLength = Number(resp.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BYTES) {
    return NextResponse.json(
      { erro: `Arquivo grande demais (${contentLength} bytes)` },
      { status: 413 },
    )
  }

  const bytes = new Uint8Array(await resp.arrayBuffer())
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { erro: `Arquivo grande demais (${bytes.byteLength} bytes)` },
      { status: 413 },
    )
  }
  if (bytes.byteLength === 0) {
    return NextResponse.json({ erro: 'Arquivo vazio' }, { status: 502 })
  }

  const stamp = Date.now()
  const path = `${acervoId}/${stamp}.${ext}`

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: tipo,
    upsert: false,
  })
  if (upErr) {
    return NextResponse.json(
      { erro: `Falha no upload: ${upErr.message}` },
      { status: 500 },
    )
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ url: pub.publicUrl, path })
}
