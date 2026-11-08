"use client";

import { ArrowDown, ArrowRight, Bell, BrainCircuit, CalendarClock, Check, Flame, Gauge, Lightbulb, Network, RefreshCw, Route, ShieldCheck, Smartphone, Sparkles, Tablet, Trophy, TrendingUp } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/app/button-link";
import { Wordmark } from "@/components/app/logo";
import { UnitIcon } from "@/components/app/unit-icon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tex } from "@/components/math/tex";
import { Visual } from "@/components/visuals/visual";
import { useSession } from "@/hooks/queries";
import { course, graph } from "@/lib/course";
import { FAQS } from "@/lib/faq";
import { IOS_APP } from "@/lib/site";

const fadeUp = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { duration: 0.5 } };

export function Landing() {
  const { user } = useSession();
  const cta = user ? { href: "/learn", label: "Continue learning" } : { href: "/register", label: "Start learning free" };
  return (
    <div className="overflow-x-clip">
      <Hero cta={cta} />
      <Features />
      <Curriculum />
      <Engine />
      <MobileApp />
      <Faq />
      <FinalCta cta={cta} />
    </div>
  );
}

function Hero({ cta }: { cta: { href: string; label: string } }) {
  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-0 bg-dots [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-32 left-[10%] size-[32rem] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute top-40 right-[5%] size-[24rem] rounded-full bg-chart-2/15 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
        <div>
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="size-3.5 text-primary" /> <Wordmark /> · adaptive · beautifully visual
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-5 font-display text-5xl leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
            All the maths you need <em className="bg-gradient-to-r from-primary to-chart-4 bg-clip-text text-transparent">before</em> calculus.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-5 max-w-xl text-lg text-muted-foreground">
            {graph.refs.length} connected lessons, from place value to your first limits, with interactive visuals and an engine that adapts every problem to you, spots where you struggle, and brings ideas back right before you forget them.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={cta.href} size="lg" className="h-12 px-6 text-base shadow-lg shadow-primary/25">
              {cta.label} <ArrowRight />
            </ButtonLink>
            <ButtonLink href="/courses/foundations" variant="outline" size="lg" className="h-12 px-6 text-base">
              Explore the course
            </ButtonLink>
          </motion.div>
          <AppComingSoonBadge />
          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {[`${course.units.length} units`, `${graph.refs.length} lessons`, "Unlimited practice", "Step-by-step solutions", "Free, no ads"].map((x) => (
              <li key={x} className="flex items-center gap-1.5">
                <Check className="size-4 text-success" /> {x}
              </li>
            ))}
          </motion.ul>
        </div>
        <HeroDemo />
      </div>
    </section>
  );
}

/** Hero pill that glides the reader down to the iPhone & iPad section. */
function AppComingSoonBadge() {
  const reduceMotion = useReducedMotion();
  const live = IOS_APP.available;
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("app");
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", "#app");
  };
  return (
    <motion.a
      href="#app"
      onClick={onClick}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.28, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      whileTap={{ scale: 0.97 }}
      aria-label={live ? "The FreeMathCamp app is on the App Store for iPhone and iPad. Jump to the app section" : "FreeMathCamp for iPhone and iPad is coming soon to the App Store. Jump to the app section"}
      className="group relative mt-6 inline-flex max-w-full items-center gap-3 overflow-hidden rounded-full border bg-card/80 py-1.5 pr-3 pl-1.5 text-sm shadow-sm backdrop-blur transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {/* A soft sheen that sweeps across now and then, so the pill catches the eye without shouting. */}
      {!reduceMotion && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-primary/15 to-transparent"
          animate={{ x: ["0%", "450%"] }}
          transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 4, delay: 1.2 }}
        />
      )}
      <span className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground py-1 pr-2.5 pl-2 text-xs font-semibold text-background">
        <svg viewBox="0 0 384 512" className="size-3.5 fill-current" aria-hidden>
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
        </svg>
        {live ? "Out now" : "Coming soon"}
      </span>
      <span className="relative flex min-w-0 items-center gap-2">
        {!live && (
          <span className="relative flex size-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
        )}
        <span className="truncate font-medium">
          {live ? "On the App Store" : "App Store"} <span className="text-muted-foreground">
            · <span className="sm:hidden">iOS</span>
            <span className="hidden sm:inline">iPhone & iPad</span>
          </span>
        </span>
      </span>
      <ArrowDown className="relative size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-y-0.5 group-hover:text-primary" />
    </motion.a>
  );
}

