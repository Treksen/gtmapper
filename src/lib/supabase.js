import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// GT MAPPER · SUPABASE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
//
// HOW TO SET UP YOUR FREE SUPABASE DATABASE:
//
// 1. Go to https://supabase.com and click "Start your project" (free)
// 2. Create a new project — name it "gt-mapper", choose a strong password
// 3. Wait ~2 minutes for it to provision
// 4. Go to Project Settings → API
// 5. Copy your "Project URL" and paste it as VITE_SUPABASE_URL below
// 6. Copy your "anon public" key and paste it as VITE_SUPABASE_ANON_KEY below
//
// Then create a .env file in the root of this project with:
//   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
//
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '⚠️  GT Mapper: Supabase credentials not found in .env file.\n' +
    'Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
    'See src/lib/supabase.js for instructions.'
  )
}

export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseKey  || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)

export default supabase
