import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Heartbeat,
  Brain,
  ChatCircle,
  BookOpen,
  ShieldCheck,
  ArrowRight,
  List,
  X,
  Sun,
  Moon,
  Drop,
  Pill,
  MagnifyingGlass,
  CheckCircle,
  Stethoscope,
  Lightning,
  ChartLineUp,
  GithubLogo,
  TwitterLogo,
  Sparkle,
  ArrowUpRight,
  Warning,
} from '@phosphor-icons/react'
import { Button } from '@repo/ui/Button'
import { Card, CardContent } from '@repo/ui/Card'
import { useTheme } from '../hooks/useTheme'

// ─────────────────────────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────────────────────────

const NAV_LINKS = [{ label: 'Features', href: '#features' }]

function Navbar({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="section-container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 font-bold text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-cta shadow-sm">
              <Heartbeat size={18} weight="bold" className="text-white" />
            </div>
            <span className="text-lg">
              Gluco<span className="text-gradient">AI</span>
            </span>
          </a>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggle}
              aria-label="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {theme === 'dark' ? (
                <Sun size={16} weight="bold" />
              ) : (
                <Moon size={16} weight="bold" />
              )}
            </button>

            <Button
              size="sm"
              onClick={() => navigate('/authentication')}
              className="hidden gap-1.5 sm:inline-flex"
            >
              Get Started
              <ArrowRight size={14} weight="bold" />
            </Button>

            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Toggle menu"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border md:hidden"
            >
              {menuOpen ? <X size={18} /> : <List size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-border py-4 md:hidden">
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
              <Button
                size="sm"
                onClick={() => navigate('/authentication')}
                className="mt-1 w-fit gap-1.5"
              >
                Get Started
                <ArrowRight size={14} weight="bold" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

// ─────────────────────────────────────────────────────────────────
// Disclaimer Banner
// ─────────────────────────────────────────────────────────────────

// function DisclaimerBanner() {
//   return (
//     <div className="border-b border-amber-200/60 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/30 py-2.5">
//       <div className="section-container flex items-center justify-center gap-2 text-center text-xs text-amber-800 dark:text-amber-300">
//         <Warning size={14} weight="fill" className="shrink-0" />
//         <span>
//           GlucoAI is an AI assistant for informational purposes only.{' '}
//           <strong>It is not a medical device and does not replace professional medical advice.</strong>{' '}
//           Always consult your doctor or care team for diagnosis and treatment decisions.
//         </span>
//       </div>
//     </div>
//   )
// }

// ─────────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────────

function HeroSection() {
  const navigate = useNavigate()
  return (
    <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 right-0 h-[500px] w-[500px] rounded-full bg-brand-teal/5 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 -left-32 h-[400px] w-[400px] rounded-full bg-brand-blue/6 blur-3xl"
      />

      <div className="section-container relative">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          {/* Left: content */}
          <div className="flex flex-col gap-6 animate-fade-up">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-teal/30 bg-brand-teal/8 px-3 py-1 text-xs font-semibold text-brand-teal">
                <Sparkle size={12} weight="fill" />
                AI-Powered Diabetes Q&amp;A
              </span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem] leading-[1.1]">
              Ask Questions About <span className="text-gradient">Diabetes</span>, Get Cited Answers
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
              GlucoAI is an AI assistant that answers your diabetes questions using evidence from
              medical literature and clinical guidelines. Ask anything—get clear, sourced responses
              in seconds.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => navigate('/authentication')}
                className="gap-2 shadow-md"
              >
                Ask a Question
                <ArrowRight size={16} weight="bold" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {['🔒 Privacy-First', '📚 Cited Sources', '⚡ Instant Answers', '🤖 AI-Powered'].map(
                item => (
                  <span
                    key={item}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Right: visual */}
          <div className="relative flex items-center justify-center animate-fade-up animation-delay-200">
            <div className="absolute inset-0 rounded-2xl gradient-hero opacity-10 blur-2xl" />

            <div className="relative w-full max-w-sm">
              <Card className="border-border shadow-2xl">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3 border-b border-border pb-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-cta shadow-sm">
                      <Brain size={18} weight="bold" className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        GlucoAI Assistant
                      </p>
                      <p className="flex items-center gap-1 text-[11px] text-brand-mint">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-mint inline-block animate-pulse" />
                        AI · Informational Only
                      </p>
                    </div>
                    <ShieldCheck size={16} weight="fill" className="text-brand-teal shrink-0" />
                  </div>

                  <div className="flex justify-end">
                    <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-xs leading-relaxed text-primary-foreground">
                      What should my fasting blood glucose be in the morning?
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-teal/15 mt-0.5">
                      <Stethoscope size={13} weight="bold" className="text-brand-teal" />
                    </div>
                    <div className="max-w-[82%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-xs leading-relaxed text-foreground">
                      For most adults with diabetes, the ADA recommends a fasting glucose of{' '}
                      <strong className="text-brand-teal">80–130 mg/dL</strong> before meals.
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
                    <BookOpen size={11} />
                    <span>Source: American Diabetes Association Standards of Care 2024</span>
                    <ArrowUpRight size={11} className="ml-auto shrink-0" />
                  </div>

                  <div className="rounded-lg border border-amber-200/60 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20 px-3 py-2 text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    ⚠️ AI-generated. Not a substitute for professional medical advice.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────
// What It Is (replaces Stats — no fake numbers)
// ─────────────────────────────────────────────────────────────────

function WhatItIsSection() {
  return (
    <section className="border-y border-border bg-muted/30 py-10">
      <div className="section-container">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 text-center">
          <div className="flex flex-col items-center gap-3 px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal/10">
              <Brain size={24} weight="duotone" className="text-brand-teal" />
            </div>
            <p className="font-semibold text-foreground">An AI Assistant</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              GlucoAI uses large language models to understand your questions and generate
              informative responses grounded in medical sources.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10">
              <BookOpen size={24} weight="duotone" className="text-brand-blue" />
            </div>
            <p className="font-semibold text-foreground">Source-Backed Answers</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every response cites the clinical guidelines and peer-reviewed literature it draws
              from, so you can verify and read further.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <Warning size={24} weight="duotone" className="text-amber-500" />
            </div>
            <p className="font-semibold text-foreground">Not Medical Advice</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              GlucoAI is for education and information only. It cannot diagnose, prescribe, or
              replace your healthcare provider.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────
// Features
// ─────────────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section id="features" className="py-16 md:py-24">
      <div className="section-container">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="text-sm font-semibold text-brand-teal">What You Can Ask</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Diabetes questions, answered
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            GlucoAI can help you understand a wide range of diabetes topics—drawing on clinical
            guidelines and medical research to give you clear, sourced information.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="card-hover border-border">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/10">
                <ChatCircle size={24} weight="duotone" className="text-brand-blue" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">General Q&amp;A</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Ask any diabetes question in plain language. Get clear answers without jargon,
                backed by clinical sources you can read yourself.
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover border-border">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-teal/10">
                <BookOpen size={24} weight="duotone" className="text-brand-teal" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">Guidelines &amp; Standards</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Understand what ADA, WHO, and other major bodies recommend—explained in plain
                English with direct references to the source.
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover border-border">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-mint/10">
                <Drop size={24} weight="duotone" className="text-brand-mint" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">Glucose &amp; Targets</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Learn about blood glucose targets, HbA1c ranges, hypoglycemia, hyperglycemia, and
                what different readings can mean.
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover border-border">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-coral/10">
                <Pill size={24} weight="duotone" className="text-brand-coral" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">Medications &amp; Treatments</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Learn about insulin types, oral medications, and emerging therapies—what they are
                and how they work, based on clinical literature.
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover border-border">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/10">
                <ChartLineUp size={24} weight="duotone" className="text-brand-blue" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">Lifestyle &amp; Diet</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Explore how nutrition, physical activity, sleep, and stress affect blood sugar
                management, with evidence-based context.
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover border-border">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-teal/10">
                <ShieldCheck size={24} weight="duotone" className="text-brand-teal" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">Privacy-First</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your health data stays yours. We follow HIPAA-aware practices and never sell your
                information to third parties.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────
// How It Works
// ─────────────────────────────────────────────────────────────────

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-muted/30 py-16 md:py-24">
      <div className="section-container">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="text-sm font-semibold text-brand-teal">How It Works</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Answers in three simple steps
          </h2>
          <p className="mt-4 text-muted-foreground">
            Powered by Retrieval-Augmented Generation (RAG)—combining the precision of search with
            the clarity of AI to give you grounded, traceable answers.
          </p>
        </div>

        <div className="relative grid gap-10 md:grid-cols-3">
          <div
            aria-hidden
            className="absolute top-9 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] hidden h-px bg-border md:block"
          />

          {[
            {
              icon: ChatCircle,
              title: 'Ask Your Question',
              description:
                'Type any diabetes-related question naturally. No special syntax needed—write it just as you would ask your doctor.',
            },
            {
              icon: MagnifyingGlass,
              title: 'AI Searches Sources',
              description:
                'The RAG engine retrieves relevant passages from medical journals, ADA guidelines, and clinical databases to ground its response.',
            },
            {
              icon: CheckCircle,
              title: 'Get a Cited Answer',
              description:
                'You receive a clear, AI-generated response with source references so you can verify the information independently.',
            },
          ].map(({ icon: Icon, title, description }, i) => (
            <div key={title} className="relative flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full gradient-hero shadow-lg">
                  <Icon size={28} weight="bold" className="text-white" />
                </div>
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-brand-teal bg-background text-[10px] font-bold text-brand-teal">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border bg-muted/20 py-12">
      <div className="section-container">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-2">
            <a href="#" className="flex items-center gap-2.5 font-bold text-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-cta shadow-sm">
                <Heartbeat size={18} weight="bold" className="text-white" />
              </div>
              <span>
                Gluco<span className="text-gradient">AI</span>
              </span>
            </a>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              An AI assistant that answers diabetes questions using evidence from medical literature
              and clinical guidelines. For informational use only.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="GitHub"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <GithubLogo size={16} />
              </a>
              <a
                href="#"
                aria-label="Twitter / X"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <TwitterLogo size={16} />
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Product
            </p>
            <ul className="space-y-2.5 text-sm">
              {['Features', 'How It Works'].map(item => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Legal
            </p>
            <ul className="space-y-2.5 text-sm">
              {['Privacy Policy', 'Terms of Service', 'HIPAA Notice', 'Cookie Policy'].map(item => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © 2024 GlucoAI ·{' '}
            <span className="italic">Not a substitute for professional medical advice.</span>
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lightning size={12} weight="fill" className="text-brand-teal" />
            Powered by RAG + AI
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────────────────────────

export function LandingPage() {
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      {/* <DisclaimerBanner /> */}
      <Navbar theme={theme} onToggle={toggle} />
      <main>
        <HeroSection />
        <WhatItIsSection />
        <FeaturesSection />
        <HowItWorksSection />
      </main>
      <Footer />
    </div>
  )
}
