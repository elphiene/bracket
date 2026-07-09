// Australian Open (ATP men's singles) — Melbourne, mid-to-late January. Same
// ESPN tennis shape as Wimbledon; only the calendar window and branding differ.
import { createTennisEdition } from './tennisEdition.js'

const edition = createTennisEdition({
  slug: 'ausopen',
  name: 'Australian Open',
  accentColor: '#2b7fff', // Melbourne hardcourt blue
  tour: 'atp',
  window: { from: '01-06', to: '02-02' }, // main draw starts ~Jan 12; final ~Feb 1
})

export const config = edition.config
export const adapter = edition.adapter
