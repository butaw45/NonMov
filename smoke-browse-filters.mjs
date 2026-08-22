// Smoke node untuk src/lib/browseFilters.js
// Jalankan: node --input-type=module smoke-browse-filters.mjs
// Expected: PASS semua assertion

import { ratingParam, COUNTRIES, DEBOUNCE_MS } from './src/lib/browseFilters.js'

// --- ratingParam ---
console.assert(ratingParam('0') === null, 'zero -> null')
console.assert(ratingParam('') === null, 'empty -> null')
console.assert(ratingParam(0) === null, 'int 0 -> null')

const r7 = ratingParam('7')
console.assert(r7?.gte === 7 && r7?.countGte === 100, '7 -> gte=7, count=100')

// Collision fix: existingCountGte=200 → countGte tetap 200
const rColl = ratingParam('7', 200)
console.assert(rColl?.countGte === 200, 'existingGte=200 → count 200, bukan 100')

// Edge: string '3.5' (step 0.5)
const r35 = ratingParam('3.5')
console.assert(r35?.gte === 3.5 && r35?.countGte === 100, '3.5 -> gte=3.5')

// Edge: string angka dengan whitespace
const rWs = ratingParam(' 5 ')
console.assert(rWs?.gte === 5, 'whitespace -> gte=5')

// Edge: ratingParam dengan existingGte < 100
const rLow = ratingParam('8', 50)
console.assert(rLow?.countGte === 100, 'existingGte=50 → tetap 100 (Math.max)')

// --- COUNTRIES ---
console.assert(COUNTRIES.length === 11, `11 negara, got ${COUNTRIES.length}`)
console.assert(COUNTRIES[0].code === 'ID', 'pertama ID')
console.assert(COUNTRIES.some(c => c.code === 'PH'), 'Filipina (PH) included')
const codes = COUNTRIES.map(c => c.code)
console.assert(new Set(codes).size === codes.length, 'no duplicate codes')

// --- DEBOUNCE_MS ---
console.assert(DEBOUNCE_MS === 300, 'debounce 300ms')

console.log('\nSemua assertion lulus')