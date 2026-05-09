function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0
  }
  return h
}

export function topicHue(slug: string): number {
  return djb2(slug) % 360
}

/** Full-saturation color for borders and accents */
export function topicColor(slug: string): string {
  const h = topicHue(slug)
  return `hsl(${h}, 58%, 40%)`
}

/** Light tint for backgrounds */
export function topicBg(slug: string): string {
  const h = topicHue(slug)
  return `hsl(${h}, 55%, 96%)`
}
