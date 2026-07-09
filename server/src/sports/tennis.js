// Wimbledon (ATP men's singles) — a thin edition over the shared tennis factory.
// Windowed to late June–mid July so it shows the live draw in season and the
// most-recent completed draw out of season. Slug stays `tennis` (already routed
// and linked in prod).
import { createTennisEdition } from './tennisEdition.js'

const edition = createTennisEdition({
  slug: 'tennis',
  name: 'Wimbledon',
  accentColor: '#57a773', // grass green
  tour: 'atp',
  window: { from: '06-20', to: '07-16' },
})

export const config = edition.config
export const adapter = edition.adapter
