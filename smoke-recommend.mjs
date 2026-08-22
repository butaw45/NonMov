// Smoke node untuk src/lib/recommend.js — verifikasi murni tanpa framework
// Jalankan: node --input-type=module smoke-recommend.mjs
// Expected: gagal jika recommend.js belum ada, PASS setelah implementasi

import { collectSeeds, scoreRecommendations } from './src/lib/recommend.js'

// Test: collectSeeds — history bobot > watchlist, diversifikasi tipe
const wl = [{ id: 1, type: 'movie', title: 'A', addedAt: 100 }, { id: 4, type: 'movie', title: 'D', addedAt: 150 }]
const hi = [{ id: 2, type: 'tv', title: 'B', updatedAt: 200 }]
const seeds = collectSeeds(wl, hi, 3)
console.log('seeds', seeds)
console.assert(seeds.length === 3, 'harus 3 seed')
console.assert(seeds[0].type === 'tv', 'history bobot > watchlist: tv harus pertama')
console.assert(new Set(seeds.map(s => s.type)).size >= 2, `seeds harus campuran tipe, bukan ${JSON.stringify(seeds.map(s => s.type))}`)

// Test: scoreRecommendations — vote_average/10 + dedup + exclude
const res = scoreRecommendations(
  [
    { seed: {}, results: [{ id: 9, media_type: 'movie', poster_path: '/x', vote_average: 80 }] },
    { seed: {}, results: [{ id: 9, media_type: 'movie', poster_path: '/x', vote_average: 80 }] },
  ],
  new Set(['movie:1']), // exclude movie:1
  20,
)
console.log('reco', res.map((r) => r.id))
console.assert(res.length === 1, 'harus dedup: 1 item dari 2 seed identik')
console.assert(res[0].id === 9, 'id harus 9')

// Test: exclude + no poster → dibuang
const res2 = scoreRecommendations(
  [
    { seed: {}, results: [
      { id: 1, media_type: 'movie', poster_path: null },          // no poster → dibuang
      { id: 2, media_type: 'movie', poster_path: '/y', vote_average: 50 },
    ]},
  ],
  new Set(['movie:2']), // exclude movie:2
)
console.assert(res2.length === 0, `harus kosong: 1 no-poster, 1 excluded, got ${res2.length}`)

console.log('\n✓ Semua assertion lulus')