// =============================================================
// CaawiyeAI · Runtime configuration
//
// DEMO MODE: if Supabase credentials are not supplied the app
// falls back to an in-browser mock backend so you can explore
// every screen (including all the admin charts) instantly.
//
// To enable the real Supabase backend, create a `.env` file:
//
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
// =============================================================

export const CONFIG = {
  appName: 'CaawiyeAI',
  appSlogan: 'Samee cod · Dhig AI-da Af-Soomaaliga',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  goalCount: 1000000,
  goalMonths: 12,
  demoUser: {
    username: 'Ayuob',
    country: 'Somalia',
    language: 'Somali (maay/maxaa)',
    role: 'admin',
    email: 'ayuob@caawiye.ai',
  },
}

export const IS_LIVE = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey)

// Demo admin account used by the mock backend.
export const DEMO_ADMIN = {
  id: 'demo-admin',
  username: 'Admin',
  email: 'admin@caawiyeai.so',
  password: 'admin123',
  role: 'admin',
  country: 'Somalia',
  language: 'Somali',
}