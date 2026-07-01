import express from 'express'
import cors from 'cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { getMatches, getLiveMatches, getGroups, getTeams } from './proxy.js'
import { getConfig } from './sports/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '../../client/dist')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/config', (req, res) => res.json(getConfig()))
app.get('/api/matches', getMatches)
app.get('/api/live', getLiveMatches)
app.get('/api/groups', getGroups)
app.get('/api/teams', getTeams)

// Serve built client if dist exists
if (existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get('*', (req, res) => res.sendFile(join(DIST, 'index.html')))
}

app.listen(PORT, () => console.log(`bracket on :${PORT}`))
