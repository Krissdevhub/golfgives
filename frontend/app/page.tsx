import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { Trophy, Heart, BarChart3, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">

        {/* ── HERO ── */}
        <section className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
          {/* Orbs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute w-[500px] h-[500px] rounded-full bg-accent opacity-[0.08] blur-[100px] -top-20 -left-20" />
            <div className="absolute w-[400px] h-[400px] rounded-full bg-gold opacity-[0.08] blur-[100px] bottom-0 -right-10" />
            <div className="absolute w-[300px] h-[300px] rounded-full bg-indigo-500 opacity-[0.06] blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto animate-fade-in">
            <div className="badge-green mb-8 inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Live Monthly Draws
            </div>

            <h1 className="font-display font-extrabold text-5xl md:text-7xl leading-[1.0] tracking-tight mb-6">
              Play Golf.<br />
              <span className="text-accent">Change Lives.</span>
            </h1>

            <p className="text-lg text-white/60 max-w-xl mx-auto leading-relaxed mb-10">
              Enter your Stableford scores, compete in monthly prize draws, and automatically
              donate to a charity you care about — all in one platform.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/signup" className="btn-primary text-base px-8 py-3.5">
                Start Participating
              </Link>
              <a href="#how-it-works" className="btn-ghost text-base px-8 py-3.5">
                How It Works
              </a>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto mt-16 p-6 bg-bg-secondary border border-border rounded-[14px]">
              {[
                { num: '£12,400', lbl: 'Prize Pool This Month' },
                { num: '847',     lbl: 'Active Members' },
                { num: '£3,200',  lbl: 'Donated to Charity' },
              ].map(s => (
                <div key={s.lbl} className="text-center">
                  <div className="font-display font-extrabold text-2xl text-accent">{s.num}</div>
                  <div className="text-xs text-white/40 mt-1 uppercase tracking-widest">{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="py-24 px-6 max-w-6xl mx-auto">
          <h2 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight mb-3">How GolfGives Works</h2>
          <p className="text-white/50 text-lg mb-14">Three steps. One platform. Endless impact.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: BarChart3, color: 'text-accent', bg: 'bg-accent/10', title: 'Log Your Scores', desc: 'Enter your latest Stableford scores (1–45). We keep your most recent 5 automatically — no manual management.' },
              { icon: Trophy,    color: 'text-gold',   bg: 'bg-gold/10',   title: 'Monthly Draws',   desc: 'Match 3, 4, or 5 numbers from the monthly draw. The jackpot rolls over if nobody hits a 5-match.' },
              { icon: Heart,     color: 'text-pink-400', bg: 'bg-pink-500/10', title: 'Give to Charity', desc: 'Choose a charity you love. Minimum 10% of your subscription goes directly to them every month.' },
              { icon: Shield,    color: 'text-indigo-400', bg: 'bg-indigo-500/10', title: 'Win Verified',  desc: 'Upload proof of your scores. Admin reviews and approves. Payouts tracked transparently.' },
            ].map(f => (
              <div key={f.title} className="card p-7 hover:border-border-strong transition-all duration-300 hover:-translate-y-1">
                <div className={`w-11 h-11 rounded-lg ${f.bg} flex items-center justify-center mb-5`}>
                  <f.icon size={20} className={f.color} />
                </div>
                <h3 className="font-display font-bold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRIZE POOL BREAKDOWN ── */}
        <section className="py-24 px-6 bg-bg-secondary border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display font-extrabold text-4xl tracking-tight mb-3">Prize Pool Structure</h2>
            <p className="text-white/50 mb-14">Every subscriber contributes to the pot. Distribution is automatic.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { match: '5-Number Match', pct: '40%', note: 'Jackpot — rolls over if unclaimed', color: 'text-gold', border: 'border-gold/30', bg: 'bg-gold/5' },
                { match: '4-Number Match', pct: '35%', note: 'Split equally among winners',       color: 'text-accent', border: 'border-accent/30', bg: 'bg-accent/5' },
                { match: '3-Number Match', pct: '25%', note: 'Split equally among winners',       color: 'text-indigo-400', border: 'border-indigo-500/30', bg: 'bg-indigo-500/5' },
              ].map(p => (
                <div key={p.match} className={`${p.bg} border ${p.border} rounded-[14px] p-7`}>
                  <div className={`font-display font-extrabold text-5xl ${p.color} mb-2`}>{p.pct}</div>
                  <div className="font-display font-bold text-base mb-1">{p.match}</div>
                  <div className="text-xs text-white/40">{p.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CHARITIES ── */}
        <section id="charities" className="py-24 px-6 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-display font-extrabold text-4xl tracking-tight mb-4">Give Back Every Month</h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Every subscription automatically routes a portion to your chosen charity.
                Browse 50+ verified charities, each with their own profile and upcoming golf events.
              </p>
              <div className="flex gap-6">
                <div>
                  <div className="font-display font-extrabold text-3xl text-accent">50+</div>
                  <div className="text-sm text-white/40 mt-1">Verified Charities</div>
                </div>
                <div className="w-px bg-border" />
                <div>
                  <div className="font-display font-extrabold text-3xl text-gold">£3,200</div>
                  <div className="text-sm text-white/40 mt-1">Donated So Far</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { emoji: '🌍', name: 'Golf Foundation',    cat: 'Youth Development in Golf',       pct: 15 },
                { emoji: '❤️', name: 'Cancer Research UK', cat: 'Fundraising Through Sport',        pct: 10 },
                { emoji: '🌱', name: 'Macmillan Golf Day', cat: 'Annual Charity Golf Event',         pct: 20 },
              ].map(c => (
                <div key={c.name} className="card p-4 flex items-center gap-4 hover:border-border-strong transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center text-xl flex-shrink-0">{c.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-sm">{c.name}</div>
                    <div className="text-xs text-white/40 mt-0.5">{c.cat}</div>
                  </div>
                  <div className="font-display font-extrabold text-accent">{c.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 px-6 text-center bg-bg-secondary border-t border-border">
          <div className="max-w-2xl mx-auto">
            <h2 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight mb-4">Ready to Play?</h2>
            <p className="text-white/50 text-lg mb-10">Join 847 golfers who are playing, winning, and giving every month.</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/signup" className="btn-primary px-10 py-4 text-lg">Start Today — £9/month</Link>
              <Link href="/signup?plan=yearly" className="btn-ghost px-10 py-4 text-lg">Yearly Plan — Save 17%</Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="border-t border-border px-6 py-8 text-center text-sm text-white/30 font-display">
          © {new Date().getFullYear()} GolfGives. Built by Digital Heroes.
        </footer>
      </main>
    </>
  )
}
