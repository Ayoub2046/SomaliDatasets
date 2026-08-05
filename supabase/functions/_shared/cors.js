// Shared CORS handling for Supabase Edge Functions.
// Static, echo-only methods; no credentials header (token auth via JWT).

const ORIGINS = '*'

export const corsHeaders = {
  'Access-Control-Allow-Origin': ORIGINS,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function handleOptions(req) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}