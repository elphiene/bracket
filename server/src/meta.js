// Per-route <head> meta injection. Social/link-preview scrapers don't run JS, so
// title/description/OpenGraph tags must be in the served HTML. The Express server
// already knows every sport's config, so it swaps the HEAD-META block in the built
// index.html per route — no SSR framework needed. See server.js's SPA fallback.
import { getSport } from './sports/index.js'

const SITE_NAME = 'Live Brackets'

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// The region in client/index.html between these markers is replaced wholesale.
export const HEAD_META_RE = /<!-- HEAD-META[\s\S]*?\/HEAD-META -->/

export function buildHead({ title, description, url, image, type = 'website' }) {
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="${esc(type)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ].join('\n    ')
  return `<!-- HEAD-META -->\n    ${tags}\n    <!-- /HEAD-META -->`
}

// Resolve a request path to its route meta. `/` (and any unknown slug) → the hub;
// `/:slug` → that edition, derived from its config.
export function routeMeta(pathname, origin) {
  const image = `${origin}/og-default.png`
  const slug = pathname.replace(/^\/+/, '').split('/')[0]
  const sport = slug ? getSport(slug) : null

  if (!sport) {
    return {
      title: `${SITE_NAME} — live knockout brackets in one place`,
      description: "Follow every knockout tournament's bracket live — World Cup, Wimbledon, the Australian Open, AFL finals and more. No sign-in, no clutter.",
      url: `${origin}/`,
      image,
    }
  }

  const c = sport.config
  const sportWord = c.sport || 'knockout'
  const sub = c.subtitle ? ` (${c.subtitle})` : ''
  return {
    title: `${c.name} — live bracket`,
    description: `Follow the ${c.name}${sub} ${sportWord} bracket live — scores, results and who's through, updated as it happens.`,
    url: `${origin}/${slug}`,
    image,
  }
}
