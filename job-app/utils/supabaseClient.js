import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly in dev instead of silently breaking auth later
  console.warn(
    'Missing Supabase env vars. Copy .env.example to .env.local and fill in your project values.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
