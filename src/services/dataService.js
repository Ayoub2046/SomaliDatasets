// =============================================================
// CaawiyeAI · Data service
//
// One API surface. If Supabase env vars are configured every call
// hits Supabase (Auth, Postgres, Storage). Otherwise an in-browser
// mock backend (localStorage) is used so the whole product —
// including the admin dashboard — is fully explorable.
// =============================================================

import { supabase, IS_LIVE } from '../lib/supabase'
import { DEMO_ADMIN } from '../config/config'
import { seedSentences, seedUsers, seedDatasets, computeSeedStats } from './mockData'

// ---------------- Mock store helpers -------------------------------
const DB_KEY = 'caawiyeai_db_v1'
const SESSION_KEY = 'caawiyeai_session_v1'

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms))

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_) {
    /* ignore */
  }
  const db = { users: seedUsers, datasets: seedDatasets, sentences: seedSentences, seq: 10000 }
  saveDB(db)
  return db
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null
  } catch (_) {
    return null
  }
}
function saveSession(s) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  else localStorage.removeItem(SESSION_KEY)
}

function uid(prefix) {
  const db = loadDB()
  db.seq += 1
  saveDB(db)
  return `${prefix}-${db.seq}`
}

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    photo: u.photo,
    country: u.country,
    language: u.language,
    role: u.role,
    bio: u.bio,
    joined_at: u.joined_at,
    total_submissions: u.total_submissions || 0,
    accepted: u.accepted || 0,
    rejected: u.rejected || 0,
  }
}

function badgesForUser(total) {
  const defs = [
    { name: 'Bronze', icon: '🥉', min: 100 },
    { name: 'Silver', icon: '🥈', min: 500 },
    { name: 'Gold', icon: '🥇', min: 1000 },
    { name: 'Diamond', icon: '💎', min: 10000 },
  ]
  return defs.map((d) => ({ ...d, earned: total >= d.min }))
}

function rankOf(userId) {
  const db = loadDB()
  const sorted = [...db.users].sort((a, b) => b.total_submissions - a.total_submissions)
  const idx = sorted.findIndex((u) => u.id === userId)
  return idx === -1 ? null : idx + 1
}

// ---------------- Auth (live) --------------------------------------
const liveAuth = {
  async signUp({ email, password, username }) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } })
    if (error) throw error
    if (data.user) {
      await this.ensureProfile(data.user)
    }
    return data.user
  },
  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await this.ensureProfile(data.user)
    return data.user
  },
  async signInSocial(provider) {
    const { error } = await supabase.auth.signInWithOAuth({ provider })
    if (error) throw error
    return null
  },
  async signOut() {
    await supabase.auth.signOut()
  },
  async getUser() {
    const { data } = await supabase.auth.getUser()
    return data.user || null
  },
  onAuthChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session?.user || null))
    return data.subscription.unsubscribe
  },
  async ensureProfile(user) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (!profile) {
      await supabase.from('profiles').insert({
        id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'contributor',
        email: user.email,
      })
    }
  },
  async getProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    return data
  },
  async updateProfile(userId, patch) {
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select().single()
    if (error) throw error
    return data
  },
}

