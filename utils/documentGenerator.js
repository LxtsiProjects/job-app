import { jsPDF } from 'jspdf'
import { parseBlocks, parseSkills, dateRange } from './resumeParser'

const MARGIN = 20
const PAGE_WIDTH = 210
const TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2
const INK = [20, 26, 46]        // matches app's --ink token
const SIGNAL = [36, 84, 232]    // matches app's --signal token
const SLATE = [99, 107, 120]

function heading(doc, text, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(...INK)
  doc.text(text.toUpperCase(), MARGIN, y)
  doc.setDrawColor(...SIGNAL)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, y + 1.8, PAGE_WIDTH - MARGIN, y + 1.8)
  doc.setLineWidth(0.2)
  return y + 8
}

function wrapped(doc, text, y, opts = {}) {
  const { fontSize = 10, lineHeight = 5, style = 'normal', indent = 0, color = INK } = opts
  doc.setFont('helvetica', style)
  doc.setFontSize(fontSize)
  doc.setTextColor(...color)
  const lines = doc.splitTextToSize(text || '', TEXT_WIDTH - indent)
  doc.text(lines, MARGIN + indent, y)
  return y + lines.length * lineHeight
}

function checkPageBreak(doc, y, needed = 20) {
  if (y + needed > 285) {
    doc.addPage()
    return 20
  }
  return y
}

// --- small drawn contact icons (no external assets/fonts needed) ---
function iconPhone(doc, x, y) {
  doc.setFillColor(...SIGNAL)
  doc.circle(x, y, 1.3, 'F')
  doc.setDrawColor(255, 255, 255)
}
function iconEmail(doc, x, y) {
  doc.setFillColor(...SIGNAL)
  doc.roundedRect(x - 1.6, y - 1.1, 3.2, 2.2, 0.4, 0.4, 'F')
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.15)
  doc.line(x - 1.6, y - 1.1, x, y + 0.2)
  doc.line(x + 1.6, y - 1.1, x, y + 0.2)
  doc.setLineWidth(0.2)
}
function iconLocation(doc, x, y) {
  doc.setFillColor(...SIGNAL)
  doc.circle(x, y - 0.4, 1.1, 'F')
  doc.triangle(x - 0.9, y, x + 0.9, y, x, y + 1.4, 'F')
}
function iconLinkedIn(doc, x, y) {
  doc.setFillColor(...SIGNAL)
  doc.roundedRect(x - 1.6, y - 1.6, 3.2, 3.2, 0.5, 0.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.setTextColor(255, 255, 255)
  doc.text('in', x, y + 0.6, { align: 'center' })
}

const ICONS = { phone: iconPhone, email: iconEmail, location: iconLocation, linkedin: iconLinkedIn }

function contactRow(doc, items, y) {
  // items: [{ type, text }]
  let x = MARGIN
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  for (const item of items) {
    if (!item.text) continue
    ICONS[item.type]?.(doc, x + 1.3, y - 1)
    doc.setTextColor(...INK)
    doc.text(item.text, x + 4, y)
    x += 4 + doc.getTextWidth(item.text) + 6
  }
  return y + 7
}

/**
 * Finds skill items and short experience/project phrases that overlap
 * with a job's title/description — real, deterministic personalization
 * rather than a generic template. Returns { matched: string[] }.
 */
function findRelevantStrengths(profile, job) {
  if (!job) return { matched: [] }
  const haystack = `${job.title || ''} ${job.description || ''}`.toLowerCase()
  const skills = parseSkills(profile.skills_text).flatMap((g) => g.items)
  const matched = skills.filter((skill) => {
    const s = skill.toLowerCase().trim()
    return s.length > 1 && haystack.includes(s)
  })
  return { matched: [...new Set(matched)] }
}

/**
 * Builds an ATS-friendly CV PDF from structured profile data.
 * If `job` is passed, the objective and a "relevant strengths" line are
 * tailored to that specific listing — skills that actually appear in the
 * job's title/description are surfaced explicitly.
 */
export function generateCVPDF(profile, job = null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.setTextColor(...INK)
  doc.text(profile.name || 'Your Name', MARGIN, y)
  y += 6

  if (profile.headline) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...SIGNAL)
    doc.text(profile.headline, MARGIN, y)
    y += 6
  }

  y += 1
  y = contactRow(
    doc,
    [
      { type: 'phone', text: profile.phone },
      { type: 'email', text: profile.email },
      { type: 'location', text: profile.location },
      { type: 'linkedin', text: profile.linkedin },
    ],
    y
  )
  y += 3

  const { matched } = findRelevantStrengths(profile, job)

  if (profile.objective) {
    y = heading(doc, 'Objective', y)
    const tailoredObjective =
      job && job.title
        ? `${profile.objective} Currently applying these skills toward the ${job.title} role${
            job.company ? ' at ' + job.company : ''
          }.`
        : profile.objective
    y = wrapped(doc, tailoredObjective, y)
    y += 5
  }

  if (job && matched.length > 0) {
    y = wrapped(doc, `Relevant strengths for this role: ${matched.join(', ')}.`, y, {
      style: 'italic',
      fontSize: 9.5,
      color: SLATE,
    })
    y += 5
  }

  const experience = parseBlocks(profile.experience_text)
  if (experience.length) {
    y = heading(doc, 'Work Experience', y)
    for (const role of experience) {
      y = checkPageBreak(doc, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(...INK)
      doc.text(`${role.title}${role.org ? ', ' + role.org : ''}`, MARGIN, y)
      const range = dateRange(role.start, role.end)
      if (range) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...SLATE)
        doc.text(range, PAGE_WIDTH - MARGIN, y, { align: 'right' })
      }
      y += 5
      if (role.location) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9.5)
        doc.setTextColor(...SLATE)
        doc.text(role.location, MARGIN, y)
        y += 5
      }
      for (const bullet of role.bullets) {
        y = checkPageBreak(doc, y)
        y = wrapped(doc, `•  ${bullet}`, y, { indent: 2 })
      }
      if (role.reference) {
        y = wrapped(doc, `Reference: ${role.reference}`, y, { fontSize: 9, style: 'italic', color: SLATE })
      }
      y += 4
    }
  }

  const education = parseBlocks(profile.education_text)
  if (education.length) {
    y = checkPageBreak(doc, y)
    y = heading(doc, 'Education', y)
    for (const edu of education) {
      y = checkPageBreak(doc, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(...INK)
      doc.text(`${edu.title}${edu.org ? ', ' + edu.org : ''}`, MARGIN, y)
      const range = dateRange(edu.start, edu.end)
      if (range) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...SLATE)
        doc.text(range, PAGE_WIDTH - MARGIN, y, { align: 'right' })
      }
      y += 5
      if (edu.location) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9.5)
        doc.setTextColor(...SLATE)
        doc.text(edu.location, MARGIN, y)
        y += 5
      }
      for (const bullet of edu.bullets) {
        y = checkPageBreak(doc, y)
        y = wrapped(doc, `•  ${bullet}`, y, { indent: 2 })
      }
      y += 4
    }
  }

  const skills = parseSkills(profile.skills_text)
  if (skills.length) {
    y = checkPageBreak(doc, y)
    y = heading(doc, 'Skills', y)
    for (const group of skills) {
      y = checkPageBreak(doc, y)
      // Matched-to-this-job skills float to the front of their category.
      const items =
        job && matched.length
          ? [...group.items].sort((a, b) => matched.includes(b) - matched.includes(a))
          : group.items
      y = wrapped(doc, `${group.category}: ${items.join(', ')}`, y)
    }
    y += 4
  }

  const projects = parseBlocks(profile.projects_text)
  if (projects.length) {
    y = checkPageBreak(doc, y)
    y = heading(doc, 'Projects', y)
    for (const proj of projects) {
      y = checkPageBreak(doc, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(...INK)
      doc.text(`${proj.title}${proj.org ? ', ' + proj.org : ''}`, MARGIN, y)
      const range = dateRange(proj.start, proj.end)
      if (range) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...SLATE)
        doc.text(range, PAGE_WIDTH - MARGIN, y, { align: 'right' })
      }
      y += 5
      for (const bullet of proj.bullets) {
        y = checkPageBreak(doc, y)
        y = wrapped(doc, `•  ${bullet}`, y, { indent: 2 })
      }
      y += 4
    }
  }

  return doc
}

