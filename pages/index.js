import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { generateCVPDF, generateCoverLetterPDF } from '../utils/documentGenerator'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import PipelineStrip from '../components/PipelineStrip'
import Head from 'next/head'
import { Send, MessageSquare, Trophy, ListChecks, ExternalLink } from 'lucide-react'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [applyingId, setApplyingId] = useState(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        fetchData(session.user.id)
      }
    })
  }, [router])

  async function fetchData(userId) {
    setLoading(true)
    try {
      const [{ data: profileData }, { data: jobsData }, { data: appsData }] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase
          .from('applications')
          .select('*, jobs(*)')
          .eq('user_id', userId)
          .order('applied_date', { ascending: false }),
      ])
      setProfile(profileData || null)
      setJobs(jobsData || [])
      setApplications(appsData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function markAsApplied(job) {
    if (!profile || !profile.name) {
      alert('Add your name and resume details on the Profile page first — your CV needs that info.')
      router.push('/profile')
      return
    }

    setApplyingId(job.id)
    try {
      const { data: existing } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', user.id)
        .eq('job_id', job.id)
        .maybeSingle()

      if (existing) {
        alert('You already applied to this job.')
        return
      }

      const { error: insertError } = await supabase.from('applications').insert({
        user_id: user.id,
        job_id: job.id,
        status: 'applied',
        applied_date: new Date().toISOString(),
      })
      if (insertError) throw insertError

      await supabase.from('jobs').update({ is_applied: true }).eq('id', job.id)

      generateCVPDF(profile, job).save(`CV_${safeName(job.company)}.pdf`)
      generateCoverLetterPDF(profile, job).save(`CoverLetter_${safeName(job.company)}.pdf`)

      fetchData(user.id)
    } catch (err) {
      alert(`Error applying: ${err.message}`)
    } finally {
      setApplyingId(null)
    }
  }

  const pipelineCounts = {
    new: jobs.filter((j) => !j.is_applied).length,
    applied: applications.filter((a) => a.status === 'applied').length,
    interview: applications.filter((a) => a.status === 'interview').length,
    offer: applications.filter((a) => a.status === 'offer').length,
  }

  if (!user) return null

  return (
    <Layout>
      <Head>
        <title>Dashboard · Job Application System</title>
      </Head>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <p className="font-mono text-xs text-slate mb-2 tracking-wide">DASHBOARD</p>
        <h1 className="text-2xl font-semibold mb-6">Your pipeline</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard icon={Send} label="Applied" value={applications.length} color="text-stageApplied" />
          <StatCard
            icon={MessageSquare}
            label="Interviews"
            value={pipelineCounts.interview}
            color="text-stageInterview"
          />
          <StatCard icon={Trophy} label="Offers" value={pipelineCounts.offer} color="text-stageOffer" />
          <StatCard icon={ListChecks} label="Open jobs" value={pipelineCounts.new} color="text-slate" />
        </div>

        <PipelineStrip counts={pipelineCounts} />

        <section className="mb-10">
          <h2 className="text-sm font-semibold text-slate mb-3 tracking-wide">NEW JOBS</h2>
          {loading ? (
            <p className="text-sm text-slate">Loading…</p>
          ) : jobs.filter((j) => !j.is_applied).length === 0 ? (
            <EmptyState
              title="No new jobs yet"
              body="Your scraper/API job runs weekly. Trigger it manually from Supabase to pull in listings now."
            />
          ) : (
            <div className="space-y-3">
              {jobs
                .filter((j) => !j.is_applied)
                .map((job) => (
                  <div
                    key={job.id}
                    className="bg-white border border-line rounded-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-shadow hover:shadow-md"
                  >
                    <div>
                      <h3 className="font-medium text-ink">{job.title}</h3>
                      <p className="text-sm text-slate">
                        {job.company} · {job.location}
                      </p>
                      {job.salary && (
                        <p className="text-sm text-stageOffer font-mono">{job.salary}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-signal hover:text-signalDark underline inline-flex items-center gap-1"
                      >
                        View <ExternalLink size={13} />
                      </a>
                      <button
                        onClick={() => markAsApplied(job)}
                        disabled={applyingId === job.id}
                        className="text-sm bg-signal hover:bg-signalDark text-white px-3 py-1.5 rounded-card transition-colors disabled:opacity-50"
                      >
                        {applyingId === job.id ? 'Generating…' : 'Apply'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate mb-3 tracking-wide">
            APPLICATIONS {applications.length > 0 && `(${applications.length})`}
          </h2>
          {applications.length === 0 ? (
            <EmptyState title="No applications yet" body="Apply to a job above to start tracking it here." />
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="bg-white border border-line rounded-card p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-medium">{app.jobs?.title || 'Unknown role'}</h3>
                      <p className="text-sm text-slate">
                        {app.jobs?.company} · {app.jobs?.location}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="text-xs text-slate font-mono mt-2">
                    Applied {new Date(app.applied_date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}

function StatusBadge({ status }) {
  const map = {
    applied: 'bg-stageApplied/15 text-stageApplied',
    interview: 'bg-stageInterview/15 text-stageInterview',
    offer: 'bg-stageOffer/15 text-stageOffer',
    rejected: 'bg-stageRejected/15 text-stageRejected',
  }
  return (
    <span className={`text-xs font-mono px-2 py-1 rounded ${map[status] || 'bg-line text-slate'}`}>
      {status}
    </span>
  )
}

function EmptyState({ title, body }) {
  return (
    <div className="border border-dashed border-line rounded-card p-6 text-center">
      <p className="font-medium text-ink text-sm">{title}</p>
      <p className="text-sm text-slate mt-1">{body}</p>
    </div>
  )
}

function safeName(name) {
  return (name || 'company').replace(/\s+/g, '_')
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white border border-line rounded-card p-4 flex items-center gap-3">
      <div className={`shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xl font-semibold font-mono leading-none">{value}</p>
        <p className="text-xs text-slate mt-1">{label}</p>
      </div>
    </div>
  )
}
