import type { Metadata } from "next";
import { LegalLink, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { AUTHOR } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support",
  description: "Help with FreeMathCamp on the web, iPhone and iPad: signing in, your progress, notifications, and deleting your account.",
  alternates: { canonical: "/support" },
};

const SECTIONS = [
  { id: "contact", title: "Get in touch" },
  { id: "signing-in", title: "Signing in" },
  { id: "progress", title: "Your progress" },
  { id: "app", title: "The iPhone and iPad app" },
  { id: "notifications", title: "Reminders and notifications" },
  { id: "delete", title: "Deleting your account" },
] as const;

const list = "list-disc space-y-1.5 pl-5";

export default function SupportPage() {
  return (
    <LegalPage
      title="Support"
      updated="7 November 2026"
      sections={SECTIONS}
      lede={
        <p>
          Stuck on something, found a mistake in a lesson, or have an idea? This page covers the common questions. If it doesn’t answer yours, email{" "}
          <LegalLink href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</LegalLink> and you’ll get a reply from the person who builds FreeMathCamp.
        </p>
      }
    >
      <LegalSection id="contact" title="Get in touch">
        <p>
          Email <LegalLink href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</LegalLink>. It helps to say whether you’re on the website or the app, and which lesson or screen you were on. For a problem that looks wrong, a screenshot is the quickest way to show it.
        </p>
        <p>Replies usually come within a couple of days.</p>
      </LegalSection>

      <LegalSection id="signing-in" title="Signing in">
        <ul className={list}>
          <li>You can sign in with email and a password, with Google, or (in the app) with Apple. All of them lead to the same account if they use the same email address.</li>
          <li>
            Forgotten your password? If you first signed up with Google or Apple, use that button instead. Otherwise, email us from the address on the account and we’ll help you back in.
          </li>
          <li>If you chose “Hide my email” with Apple, your account uses Apple’s private relay address. Sign in with Apple again to reach it.</li>
          <li>Practice needs a confirmed email address. Check your inbox (and spam folder) for the confirmation link, or tap Resend email to get a new one.</li>
        </ul>
      </LegalSection>

      <LegalSection id="progress" title="Your progress">
        <p>
          Your lessons, practice history, mastery and reviews are saved to your account, not to the device, so they follow you between the website and the app. If something looks out of date, pull down to refresh in the app, or reload the page on the web.
        </p>
        <p>Settings has a Reset progress option if you want to start the course again. It clears your progress but keeps your account.</p>
      </LegalSection>

      <LegalSection id="app" title="The iPhone and iPad app">
        <ul className={list}>
          <li>The app needs iOS 16.4 or later and an internet connection, since every answer is checked by the server.</li>
          <li>It has the same course, practice, daily plan, leagues and progress as the website.</li>
          <li>Light and dark mode follow your device, or you can choose one in Settings.</li>
          <li>If a lesson doesn’t load, check your connection and try again. If it keeps happening, email us with the lesson’s name.</li>
        </ul>
      </LegalSection>

      <LegalSection id="notifications" title="Reminders and notifications">
        <p>
          FreeMathCamp can remind you to practise and tell you about milestones. Turn either off in Settings. On iPhone and iPad you can also turn notifications off for FreeMathCamp in the Settings app. Reminder emails have an unsubscribe link at the bottom.
        </p>
      </LegalSection>

      <LegalSection id="delete" title="Deleting your account">
        <p>
          Go to Settings, then Your data, then Delete account, on the website or in the app. This permanently removes your account and learning record, and if you used Sign in with Apple it also ends the app’s access to your Apple ID. It can’t be undone. You can also ask by email and we’ll do it for you. The{" "}
          <LegalLink href="/privacy">privacy policy</LegalLink> explains what we keep and for how long.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
