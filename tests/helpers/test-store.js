import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_DIR = path.resolve(__dirname, '..', '__tmp__')

export function withTestStore(fn) {
  const tmp = path.join(TEST_DIR, `store-${Date.now()}.json`)
  fs.mkdirSync(TEST_DIR, { recursive: true })
  const initial = {
    entries: [
      { id: 1, tmdb_id: 1, title: 'Test Entry', type: 'movie', status: 'published' },
      { id: 2, tmdb_id: 2, title: 'Draft Entry', type: 'tv', status: 'draft' },
    ],
    sessions: [],
  }
  fs.writeFileSync(tmp, JSON.stringify(initial), 'utf-8')
  try {
    return fn(tmp)
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
  }
}