function HeroDemo() {
  return (
    <motion.div initial={{ opacity: 0, y: 30, rotate: 1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.15, duration: 0.6 }} className="relative">
      <div className="rounded-3xl border bg-card/90 p-4 shadow-2xl shadow-primary/10 backdrop-blur sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {[1, 1, 1, 0, 0, 0].map((d, i) => (
              <span key={i} className={`h-1.5 w-7 rounded-full ${d ? "bg-success" : i === 3 ? "bg-primary/50" : "bg-muted"}`} />
            ))}
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">★★☆ Core</span>
        </div>
        <p className="font-medium">Solve. Enter all solutions.</p>
        <div className="my-3 rounded-xl bg-muted/50 py-3 text-center">
          <Tex tex="x^2 - x - 6 = 0" display className="text-2xl" />
        </div>
        {/* An answered problem: in the app the graph of the roots only appears once you've solved it. */}
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-success/12 px-3 py-2 text-sm">
          <span className="grid size-5 place-items-center rounded-full bg-success text-white">
            <Check className="size-3.5" />
          </span>
          <span className="font-semibold">Spot on!</span>
          <span className="text-muted-foreground">
            <Tex tex="x = -2 \text{ or } x = 3" />
          </span>
        </div>
        <Visual
          visual={{
            type: "functionPlot",
            functions: [{ fn: (x) => x * x - x - 6 }],
            points: [
              { x: -2, y: 0, label: "x = −2", tone: "accent" },
              { x: 3, y: 0, label: "x = 3", tone: "accent" },
            ],
            viewBox: { x: [-5, 6], y: [-8, 6] },
          }}
        />
      </div>
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute -top-4 -left-4 hidden items-center gap-2 rounded-2xl border bg-card px-3 py-2 text-sm font-semibold shadow-xl sm:flex">
        <TrendingUp className="size-4 text-success" /> Mastery +14%
      </motion.div>
      <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="absolute -right-3 -bottom-5 hidden items-center gap-2 rounded-2xl border bg-card px-3 py-2 text-sm shadow-xl sm:flex">
        <span className="grid size-7 place-items-center rounded-lg bg-warning/20 text-warning">
          <CalendarClock className="size-4" />
        </span>
        <span>
          <span className="block text-xs text-muted-foreground">Next review</span>
          <span className="font-semibold">in 3 days</span>
        </span>
      </motion.div>
    </motion.div>
  );
}

