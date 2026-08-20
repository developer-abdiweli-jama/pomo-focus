import { ArrowRight, CheckCircle2, Clock3, Target } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const today = new Intl.DateTimeFormat('en', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date())

const subgoals = [
  'Choose one meaningful task for today',
  'Complete the first focused work session',
  'Write down what distracted you',
]

function App() {
  return (
    <AppShell>
      <section className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">{today}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Build a focused day.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-400">
            One clear goal, honest sessions, and steady progress toward your
            bigger mission.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3 text-sm text-amber-200">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-lg">0</span>
          <span><strong className="font-semibold text-amber-100">day streak</strong><span className="ml-1 text-amber-200/60">so far</span></span>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-emerald-400/20 bg-linear-to-br from-emerald-500/12 via-slate-900/90 to-slate-900">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-400">
                <Target size={17} />
                <span>Today&apos;s main goal</span>
              </div>
              <h2 className="text-2xl font-semibold text-white">
                Decide what deserves your focus
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
                Your first goal will guide the sessions and subgoals you create
                for today.
              </p>
            </div>
            <span className="rounded-full border border-slate-700/80 bg-slate-950/40 px-3 py-1 text-xs text-slate-400">
              Not started
            </span>
          </div>

          <div className="mb-6 rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 p-4 transition-colors hover:border-emerald-500/30">
            <p className="text-sm text-slate-500">No goal created yet</p>
            <p className="mt-1 text-sm text-slate-300">
              A specific goal will make your first focus session easier to
              start.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button disabled>Create today&apos;s goal</Button>
            <Button disabled variant="secondary">
              Start focus session
            </Button>
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-300">
            <Clock3 size={17} className="text-sky-400" />
            <span>Focus summary</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/45 p-4">
              <p className="text-xs text-slate-500">Focus time</p>
              <p className="mt-2 text-2xl font-semibold text-white">0m</p>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/45 p-4">
              <p className="text-xs text-slate-500">Sessions</p>
              <p className="mt-2 text-2xl font-semibold text-white">0</p>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/45 p-4">
              <p className="text-xs text-slate-500">Distractions</p>
              <p className="mt-2 text-2xl font-semibold text-white">0</p>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-slate-800/45 p-4">
              <p className="text-xs text-slate-500">Daily target</p>
              <p className="mt-2 text-2xl font-semibold text-white">50m</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Monthly mission</p>
              <p className="mt-1 text-xs text-slate-500">Your bigger direction</p>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-500">
              0%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-0 rounded-full bg-emerald-400" />
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">No monthly mission yet</p>
            <Button disabled variant="ghost" className="px-2">
              Add mission <ArrowRight size={15} className="ml-2" />
            </Button>
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center gap-2">
            <CheckCircle2 size={17} className="text-violet-400" />
            <div>
              <p className="text-sm font-medium text-slate-300">Suggested first subgoals</p>
              <p className="mt-1 text-xs text-slate-500">These will become editable later</p>
            </div>
          </div>

          <ul className="space-y-3">
            {subgoals.map((subgoal) => (
              <li key={subgoal} className="flex items-center gap-3 rounded-lg px-2 py-1 text-sm text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200">
                <span className="h-5 w-5 shrink-0 rounded-full border border-slate-700 bg-slate-900/60" />
                {subgoal}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </AppShell>
  )
}

export default App
