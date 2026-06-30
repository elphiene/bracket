import express from 'express'
import cors from 'cors'
import { getMatches, getLiveMatches, getGroups } from './proxy.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/matches', getMatches)
app.get('/api/live', getLiveMatches)
app.get('/api/groups', getGroups)

app.listen(PORT, () => console.log(`bracket-server on :${PORT}`))