// ---------------- Auth (mock) --------------------------------------
const mockAuth = {
  async signUp({ email, password, username }) {
    await wait()
    const db = loadDB()
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email-ka horey ayaa loo diiwaan geliyay.')
    }
    const user = {
      id: uid('u'),
      username: username || email.split('@')[0],
      email,
      country: '',
      language: 'Somali',
      role: 'member',
      photo: null,
      bio: '',
      joined_at: new Date().toISOString(),
      total_submissions: 0,
      accepted: 0,
      rejected: 0,
    }
    db.users.push(user)
    saveDB(db)
    const session = { ...publicUser(user), password }
    saveSession(session)
    return session
  },
  async signIn({ email, password }) {
    await wait()
    const db = loadDB()
    if (email.toLowerCase() === DEMO_ADMIN.email && password === DEMO_ADMIN.password) {
      const admin = { ...DEMO_ADMIN, role: 'admin', id: 'demo-admin', joined_at: new Date().toISOString(), total_submissions: 324, accepted: 300, rejected: 24 }
      saveSession(publicUser(admin))
      return admin
    }
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!user) throw new Error('Email-ka ma jiro. Fadlan isdiiwaangeli.')
    const session = { ...publicUser(user) }
    saveSession(session)
    return session
  },
  async signInSocial(provider) {
    await wait()
    const names = { google: 'Google Caawiye', github: 'GitHub Caawiye' }
    const db = loadDB()
    const user = {
      id: uid('u'),
      username: `${names[provider] || 'Caawiye'} ${db.seq}`,
      email: `${provider}.user${db.seq}@caawiye.so`,
      country: '',
      language: 'Somali',
      role: 'member',
      photo: null,
      bio: '',
      joined_at: new Date().toISOString(),
      total_submissions: 0,
      accepted: 0,
      rejected: 0,
    }
    db.users.push(user)
    saveDB(db)
    const session = { ...publicUser(user) }
    saveSession(session)
    return session
  },
  async signOut() {
    saveSession(null)
  },
  async getUser() {
    return loadSession()
  },
  onAuthChange(cb) {
    return () => {}
  },
  async getProfile(userId) {
    const db = loadDB()
    const u = db.users.find((x) => x.id === userId)
    return u ? publicUser(u) : null
  },
  async updateProfile(userId, patch) {
    await wait()
    const db = loadDB()
    const u = db.users.find((x) => x.id === userId)
    if (u) {
      Object.assign(u, patch)
      saveDB(db)
      const session = loadSession()
      if (session && session.id === userId) saveSession(publicUser(u))
      return publicUser(u)
    }
    throw new Error('User not found')
  },
}

// ---------------- Datasets (live) ----------------------------------

// Map the new recording_status enum to the UI's simple statuses.
const PENDING_STATUSES = ['pending_upload', 'uploaded', 'validating', 'pending_review']
function uiStatus(status) {
  if (status === 'approved') return 'accepted'
  if (status === 'rejected') return 'rejected'
  return 'pending'
}
function statusExpr(status) {
  if (status === 'accepted') return 'approved'
  if (status === 'rejected') return 'rejected'
  return PENDING_STATUSES
}

