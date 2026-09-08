import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { generateCVPDF, generateCoverLetterPDF } from '../utils/documentGenerator'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import PipelineStrip from '../components/PipelineStrip'
import Head from 'next/head'
import {
  Send,
  MessageSquare,
  Trophy,
  ListChecks,
  ExternalLink,
  RefreshCw,
  Check,
  Briefcase,
  Kanban,
  Inbox,
} from 'lucide-react'

const STATUS_COLUMNS = [
  { key: 'applied', label: 'Applied', text: 'text-stageApplied', bg: 'bg-stageApplied/5', border: 'border-stageApplied/30' },
  { key: 'interview', label: 'Interview', text: 'text-stageInterview', bg: 'bg-stageInterview/5', border: 'border-stageInterview/30' },
  { key: 'offer', label: 'Offer', text: 'text-stageOffer', bg: 'bg-stageOffer/5', border: 'border-stageOffer/30' },
  { key: 'rejected', label: 'Rejected', text: 'text-stageRejected', bg: 'bg-stageRejected/5', border: 'border-stageRejected/30' },
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
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-10">
        <p className="font-mono text-xs text-slate mb-2 tracking-widest">DASHBOARD</p>
        <h1 className="text-3xl font-semibold mb-8 tracking-tight">Your pipeline</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <StatCard icon={Send} label="Applied" value={applications.length} color="text-stageApplied" bg="bg-stageApplied/10" />
          <StatCard
            icon={MessageSquare}
            label="Interviews"
            value={pipelineCounts.interview}
            color="text-stageInterview"
            bg="bg-stageInterview/10"
          />
          <StatCard icon={Trophy} label="Offers" value={pipelineCounts.offer} color="text-stageOffer" bg="bg-stageOffer/10" />
          <StatCard icon={ListChecks} label="Open jobs" value={pipelineCounts.new} color="text-signal" bg="bg-signal/10" />
        </div>

        <div className="bg-white border border-line rounded-2xl p-6 mb-10">
          <PipelineStrip counts={pipelineCounts} />
        </div>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <SectionHeading icon={Briefcase} eyebrow="LISTINGS" title="This week's roles" />
            <button
              onClick={refreshListings}
              disabled={refreshing}
              className="text-xs font-medium inline-flex items-center gap-1.5 border border-line bg-white px-3.5 py-2 rounded-card hover:bg-paper transition-colors disabled:opacity-50 shadow-sm"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh listings'}
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-slate">Loading…</p>
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No listings yet"
              body="Click Refresh listings above to pull in jobs now, or wait for the weekly automatic run."
            />
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`border-l-4 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all ${
                    job.is_applied
                      ? 'bg-paper border-line opacity-60'
                      : 'bg-white border-signal shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="min-w-0">
                    <h3 className={`font-semibold ${job.is_applied ? 'text-slate' : 'text-ink'}`}>
                      {job.title}
                    </h3>
                    <p className="text-sm text-slate mt-0.5">
                      {job.company} · {job.location}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {job.salary && !job.is_applied && (
                        <span className="text-xs font-mono bg-stageOffer/10 text-stageOffer px-2 py-0.5 rounded-full">
                          {job.salary}
                        </span>
                      )}
                      {job.source && (
                        <span className="text-xs font-mono bg-line text-slate px-2 py-0.5 rounded-full">
                          {job.source}
                        </span>
                      )}
                    </div>
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
                        className="text-sm bg-signal hover:bg-signalDark text-white font-medium px-4 py-2 rounded-card transition-colors disabled:opacity-50 shadow-sm"
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
          <SectionHeading
            icon={Kanban}
            eyebrow="TRACKER"
            title="Applications"
            trailing={applications.length > 0 ? `${applications.length} total` : null}
          />
          <div className="mt-4">
            {applications.length === 0 ? (
              <EmptyState icon={Inbox} title="No applications yet" body="Apply to a job above to start tracking it here." />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {STATUS_COLUMNS.map((col) => {
                  const items = applications.filter((a) => a.status === col.key)
                  return (
                    <div key={col.key} className={`rounded-2xl border ${col.border} ${col.bg} p-3`}>
                      <div className="flex items-center justify-between mb-3 px-1">
                        <p className={`text-xs font-semibold tracking-wide ${col.text}`}>{col.label}</p>
                        <span className={`text-xs font-mono px-1.5 rounded-full bg-white ${col.text}`}>
                          {items.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.map((app) => (
                          <div key={app.id} className="bg-white border border-line rounded-card p-3 shadow-sm">
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
                          <p className="text-xs text-slate italic px-1">Nothing here yet</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  )
}

function SectionHeading({ icon: Icon, eyebrow, title, trailing }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-mono text-xs text-slate tracking-widest mb-1">{eyebrow}</p>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Icon size={18} className="text-signal" />
          {title}
        </h2>
      </div>
      {trailing && <span className="text-sm text-slate font-mono">{trailing}</span>}
    </div>
  )
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="border border-dashed border-line rounded-2xl p-10 text-center bg-white">
      {Icon && <Icon size={28} className="mx-auto text-slate mb-3" />}
      <p className="font-medium text-ink text-sm">{title}</p>
      <p className="text-sm text-slate mt-1">{body}</p>
    </div>
  )
}

function safeName(name) {
  return (name || 'company').replace(/\s+/g, '_')
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-white border border-line rounded-2xl p-5 flex items-center gap-4 shadow-sm">
      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${bg} ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-semibold font-mono leading-none">{value}</p>
        <p className="text-xs text-slate mt-1.5">{label}</p>
      </div>
    </div>
  )
}
