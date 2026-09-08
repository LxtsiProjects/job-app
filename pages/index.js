import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { generateCVPDF, generateCoverLetterPDF } from '../utils/documentGenerator'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import PipelineStrip from '../components/PipelineStrip'
import Head from 'next/head'
import { Send, MessageSquare, Trophy, ListChecks, ExternalLink, RefreshCw, Check } from 'lucide-react'

const STATUS_COLUMNS = [
  { key: 'applied', label: 'Applied', color: 'border-stageApplied', text: 'text-stageApplied' },
  { key: 'interview', label: 'Interview', color: 'border-stageInterview', text: 'text-stageInterview' },
  { key: 'offer', label: 'Offer', color: 'border-stageOffer', text: 'text-stageOffer' },
  { key: 'rejected', label: 'Rejected', color: 'border-stageRejected', text: 'text-stageRejected' },
]

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [applyingId, setApplyingId] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
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

  async function refreshListings() {
    setRefreshing(true)
    try {
      const { data, error } = await supabase.functions.invoke('scrape_jobs')
      if (error) throw error
      await fetchData(user.id)
      alert(`Found ${data?.jobs_found ?? 0} listings this run.`)
    } catch (err) {
      alert(`Couldn't refresh listings: ${err.message}`)
    } finally {
      setRefreshing(false)
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

  async function updateStatus(applicationId, newStatus) {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId)
      if (error) throw error
      fetchData(user.id)
    } catch (err) {
      alert(`Couldn't update status: ${err.message}`)
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate tracking-wide">THIS WEEK'S LISTINGS</h2>
            <button
              onClick={refreshListings}
              disabled={refreshing}
              className="text-xs inline-flex items-center gap-1.5 border border-line px-3 py-1.5 rounded-card hover:bg-line/40 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh listings'}
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-slate">Loading…</p>
          ) : jobs.length === 0 ? (
            <EmptyState
              title="No listings yet"
              body="Click Refresh listings above to pull in jobs now, or wait for the weekly automatic run."
            />
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`border rounded-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-shadow ${
                    job.is_applied
                      ? 'bg-paper border-line opacity-60'
                      : 'bg-white border-line hover:shadow-md'
                  }`}
                >
                  <div>
                    <h3 className={`font-medium ${job.is_applied ? 'text-slate' : 'text-ink'}`}>
                      {job.title}
                    </h3>
                    <p className="text-sm text-slate">
                      {job.company} · {job.location}
                    </p>
                    {job.salary && !job.is_applied && (
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
                    {job.is_applied ? (
                      <span className="text-sm inline-flex items-center gap-1 text-slate font-mono px-3 py-1.5">
                        <Check size={14} /> Applied
                      </span>
                    ) : (
                      <button
                        onClick={() => markAsApplied(job)}
                        disabled={applyingId === job.id}
                        className="text-sm bg-signal hover:bg-signalDark text-white px-3 py-1.5 rounded-card transition-colors disabled:opacity-50"
                      >
                        {applyingId === job.id ? 'Generating…' : 'Apply'}
                      </button>
                    )}
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STATUS_COLUMNS.map((col) => {
                const items = applications.filter((a) => a.status === col.key)
                return (
                  <div key={col.key} className={`border-t-2 ${col.color} pt-3`}>
                    <p className={`text-xs font-mono mb-2 ${col.text}`}>
                      {col.label} · {items.length}
                    </p>
                    <div className="space-y-2">
                      {items.map((app) => (
                        <div key={app.id} className="bg-white border border-line rounded-card p-3">
                          <h4 className="text-sm font-medium leading-tight">
                            {app.jobs?.title || 'Unknown role'}
                          </h4>
                          <p className="text-xs text-slate mt-0.5">{app.jobs?.company}</p>
                          <select
                            value={app.status}
                            onChange={(e) => updateStatus(app.id, e.target.value)}
                            className="mt-2 w-full text-xs border border-line rounded px-1.5 py-1 bg-paper"
                          >
                            {STATUS_COLUMNS.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <p className="text-xs text-slate italic">Nothing here yet</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
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
