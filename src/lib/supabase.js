import { createClient } from '@supabase/supabase-js'
import { CONFIG, IS_LIVE } from '../config/config'

// Real Supabase client — active only when VITE_SUPABASE_* is configured.
export const supabase = IS_LIVE
  ? createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey)
  : null

export { IS_LIVE }
