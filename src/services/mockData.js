// =============================================================
// CaawiyeAI · Mock seed data
//
// Clean state: empty datasets & only Admin user account.
// =============================================================

export const SOMALI_SENTENCES = [
  "Maanta magaalada Muqdisho roob ayaa ka da'ay.",
  'Ciyaaraha barrey ayaa aad u xiiso badnaa.',
  'Waa inaan daryeelnaa deegaankayaga.',
  'Carruurtu waa u badan yihiin dalka Soomaaliya.',
  'Waxaan jeclahay cuntooyinka dhaqanka Soomaaliyeed.',
  'Xafiiska horudhaca ah ayaa xiraa fiidkii.',
  'Soonku wuxuu bilaabmaa bisheeda Ramadaan.',
  'Geesiga Soomaaliyeed wuxuu caan ku yay aduunka oo dhan.',
  'Runtu waxay mar walba dhaaftaa hadal kale.',
  'Magaalada Hargeysa waa mida ugu qurux badan buuraha.',
  'Beerta waxaa ka baxaya khudrad kala duwan.',
  'Caafimaadku waa nolosha, waana inoo ilaalino.',
  'Walaalaha oo dhan waxay ku nool yihiin hal guri.',
  'Ganacsiga xoolaha waa qayb weyn oo dhaqaalaha ka mid ah.',
  'Hoos deg sos oo naftaada qadari.',
  'Weligay ma arkin dharitaan sidaya oo kale.',
  'Wax walba waxay yimaaddaan wakhtigooda.',
  'Dadka Soomaaliyeed miisiyad aad bay u wanaagsan.',
  'Socdaalka dheer wuxuu kuugu soo baxayaa faa\'iido.',
  'Dhinaca badda waxaa jira doonyo xamuul ah.',
]

export const seedSentences = SOMALI_SENTENCES.map((text, i) => ({
  id: `s-${i + 1}`,
  text,
  language: 'so',
  category: 'general',
  difficulty: 'easy',
  is_recorded: false,
}))

export const seedUsers = [
  {
    id: 'demo-admin',
    username: 'Admin',
    email: 'admin@caawiyeai.so',
    country: 'Somalia',
    language: 'Somali',
    role: 'admin',
    photo: null,
    bio: 'System Administrator',
    joined_at: new Date().toISOString(),
    total_submissions: 0,
    accepted: 0,
    rejected: 0,
  },
]

export const seedDatasets = []

export function computeSeedStats(db) {
  const datasets = db?.datasets || seedDatasets
  const users = db?.users || seedUsers
  const stats = {
    totalDatasets: datasets.length,
    accepted: 0,
    rejected: 0,
    pending: 0,
    contributors: users.length,
    totalSentences: SOMALI_SENTENCES.length,
    goal: 1000000,
  }
  for (const d of datasets) {
    if (d.status === 'accepted') stats.accepted += 1
    else if (d.status === 'rejected') stats.rejected += 1
    else stats.pending += 1
  }
  return stats
}
