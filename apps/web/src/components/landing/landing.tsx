"use client";

import { ArrowDown, ArrowRight, Bell, BrainCircuit, CalendarClock, Check, Gauge, Network, RefreshCw, ShieldCheck, Smartphone, Sparkles, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/app/button-link";
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
            <Sparkles className="size-3.5 text-primary" /> FreeMathCamp · adaptive · beautifully visual
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
            {[`${course.units.length} units`, `${graph.refs.length} lessons`, "Unlimited practice", "Light & dark mode"].map((x) => (
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
  { icon: Network, title: "Every idea is connected", text: "Each lesson links to the ideas it builds on. New to a topic? See exactly what background helps, then follow the path in order or explore freely.", color: "from-chart-2 to-primary" },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-4xl sm:text-5xl">Built around how people actually learn</h2>
        <p className="mt-3 text-muted-foreground">Not a video library. A personal tutor that watches how you work and plans what&apos;s next.</p>
      </motion.div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
  { icon: RefreshCw, title: "One account, everywhere", text: "Start a lesson on your laptop and finish it on the bus. Progress, reviews and streaks sync both ways." },
  { icon: ShieldCheck, title: "Sign in your way", text: "Sign in with Apple, Google or email, and the session stays safely in your keychain." },
  { icon: Bell, title: "Nudges, not nagging", text: "An optional reminder when a review is due or your streak needs a session. Turn it off any time." },
];

function MobileApp() {
  return (
    <section id="app" className="scroll-mt-20 border-y bg-muted/30" aria-labelledby="app-heading">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <motion.div {...fadeUp}>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium">
            <Smartphone className="size-3.5 text-primary" /> iPhone & iPad · {IOS_APP.available ? "Out now" : "Coming soon"}
          </span>
          <h2 id="app-heading" className="mt-4 font-display text-4xl sm:text-5xl">
            The whole course, <em className="text-primary">in your pocket</em>.
          </h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            The FreeMathCamp app for iPhone and iPad has every lesson, the same adaptive practice and your daily plan, built to feel at home on iOS. Ten minutes in a queue is ten minutes of maths.
          </p>
          <ul className="mt-8 space-y-5">
            {APP_POINTS.map((p) => (
              <li key={p.title} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <p.icon className="size-4" />
                </span>
                <span>
                  <span className="block font-semibold">{p.title}</span>
                  <span className="block text-sm text-muted-foreground">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <AppStoreBadge />
            {!IOS_APP.available && (
              <ButtonLink href="/register" variant="outline" size="lg" className="h-12 px-5">
                Start on the web today <ArrowRight />
              </ButtonLink>
            )}
          </div>
          {!IOS_APP.available && <p className="mt-3 text-sm text-muted-foreground">Your progress will be waiting in the app when it lands.</p>}
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.6 }} className="relative">
          <div className="pointer-events-none absolute inset-x-10 top-10 bottom-0 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex items-end justify-center gap-3 sm:gap-5">
            {IOS_APP.screenshots.map((shot, i) => (
              <PhoneFrame key={shot.src} src={shot.src} alt={shot.alt} className={i === 1 ? "z-10 w-[38%] sm:w-[36%]" : "w-[30%] translate-y-6 opacity-95 sm:w-[29%]"} priority={i === 1} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PhoneFrame({ src, alt, className, priority }: { src: string; alt: string; className: string; priority?: boolean }) {
  return (
    <div className={`rounded-[2rem] border border-black/10 bg-neutral-900 p-1.5 dark:border-white/15 shadow-2xl shadow-primary/15 sm:rounded-[2.4rem] sm:p-2 ${className}`}>
      <Image src={src} alt={alt} width={660} height={1434} sizes="(min-width: 1024px) 220px, 34vw" priority={priority} className="aspect-[1320/2868] w-full rounded-[1.6rem] bg-muted object-cover sm:rounded-[2rem]" />
    </div>
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
        FreeMathCamp, answered
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