/**
 * Builds a cover letter PDF personalized to one job listing.
 */
export function generateCoverLetterPDF(profile, job) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 22

  const dateStr = new Date().toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...INK)
  doc.text(profile.name || 'Your Name', MARGIN, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...SLATE)
  const contactLine = [profile.location, profile.email, profile.phone].filter(Boolean).join('  ·  ')
  doc.text(contactLine, MARGIN, y)
  y += 10
  doc.setTextColor(...INK)
  doc.text(dateStr, MARGIN, y)
  y += 10
  doc.text('Hiring Manager', MARGIN, y)
  y += 5
  doc.text(job.company || '', MARGIN, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`Subject: Application for ${job.title || 'the advertised role'}`, MARGIN, y)
  y += 10

  const { matched } = findRelevantStrengths(profile, job)
  const strengthLine =
    matched.length > 0
      ? ` In particular, my experience with ${matched.slice(0, 3).join(', ')} lines up directly with what you're looking for.`
      : ''

  const body = `Dear Hiring Manager,

I am writing to apply for the ${job.title || 'advertised'} position at ${job.company || 'your company'}. ${profile.objective || ''}${strengthLine}

${profile.cover_letter_note ? profile.cover_letter_note + '\n\n' : ''}I have attached my CV for your review and would welcome the opportunity to discuss how my background fits this role.

Thank you for your time and consideration.

Best regards,
${profile.name || ''}`

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  wrapped(doc, body, y, { fontSize: 11, lineHeight: 6 })

  return doc
}
