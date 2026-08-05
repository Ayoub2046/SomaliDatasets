// =============================================================
// CaawiyeAI · Mock seed data (used in demo mode so every page,
// including the admin charts, is fully populated.)
// =============================================================

const rng = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a

export const SOMALI_SENTENCES = [
  "Maanta magaalada Muqdisho roob ayaa ka da'ay.",
  'Ciyaaraha barrey ayaa aad u xiiso badnaa.',
  'Waa inaan daryeelnaa deegaankayaga.',
  'Carruurtu waa u badan yihiin dalka Soomaaliya.',
  'Waxaan jeclahay cuntooyinka dhaqanka Soomaaliyeed.',
  'Xafiiska horudhaca ah ayaa xiraa fiidkii.',
  'Soonku wuxuu bilaabmaa bisheeda Ramadaan.',
  'Geesiga Soomaaliyeed wuxuu caan ku yahay aduunka oo dhan.',
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

const SURNAMES = ['Axmed', 'Xasan', 'Cabdi', 'Faadumo', 'Xaawo', 'Ayuub', 'Yacquub', 'Sumaya', 'Hodan', 'Keyse', 'Saciid', 'Nagasso']
const COUNTRIES = ['Somalia', 'Kenya', 'Ethiopia', 'Djibouti', 'UK', 'USA', 'Canada', 'Sweden', 'Norway', 'Finland', 'Netherlands']
const GENDERS = ['male', 'female']
const AGES = ['13-17', '18-29', '30-49', '50-64', '65+']
const STATUSES = ['accepted', 'accepted', 'accepted', 'rejected', 'pending', 'accepted']

function makeUsers(count) {
  const users = []
  for (let i = 0; i < count; i++) {
    users.push({
      id: `u-${i + 1}`,
      username: `${SURNAMES[rng(0, SURNAMES.length - 1)]} ${SURNAMES[rng(0, SURNAMES.length - 1)]}`,
      email: `user${i + 1}@caawiye.so`,
      country: COUNTRIES[rng(0, COUNTRIES.length - 1)],
      language: 'Somali',
      role: i === 0 ? 'admin' : 'member',
      photo: null,
      bio: '',
      joined_at: new Date(2024 + rng(0, 2), rng(0, 11), rng(1, 28)).toISOString(),
      total_submissions: 0,
      accepted: 0,
      rejected: 0,
    })
  }
  return users
}

export function makeDatasets(users, total) {
  const now = Date.now()
  return Array.from({ length: total }, (_, i) => {
    const u = users[rng(0, users.length - 1)]
    u.total_submissions += 1
    const status = STATUSES[rng(0, STATUSES.length - 1)]
    if (status === 'accepted') u.accepted += 1
    if (status === 'rejected') u.rejected += 1
    return {
      id: `d-${i + 1}`,
      sentence: SOMALI_SENTENCES[rng(0, SOMALI_SENTENCES.length - 1)],
      user_id: u.id,
      username: u.username,
      audio_url: null,
      duration: Math.round((rng(2, 7) + rng(0, 9) / 10) * 100) / 100,
      noise: rng(1, 5),
      gender: GENDERS[rng(0, GENDERS.length - 1)],
      age_group: AGES[rng(0, AGES.length - 1)],
      device: ['Desktop', 'Mobile'][rng(0, 1)],
      browser: ['Chrome', 'Firefox', 'Safari'][rng(0, 2)],
      status,
      created_at: new Date(now - rng(0, 600) * 86400000).toISOString(),
    }
  })
}

export const seedSentences = SOMALI_SENTENCES.map((text, i) => ({
  id: `s-${i + 1}`,
  text,
  language: 'so',
  category: 'general',
  difficulty: 'easy',
  is_recorded: false,
}))

export const seedUsers = makeUsers(28)

export const seedDatasets = makeDatasets(seedUsers, 620)

export function computeSeedStats() {
  const stats = {
    totalDatasets: seedDatasets.length,
    accepted: 0,
    rejected: 0,
    pending: 0,
    contributors: seedUsers.length,
    totalSentences: SOMALI_SENTENCES.length,
    goal: 1000000,
  }
  for (const d of seedDatasets) {
    if (d.status === 'accepted') stats.accepted += 1
    else if (d.status === 'rejected') stats.rejected += 1
    else stats.pending += 1
  }
  return stats
}
