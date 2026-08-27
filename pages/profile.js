import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { generateCVPDF } from '../utils/documentGenerator'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import Head from 'next/head'

const EMPTY_PROFILE = {
  name: '',
  headline: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  objective: '',
  experience_text: '',
  education_text: '',
  skills_text: '',
  projects_text: '',
}

const PLACEHOLDERS = {
  experience_text:
    'Role | Company | Location | Start | End\n- What you did, in one line\n- Another responsibility\n---\nPrevious Role | Company | Location | Start | End\n- Bullet point',
  education_text:
    'Degree | Institution | Location | Start | End\n- Relevant modules or achievements',
  skills_text: 'Programming Languages: C#, HTML, CSS, SQL\nTools: Visual Studio, Git',
  projects_text:
    'Project Name | Context/Company | Start | End\n- What the project involved\n- Impact or result',
}

export default function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        fetchProfile(session.user.id, session.user.email)
      }
    })
  }, [router])

  async function fetchProfile(userId, email) {
    setLoading(true)
    try {
      const { data } = await supabase.from('users').select('*').eq('id', userId).single()
      setProfile(data ? { ...EMPTY_PROFILE, ...data } : { ...EMPTY_PROFILE, email })
    } catch {
      setProfile({ ...EMPTY_PROFILE, email })
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .upsert({ id: user.id, ...profile }, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      setProfile({ ...EMPTY_PROFILE, ...data })
      alert('Profile saved.')
    } catch (err) {
      alert(`Error saving profile: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  function previewCV() {
    const doc = generateCVPDF(profile)
    const blobUrl = doc.output('bloburl')
    window.open(blobUrl, '_blank')
  }

  function update(field, value) {
    setProfile((p) => ({ ...p, [field]: value }))
  }

  if (!user || loading) return null

  return (
    <Layout>
      <Head>
        <title>Your Profile</title>
      </Head>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <p className="font-mono text-xs text-slate mb-2 tracking-wide">02 · PROFILE</p>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Your Resume Data</h1>
            <p className="text-sm text-slate mt-1 max-w-md">
              This is stored in your database, not in the app&apos;s source code — safe to fill in
              real contact details even though this project is on GitHub.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={previewCV}
              className="text-sm border border-line px-3 py-2 rounded-card hover:bg-line/40 transition-colors"
            >
              Preview CV
            </button>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="text-sm bg-signal hover:bg-signalDark text-white px-4 py-2 rounded-card transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <section className="bg-white border border-line rounded-card p-6 mb-4">
          <h2 className="font-mono text-xs text-slate mb-4 tracking-wide">CONTACT</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" value={profile.name} onChange={(v) => update('name', v)} />
            <Field
              label="Headline (shown under your name)"
              value={profile.headline}
              onChange={(v) => update('headline', v)}
            />
            <Field label="Email" value={profile.email} onChange={(v) => update('email', v)} readOnly />
            <Field label="Phone" value={profile.phone} onChange={(v) => update('phone', v)} />
            <Field label="Location" value={profile.location} onChange={(v) => update('location', v)} />
            <Field
              label="LinkedIn"
              value={profile.linkedin}
              onChange={(v) => update('linkedin', v)}
            />
          </div>
        </section>

        <section className="bg-white border border-line rounded-card p-6 mb-4">
          <h2 className="font-mono text-xs text-slate mb-3 tracking-wide">OBJECTIVE</h2>
          <TextArea
            value={profile.objective}
            onChange={(v) => update('objective', v)}
            rows={4}
            placeholder="A short summary of what you're looking for and what you bring."
          />
        </section>

        <TextBlockSection
          title="WORK EXPERIENCE"
          hint="One block per role, most recent first. Separate roles with a line containing only ---"
          value={profile.experience_text}
          placeholder={PLACEHOLDERS.experience_text}
          onChange={(v) => update('experience_text', v)}
        />

        <TextBlockSection
          title="EDUCATION"
          hint="Same format as work experience."
          value={profile.education_text}
          placeholder={PLACEHOLDERS.education_text}
          onChange={(v) => update('education_text', v)}
        />

        <TextBlockSection
          title="SKILLS"
          hint="One category per line: Category: item, item, item"
          value={profile.skills_text}
          placeholder={PLACEHOLDERS.skills_text}
          onChange={(v) => update('skills_text', v)}
        />

        <TextBlockSection
          title="PROJECTS"
          hint="Same block format as work experience."
          value={profile.projects_text}
          placeholder={PLACEHOLDERS.projects_text}
          onChange={(v) => update('projects_text', v)}
        />
      </div>
    </Layout>
  )
}

function Field({ label, value, onChange, readOnly = false }) {
  return (
    <label className="block">
      <span className="text-xs text-slate">{label}</span>
      <input
        type="text"
        value={value || ''}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 block w-full border border-line rounded-card px-3 py-2 text-sm ${
          readOnly ? 'bg-paper text-slate' : 'bg-white'
        }`}
      />
    </label>
  )
}

function TextArea({ value, onChange, rows, placeholder }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="block w-full border border-line rounded-card px-3 py-2 text-sm font-mono leading-relaxed"
    />
  )
}

function TextBlockSection({ title, hint, value, placeholder, onChange }) {
  return (
    <section className="bg-white border border-line rounded-card p-6 mb-4">
      <h2 className="font-mono text-xs text-slate mb-1 tracking-wide">{title}</h2>
      <p className="text-xs text-slate mb-3">{hint}</p>
      <TextArea value={value} onChange={onChange} rows={7} placeholder={placeholder} />
    </section>
  )
}