const liveData = {
  async getStats() {
    const { count: total } = await supabase.from('recordings').select('*', { count: 'exact', head: true })
    const { count: accepted } = await supabase.from('recordings').select('*', { count: 'exact', head: true }).eq('status', 'approved')
    const { count: rejected } = await supabase.from('recordings').select('*', { count: 'exact', head: true }).eq('status', 'rejected')
    const { count: contributors } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    const { count: totalSentences } = await supabase.from('sentences').select('*', { count: 'exact', head: true }).eq('status', 'active')
    return { totalDatasets: total, accepted, rejected, pending: total - accepted - rejected, contributors, goal: 1000000, totalSentences }
  },
  async getLeaderboard(period = 'all') {
    const { data: profiles, error: pe } = await supabase.from('profiles')
      .select('id, username, photo, country, total_submissions, accepted, joined_at')
      .order('total_submissions', { ascending: false }).limit(200)
    if (pe) throw pe
    const { data: recs, error: re } = await supabase.from('recordings').select('user_id, status, created_at')
    if (re) throw re
    const cutoff = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 0
    const score = {}
    for (const r of recs || []) {
      if (r.status !== 'approved') continue
      if (cutoff && Date.now() - new Date(r.created_at).getTime() > cutoff * 86400000) continue
      score[r.user_id] = (score[r.user_id] || 0) + 1
    }
    return (profiles || []).map((u, i) => ({ ...u, rank: i + 1, score: score[u.id] || 0 }))
  },
  async getDatasets({ limit = 100, status, userId } = {}) {
    let q = supabase
      .from('recordings')
      .select('*, sentences(text), profiles(username, photo)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (status) q = q.in('status', statusExpr(status))
    if (userId) q = q.eq('user_id', userId)
    const { data, error } = await q
    if (error) throw error
    return (data || []).map((d) => ({
      ...d,
      sentence: d.sentences?.text || '',
      username: d.profiles?.username || 'unknown',
      photo: d.profiles?.photo || null,
      status: uiStatus(d.status),
    }))
  },
  async submitDataset({ sentence, audio_blob, duration, metadata }) {
    const { data: u } = await supabase.auth.getUser()
    if (!u?.user) throw new Error('Not authenticated')
    const userId = u.user.id
    // Resolve the sentence id by text (recordings require an existing sentence).
    const { data: sentences, error: se } = await supabase
      .from('sentences').select('id, text').eq('status', 'active').limit(1000)
    if (se) throw se
    const sn = (sentences || []).find((s) => s.text === sentence)
    // Recordings must reference a sentence that exists in the database.
    let audioPath = null
    if (audio_blob) {
      audioPath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.webm`
      const { error: upErr } = await supabase.storage
        .from('pending-recordings').upload(audioPath, audio_blob, { contentType: audio_blob.type || 'audio/webm' })
      if (upErr) throw upErr
    }
    if (!sn) {
      throw new Error('Jumladdan kama jirto database-ka. Add a sentence first.')
    }
    const { error } = await supabase.from('recordings').insert({
      user_id: userId,
      sentence_id: sn.id,
      status: 'pending_upload',
      storage_key: audioPath,
      duration,
      noise_level: metadata?.noise,
      gender: metadata?.gender,
      age_group: metadata?.age_group,
      device: metadata?.device,
      browser: metadata?.browser,
      client_checks: {},
    })
    if (error) throw error
    return true
  },
  async setStatus(id, status) {
    const { data: u } = await supabase.auth.getUser()
    // Review actions go through apply_approval (transaction + audit + sync queue).
    if (status === 'accepted' || status === 'rejected') {
      const { error } = await supabase.rpc('apply_approval', {
        p_recording_id: id,
        p_decision: status === 'accepted' ? 'approved' : 'rejected',
        p_source: 'reviewer',
        p_decided_by: u?.user?.id,
      })
      if (error) throw error
      return
    }
    const { error } = await supabase
      .from('recordings').update({ status: 'uploaded' }).eq('id', id).eq('user_id', u?.user?.id)
    if (error) throw error
  },
  async deleteDataset(id) {
    const { error } = await supabase.from('recordings').delete().eq('id', id)
    if (error) throw error
  },
  async getSentences() {
    const { data, error } = await supabase.from('sentences').select('*').eq('status', 'active').not('is_recorded', 'is', true).limit(500)
    if (error) throw error
    return data || []
  },
  async addSentence(text) {
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('sentences').insert({
      text,
      language: 'so',
      difficulty: 1,
      created_by: u?.user?.id || null,
    })
    if (error) throw error
  },
  async updateSentence(id, patch) {
    const { error } = await supabase.from('sentences').update(patch).eq('id', id)
    if (error) throw error
  },
  async deleteSentence(id) {
    const { error } = await supabase.from('sentences').delete().eq('id', id)
    if (error) throw error
  },
  async getUsers() {
    const { data, error } = await supabase.from('profiles').select('*').order('total_submissions', { ascending: false })
    if (error) throw error
    return data || []
  },
  onStatsChange(cb) {
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recordings' }, () => cb())
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
}

// ---------------- Datasets (mock) ----------------------------------
const mockData = {
  async getStats() {
    await wait(120)
    return computeSeedStats()
  },
  async getLeaderboard(period = 'all') {
    await wait(150)
    const db = loadDB()
    const cutoff = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 0
    const scored = db.users.map((u) => {
      const mine = db.datasets.filter((d) => d.user_id === u.id)
      const relevant = cutoff ? mine.filter((d) => Date.now() - new Date(d.created_at).getTime() < cutoff * 86400000) : mine
      return { ...publicUser(u), score: relevant.length }
    })
    return scored.sort((a, b) => b.score - a.score).map((u, i) => ({ ...u, rank: i + 1 }))
  },
  async getDatasets({ limit = 200, status, userId } = {}) {
    await wait(120)
    const db = loadDB()
    let rows = [...db.datasets]
    if (status) rows = rows.filter((d) => d.status === status)
    if (userId) rows = rows.filter((d) => d.user_id === userId)
    return rows
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
      .map((d) => {
        const u = db.users.find((x) => x.id === d.user_id)
        return { ...d, username: u?.username || 'unknown' }
      })
  },
  async submitDataset({ sentence, audio_blob, duration, metadata }) {
    await wait(400)
    const db = loadDB()
    const session = loadSession()
    if (!session) throw new Error('Not authenticated')
    const user = db.users.find((u) => u.id === session.id) || session
    let audio_url = null
    if (audio_blob) {
      try {
        const dataUrl = await blobToDataURL(audio_blob)
        audio_url = dataUrl
      } catch (_) {
        audio_url = null
      }
    }
    const record = {
      id: uid('d'),
      sentence,
      sentence_id: null,
      user_id: user.id,
      username: user.username,
      audio_url,
      duration: Math.round(duration * 100) / 100,
      noise: metadata?.noise || 3,
      gender: metadata?.gender || '',
      age_group: metadata?.age_group || '',
      device: metadata?.device || 'unknown',
      browser: metadata?.browser || 'unknown',
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    db.datasets.push(record)
    user.total_submissions = (user.total_submissions || 0) + 1
    if (session && session.id === user.id) {
      saveSession({ ...session, total_submissions: user.total_submissions })
    }
    saveDB(db)
    return record
  },
  async setStatus(id, status) {
    await wait(150)
    const db = loadDB()
    const d = db.datasets.find((x) => x.id === id)
    if (!d) throw new Error('Dataset not found')
    const user = db.users.find((u) => u.id === d.user_id)
    if (user) {
      if (d.status === 'accepted') user.accepted = Math.max(0, (user.accepted || 0) - 1)
      if (d.status === 'rejected') user.rejected = Math.max(0, (user.rejected || 0) - 1)
      if (status === 'accepted') user.accepted = (user.accepted || 0) + 1
      if (status === 'rejected') user.rejected = (user.rejected || 0) + 1
    }
    d.status = status
    saveDB(db)
  },
  async deleteDataset(id) {
    await wait(120)
    const db = loadDB()
    db.datasets = db.datasets.filter((d) => d.id !== id)
    saveDB(db)
  },
  async getSentences() {
    await wait(100)
    return loadDB().sentences
  },
  async addSentence(text) {
    await wait(150)
    const db = loadDB()
    db.sentences.push({ id: uid('s'), text, language: 'so', category: 'general', difficulty: 'easy', is_recorded: false })
    saveDB(db)
  },
  async updateSentence(id, patch) {
    await wait(120)
    const db = loadDB()
    const s = db.sentences.find((x) => x.id === id)
    if (s) {
      Object.assign(s, patch)
      saveDB(db)
    }
  },
  async deleteSentence(id) {
    await wait(120)
    const db = loadDB()
    db.sentences = db.sentences.filter((s) => s.id !== id)
    saveDB(db)
  },
  async getUsers() {
    await wait(120)
    const db = loadDB()
    return [...db.users]
      .sort((a, b) => (b.total_submissions || 0) - (a.total_submissions || 0))
      .map(publicUser)
  },
  onStatsChange(cb) {
    return () => {}
  },
}

// ---------------- Export facade --------------------------------------
const auth = IS_LIVE ? liveAuth : mockAuth
const data = IS_LIVE ? liveData : mockData

export { auth, data, IS_LIVE }

export function getBadges(total) {
  return badgesForUser(total)
}

export function getRank(userId) {
  return IS_LIVE ? null : rankOf(userId)
}

export async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export const sessionUser = () => (IS_LIVE ? null : loadSession())
