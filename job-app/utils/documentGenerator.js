import { jsPDF } from 'jspdf'
import { parseBlocks, parseSkills, dateRange } from './resumeParser'

const MARGIN = 20
const TEXT_WIDTH = 210 - MARGIN * 2

function heading(doc, text, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(text.toUpperCase(), MARGIN, y)
  doc.setDrawColor(180)
  doc.line(MARGIN, y + 1.5, 210 - MARGIN, y + 1.5)
  return y + 7
}

function wrapped(doc, text, y, opts = {}) {
  const { fontSize = 10.5, lineHeight = 5, style = 'normal', indent = 0 } = opts
  doc.setFont('helvetica', style)
  doc.setFontSize(fontSize)
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

/**
 * Builds an ATS-friendly, single-column CV PDF from structured profile data.
 * profile fields (all plain text, typed into the Profile page — never
 * hardcoded into source):
 *   name, email, phone, location, linkedin, objective,
 *   experience_text, education_text, skills_text, projects_text
 * (experience_text / education_text / projects_text use the block format,
 * skills_text uses the "Category: item, item" format — see resumeParser.js)
 */
export function generateCVPDF(profile) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text(profile.name || 'Your Name', MARGIN, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  const contact = [profile.email, profile.phone, profile.location, profile.linkedin]
    .filter(Boolean)
    .join('   ')
  doc.text(contact, MARGIN, y)
  y += 9

  if (profile.objective) {
    y = heading(doc, 'Objective', y)
    y = wrapped(doc, profile.objective, y)
    y += 5
  }

  const experience = parseBlocks(profile.experience_text)
  if (experience.length) {
    y = heading(doc, 'Work Experience', y)
    for (const role of experience) {
      y = checkPageBreak(doc, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.text(`${role.title}${role.org ? ', ' + role.org : ''}`, MARGIN, y)
      const range = dateRange(role.start, role.end)
      if (range) {
        doc.setFont('helvetica', 'normal')
        doc.text(range, 210 - MARGIN, y, { align: 'right' })
      }
      y += 5
      if (role.location) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9.5)
        doc.text(role.location, MARGIN, y)
        y += 5
      }
      for (const bullet of role.bullets) {
        y = checkPageBreak(doc, y)
        y = wrapped(doc, `•  ${bullet}`, y, { indent: 2 })
      }
      if (role.reference) {
        y = wrapped(doc, `Reference: ${role.reference}`, y, { fontSize: 9, style: 'italic' })
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
      doc.text(`${edu.title}${edu.org ? ', ' + edu.org : ''}`, MARGIN, y)
      const range = dateRange(edu.start, edu.end)
      if (range) {
        doc.setFont('helvetica', 'normal')
        doc.text(range, 210 - MARGIN, y, { align: 'right' })
      }
      y += 5
      if (edu.location) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9.5)
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
      y = wrapped(doc, `${group.category}: ${group.items.join(', ')}`, y)
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
      doc.text(`${proj.title}${proj.org ? ', ' + proj.org : ''}`, MARGIN, y)
      const range = dateRange(proj.start, proj.end)
      if (range) {
        doc.setFont('helvetica', 'normal')
        doc.text(range, 210 - MARGIN, y, { align: 'right' })
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
  doc.text(profile.name || 'Your Name', MARGIN, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const contactLine = [profile.location, profile.email, profile.phone].filter(Boolean).join('  ·  ')
  doc.text(contactLine, MARGIN, y)
  y += 10
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

  const body = `Dear Hiring Manager,

I am writing to apply for the ${job.title || 'advertised'} position at ${job.company || 'your company'}. ${profile.objective || ''}

${profile.cover_letter_note ? profile.cover_letter_note + '\n\n' : ''}I have attached my CV for your review and would welcome the opportunity to discuss how my background fits this role.

Thank you for your time and consideration.

Best regards,
${profile.name || ''}`

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  wrapped(doc, body, y, { fontSize: 11, lineHeight: 6 })

  return doc
}
