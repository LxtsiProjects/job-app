// Turns a simple, human-editable text format into structured resume data.
// Used so personal resume content lives in the database (typed into the
// Profile page), never hardcoded into source files.
//
// Block format (experience, education, projects) — blocks separated by
// a line containing only "---":
//   Title | Org | Location | Start | End
//   - bullet one
//   - bullet two
//   Ref: Name, phone            (optional, experience only)
//
// Skills format — one category per line:
//   Programming Languages: C#, C++, HTML, CSS, SQL

export function parseBlocks(text) {
  if (!text) return []
  return text
    .split(/\n\s*---\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
      const [headerLine, ...rest] = lines
      const hasPipe = headerLine.includes('|')
      const [title, org, location, start, end] = hasPipe
        ? headerLine.split('|').map((s) => s?.trim() || '')
        : [headerLine, '', '', '', '']

      const bullets = []
      let reference = null
      for (const line of rest) {
        if (/^ref:/i.test(line)) {
          reference = line.replace(/^ref:/i, '').trim()
        } else {
          // Lenient: any other line counts as a bullet, dash or not,
          // so content never silently vanishes if the format isn't exact.
          bullets.push(line.replace(/^[-•]\s*/, ''))
        }
      }

      return { title, org, location, start, end, bullets, reference }
    })
}

export function parseSkills(text) {
  if (!text) return []
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':')
      if (idx === -1) return { category: line, items: [] }
      return {
        category: line.slice(0, idx).trim(),
        items: line
          .slice(idx + 1)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
    })
}

export function dateRange(start, end) {
  return [start, end].filter(Boolean).join(' – ')
}
