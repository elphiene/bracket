const configs = {
  wc2026: {
    name: 'World Cup 2026',
    subtitle: 'Knockout Stage',
    sport: 'football',
    accentColor: '#f7b731',
    hasGroups: true,
    hasThirdPlace: true,
  },
}

export function getConfig() {
  return configs[process.env.ACTIVE_SPORT ?? 'wc2026'] ?? configs.wc2026
}