const FEATURES = [
  { icon: Gauge, title: "Difficulty that adapts", text: "Every problem is generated for you. Two clean solves and we step up; a struggle and we ease back — in real time.", color: "from-primary to-chart-5" },
  { icon: BrainCircuit, title: "Knows when you struggle", text: "Wrong answers are weighted, time is compared to a baseline, hints count. Tricky topics land in your Strengthen queue.", color: "from-chart-4 to-chart-3" },
  { icon: CalendarClock, title: "Reviews before you forget", text: "Spaced repetition schedules each topic so memory sticks, with intervals that stretch as you master it.", color: "from-chart-3 to-chart-2" },
  { icon: Network, title: "Every idea is connected", text: "Each lesson links to the ideas it builds on. New to a topic? See exactly what background helps before you dive in.", color: "from-chart-2 to-primary" },
  { icon: Route, title: "Your path, or your own", text: "Path mode unlocks lessons in order as you practise. Audit mode opens all of them so you can explore. Switch any time.", color: "from-primary to-chart-2" },
  { icon: Lightbulb, title: "Help the moment you're stuck", text: "Hints when you need a nudge, and a step-by-step worked solution for every problem, with the visual that explains it.", color: "from-chart-5 to-chart-4" },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-4xl sm:text-5xl">Built around how people actually learn</h2>
        <p className="mt-3 text-muted-foreground">Not a video library. A personal tutor that watches how you work and plans what&apos;s next.</p>
      </motion.div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div key={f.title} {...fadeUp} transition={{ delay: i * 0.08, duration: 0.5 }} className="group rounded-2xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
            <span className={`grid size-11 place-items-center rounded-xl bg-gradient-to-br ${f.color} text-white shadow-md`}>
              <f.icon className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Curriculum() {
  return (
    <section id="course" className="scroll-mt-20 border-y bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <motion.div {...fadeUp} className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-semibold tracking-widest text-primary uppercase">The Foundations course</div>
            <h2 className="mt-2 font-display text-4xl sm:text-5xl">From counting to calculus-ready</h2>
          </div>
          <ButtonLink href="/courses/foundations" variant="outline">
            See every lesson <ArrowRight />
          </ButtonLink>
        </motion.div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {course.units.map((u, i) => (
            <motion.div key={u.id} {...fadeUp} transition={{ delay: (i % 4) * 0.05, duration: 0.4 }}>
              <Link href="/courses/foundations" className="group flex h-full items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <UnitIcon name={u.icon} className="size-5" />
                </span>
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground">UNIT {i + 1}</div>
                  <div className="leading-tight font-semibold">{u.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{u.exercises.length} lessons</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Engine() {
  const steps = [
    { title: "You practise", text: "Problems are generated fresh at the level that suits you right now.", tex: "\\text{level} \\in \\{1, 2, 3\\}" },
    { title: "We measure", text: "Accuracy, attempts, hints and time combine into a struggle score; mastery updates with Bayesian knowledge tracing.", tex: "s = 1 - (1-e)(1-h)(1-t)" },
    { title: "Your plan updates", text: "Due reviews, weak spots and ready-to-learn lessons are interleaved into today's plan.", tex: "\\text{review} \\oplus \\text{repair} \\oplus \\text{new}" },
  ];
  return (
    <section id="engine" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <motion.h2 {...fadeUp} className="text-center font-display text-4xl sm:text-5xl">
        The engine behind every session
      </motion.h2>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div key={s.title} {...fadeUp} transition={{ delay: i * 0.1, duration: 0.5 }} className="relative rounded-2xl border bg-card p-6">
            <span className="font-display text-5xl text-primary/30">0{i + 1}</span>
            <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            <div className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-center text-sm">
              <Tex tex={s.tex} />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const APP_POINTS = [
  { icon: Route, title: "Your path, your pace", text: "Pick Path mode to unlock lessons in order, or Audit mode to open them all. The welcome tour asks first, and you can switch any time." },
  { icon: RefreshCw, title: "One account, everywhere", text: "Start a lesson on your laptop and finish it on the bus. Progress, reviews and streaks sync both ways." },
  { icon: ShieldCheck, title: "Sign in your way", text: "Sign in with Apple, Google or email, and the session stays safely in your keychain." },
  { icon: Bell, title: "Nudges, not nagging", text: "An optional reminder when a review is due or your streak needs a session. Turn it off any time." },
];

const DEVICES = [
  { icon: Smartphone, label: "iPhone" },
  { icon: Tablet, label: "iPad" },
  { icon: Smartphone, label: "iPhone Duo" },
];

function MobileApp() {
  return (
    <section id="app" className="relative scroll-mt-20 overflow-hidden border-y bg-muted/30" aria-labelledby="app-heading">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_70%_50%,black,transparent)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:py-28">
        <motion.div {...fadeUp}>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium">
            <Smartphone className="size-3.5 text-primary" /> iPhone & iPad · {IOS_APP.available ? "Out now" : "Coming soon"}
          </span>
          <h2 id="app-heading" className="mt-4 font-display text-4xl sm:text-5xl">
            The whole course, <em className="bg-gradient-to-r from-primary to-chart-4 bg-clip-text text-transparent">in your pocket</em>.
          </h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            The <Wordmark /> app has all {graph.refs.length} lessons, the same adaptive practice with step-by-step solutions, your daily plan and the weekly leagues, built to feel at home on iOS. Ten minutes in a queue is ten minutes of maths.
          </p>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {APP_POINTS.map((p, i) => (
              <motion.li key={p.title} {...fadeUp} transition={{ delay: 0.05 + i * 0.07, duration: 0.45 }} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <p.icon className="size-4" />
                </span>
                <span>
                  <span className="block font-semibold">{p.title}</span>
                  <span className="block text-sm text-muted-foreground">{p.text}</span>
                </span>
              </motion.li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Designed for</span>
            {DEVICES.map((d) => (
              <span key={d.label} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 font-medium text-foreground">
                <d.icon className="size-3.5 text-primary" /> {d.label}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <AppStoreBadge />
            {!IOS_APP.available && (
              <ButtonLink href="/register" variant="outline" size="lg" className="h-12 px-5">
                Start on the web today <ArrowRight />
              </ButtonLink>
            )}
          </div>
          {!IOS_APP.available && <p className="mt-3 text-sm text-muted-foreground">Your progress will be waiting in the app when it lands.</p>}
        </motion.div>
        <PhoneShowcase />
      </div>
    </section>
  );
}

/** Maths glyphs drifting around the showcase, each at its own depth for a little parallax as the page scrolls. */
const GLYPHS = [
  { t: "π", x: "4%", y: "8%", size: "text-6xl", depth: 60, dur: 7, tone: "text-primary/35" },
  { t: "√x", x: "84%", y: "4%", size: "text-5xl", depth: -40, dur: 8, tone: "text-chart-4/40" },
  { t: "∑", x: "90%", y: "46%", size: "text-6xl", depth: 80, dur: 9, tone: "text-chart-2/35" },
  { t: "θ", x: "0%", y: "52%", size: "text-5xl", depth: -70, dur: 6.5, tone: "text-chart-3/40" },
  { t: "x²", x: "10%", y: "86%", size: "text-5xl", depth: 50, dur: 7.5, tone: "text-chart-5/40" },
  { t: "∞", x: "80%", y: "88%", size: "text-6xl", depth: -50, dur: 8.5, tone: "text-primary/30" },
  { t: "½", x: "48%", y: "-2%", size: "text-4xl", depth: 30, dur: 6, tone: "text-chart-4/35" },
] as const;

const SLIDE_MS = 3800;

/**
 * The app's screens in a phone that cycles through them on its own (pausing on
 * hover, off screen, or when the reader prefers less motion), with the screens
 * either side peeking out behind it and maths glyphs floating around.
 */
function PhoneShowcase() {
  const shots = IOS_APP.screenshots;
  const n = shots.length;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-15% 0px" });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const playing = !reduce && !paused && inView;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % n), SLIDE_MS);
    return () => clearTimeout(t);
  }, [playing, index, n]);

  const at = (offset: number) => shots[(index + offset + n) % n]!;
  const current = shots[index]!;

  return (
    <motion.div
      ref={ref}
      {...fadeUp}
      transition={{ delay: 0.1, duration: 0.6 }}
      className="relative mx-auto w-full max-w-xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-x-6 top-16 bottom-24 rounded-full bg-gradient-to-tr from-primary/30 via-chart-4/20 to-chart-2/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
        {GLYPHS.map((g) => (
          <Glyph key={g.t} glyph={g} progress={scrollYProgress} still={!!reduce} />
        ))}
      </div>

      <div className="relative flex h-[35rem] items-center justify-center sm:h-[40rem]">
        {/* The neighbouring screens, tilted back behind the phone. */}
        <SidePhone shot={at(-1)} side="left" />
        <SidePhone shot={at(1)} side="right" />

        <motion.div
          className="relative z-10 w-[15rem] sm:w-[17.5rem]"
          animate={reduce ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="rounded-[2.6rem] border border-black/10 bg-neutral-900 p-2 shadow-2xl shadow-primary/25 ring-1 ring-white/10 dark:border-white/15">
            <div className="relative aspect-[1320/2868] overflow-hidden rounded-[2.1rem] bg-muted">
              <AnimatePresence initial={false}>
                <motion.div
                  key={current.src}
                  className="absolute inset-0"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06, filter: "blur(8px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Image src={current.src} alt={current.alt} fill sizes="(min-width: 640px) 280px, 240px" priority={index === 0} className="object-cover object-top" />
                </motion.div>
              </AnimatePresence>
              <span className="absolute top-2.5 left-1/2 h-[1.15rem] w-[4.6rem] -translate-x-1/2 rounded-full bg-black" />
            </div>
          </div>

          <motion.div
            animate={reduce ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 -left-16 hidden items-center gap-2 rounded-2xl border bg-card/95 px-3 py-2 text-sm font-semibold shadow-xl backdrop-blur sm:flex"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-warning/20 text-warning">
              <Flame className="size-4" />
            </span>
            26-day streak
          </motion.div>
          <motion.div
            animate={reduce ? undefined : { y: [0, 8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-20 bottom-28 hidden items-center gap-2 rounded-2xl border bg-card/95 px-3 py-2 text-sm shadow-xl backdrop-blur sm:flex"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-chart-4/20 text-chart-4">
              <Trophy className="size-4" />
            </span>
            <span>
              <span className="block text-xs text-muted-foreground">This week</span>
              <span className="font-semibold">+1,150 XP</span>
            </span>
          </motion.div>
        </motion.div>
      </div>

      <div className="relative mt-2 text-center" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={current.src} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            <div className="font-display text-2xl">{current.label}</div>
            <div className="text-sm text-muted-foreground">{current.caption}</div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div role="tablist" aria-label="App screens" className="relative mt-4 flex justify-center gap-1.5">
        {shots.map((s, i) => (
          <button
            key={s.src}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={s.label}
            onClick={() => setIndex(i)}
            className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-300 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${i === index ? "w-10 bg-primary/25" : "w-1.5 bg-foreground/20 hover:bg-foreground/40"}`}
          >
            {i === index && (
              <motion.span
                key={`${index}-${playing}`}
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                initial={{ width: playing ? "0%" : "100%" }}
                animate={{ width: "100%" }}
                transition={{ duration: playing ? SLIDE_MS / 1000 : 0, ease: "linear" }}
              />
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function SidePhone({ shot, side }: { shot: (typeof IOS_APP.screenshots)[number]; side: "left" | "right" }) {
  const left = side === "left";
  return (
    <div className={`absolute top-1/2 hidden w-[11.5rem] -translate-y-1/2 sm:block ${left ? "left-0 -rotate-[8deg]" : "right-0 rotate-[8deg]"}`}>
      <div className="rounded-[2rem] border border-black/10 bg-neutral-900 p-1.5 opacity-80 shadow-xl dark:border-white/15">
        <div className="relative aspect-[1320/2868] overflow-hidden rounded-[1.6rem] bg-muted">
          <AnimatePresence initial={false}>
            <motion.div key={shot.src} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
              <Image src={shot.src} alt="" fill sizes="190px" className="object-cover object-top" />
            </motion.div>
          </AnimatePresence>
          <div className={`absolute inset-0 from-background/50 to-transparent ${left ? "bg-gradient-to-r" : "bg-gradient-to-l"}`} />
        </div>
      </div>
    </div>
  );
}

function Glyph({ glyph, progress, still }: { glyph: (typeof GLYPHS)[number]; progress: MotionValue<number>; still: boolean }) {
  const y = useTransform(progress, [0, 1], [glyph.depth, -glyph.depth]);
  return (
    <motion.span className="absolute" style={{ left: glyph.x, top: glyph.y, y: still ? 0 : y }}>
      <motion.span
        className={`block font-display italic ${glyph.size} ${glyph.tone}`}
        animate={still ? undefined : { y: [0, -12, 0], rotate: [0, 6, 0] }}
        transition={{ duration: glyph.dur, repeat: Infinity, ease: "easeInOut" }}
      >
        {glyph.t}
      </motion.span>
    </motion.span>
  );
}

/** Apple's badge, drawn inline so it follows the theme; a link only once the app is live. */
function AppStoreBadge() {
  const badge = (
    <span className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-foreground px-4 text-background">
      <svg viewBox="0 0 384 512" className="size-6 fill-current" aria-hidden>
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
      <span className="text-left leading-none">
        <span className="block text-[10px] font-medium opacity-80">{IOS_APP.available ? "Download on the" : "Coming soon to the"}</span>
        <span className="block text-lg font-semibold tracking-tight">App Store</span>
      </span>
    </span>
  );
  if (!IOS_APP.available) return <span aria-label="Coming soon to the App Store">{badge}</span>;
  return (
    <a href={IOS_APP.appStoreUrl} target="_blank" rel="noopener noreferrer" aria-label="Download FreeMathCamp on the App Store" className="transition-opacity hover:opacity-85">
      {badge}
    </a>
  );
}

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pt-20 pb-20 sm:px-6 sm:pt-24" aria-labelledby="faq-heading">
      <motion.h2 {...fadeUp} id="faq-heading" className="text-center font-display text-4xl sm:text-5xl">
        <Wordmark />, answered
      </motion.h2>
      <motion.div {...fadeUp} transition={{ delay: 0.08, duration: 0.5 }}>
        <Accordion defaultValue={[FAQS[0].q]} className="mt-10 rounded-2xl border bg-card">
          {FAQS.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="px-5">
              <AccordionTrigger className="items-center gap-4 py-4 text-base font-semibold hover:no-underline focus-visible:ring-offset-0">{f.q}</AccordionTrigger>
              {/* keepMounted leaves every answer in the HTML, so crawlers and find-in-page still see it. */}
              <AccordionContent keepMounted className="pb-4 text-sm leading-relaxed text-muted-foreground">
                <p>{f.a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </section>
  );
}

function FinalCta({ cta }: { cta: { href: string; label: string } }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <motion.div {...fadeUp} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-chart-4 px-6 py-14 text-center text-primary-foreground shadow-2xl shadow-primary/20 sm:px-12">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" />
        <h2 className="relative font-display text-4xl sm:text-5xl">Ready when you are.</h2>
        <p className="relative mx-auto mt-3 max-w-lg opacity-90">Ten minutes a day. No ads, no paywall — just the clearest path to calculus we could build.</p>
        <ButtonLink href={cta.href} size="lg" variant="secondary" className="relative mt-8 h-12 px-6 text-base">
          {cta.label} <ArrowRight />
        </ButtonLink>
      </motion.div>
    </section>
  );
}
