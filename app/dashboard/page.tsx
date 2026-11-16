import { createServerSupabase } from '@/lib/supabase-server'
import { carregarDadosDashboard, type DadosDashboard } from '@/lib/dashboard'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let dadosIniciais: DadosDashboard | null = null
  let erroInicial = ''

  try {
    const supabase = await createServerSupabase()
    dadosIniciais = await carregarDadosDashboard(supabase, 'mes')
  } catch (err) {
    console.error('Erro ao carregar dashboard no servidor:', err)
    erroInicial = 'Erro ao carregar dados. Tente novamente.'
  }

  return (
    <DashboardClient
      dadosIniciais={dadosIniciais}
      periodoInicial="mes"
      erroInicial={erroInicial}
    />
  )
}
