import type { Metadata } from "next";
import { LegalLink, LegalPage, LegalSection, LegalSubhead } from "@/components/legal/legal-page";
import { AUTHOR, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How FreeMathCamp uses personal data. Written for UK law first, and for learners in the EEA, Switzerland, the United States and elsewhere. The course is free. We do not sell personal data or use it for advertising.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  { id: "who", title: "Who is responsible" },
  { id: "free", title: "Free, and what that means" },
  { id: "laws", title: "Which laws apply" },
  { id: "data", title: "What we hold" },
  { id: "why", title: "Why we use it" },
  { id: "notices", title: "Messages we send" },
  { id: "storage", title: "Storage on your device" },
  { id: "sharing", title: "Who else handles it" },
  { id: "transfers", title: "Where the data is" },
  { id: "retention", title: "How long we keep it" },
  { id: "security", title: "How we protect it" },
  { id: "europe", title: "Rights in the UK and Europe" },
  { id: "united-states", title: "Rights in the United States" },
  { id: "elsewhere", title: "Other countries" },
  { id: "age", title: "Age" },
  { id: "changes", title: "Changes" },
  { id: "contact", title: "Contact and complaints" },
] as const;

const list = "list-disc space-y-1.5 pl-5";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="1 November 2026"
      sections={SECTIONS}
      lede={
        <>
          <p>
            This policy explains what personal data <span className="text-foreground">FreeMathCamp</span> uses, and why. It covers the course at{" "}
            <LegalLink href={SITE.url}>freemathcamp.app</LegalLink>. The course is free. We do not take a payment card, sell personal data, or use it for advertising.
          </p>
          <p>
            The same promises are in the <LegalLink href="/terms">Terms</LegalLink>.
          </p>
        </>
      }
    >
      <LegalSection id="who" title="Who is responsible">
        <p>
          <span className="text-foreground">{AUTHOR.name}</span> created FreeMathCamp and is the controller of your personal data. He is a private individual, not a company or an organisation. In this policy, “we” means him. He decides why an account exists and what data is needed to run the course. FreeMathCamp is the name of the site. It is not a registered company.
        </p>
        <p>
          Email <LegalLink href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</LegalLink> for any privacy request. You do not need a special form. If you need a postal address for a formal notice, ask and he will provide one.
        </p>
        <p>
          If the law requires a representative in the United Kingdom or the European Economic Area, we will publish their name and contact details on this page. You can use your rights by writing to us directly. There is no Data Protection Officer, because the course does not meet the tests that require one.
        </p>
      </LegalSection>

      <LegalSection id="free" title="Free, and what that means for your data">
        <p>The lessons, the practice, and saved progress are free. Creating an account does not start a trial or a subscription, and we do not ask for a card.</p>
        <p>We do not sell personal data, rent a marketing list, or show ads. There is no paid tier holding a lesson back. We do not send a newsletter, and we do not email you about anyone else’s products.</p>
        <p>
          Messages we do send are about this course: confirming your email, security notices about the account, and, unless you turn them off, a small number of practice reminders. The <LegalLink href="#notices">messages section</LegalLink> says which is which.
        </p>
      </LegalSection>

      <LegalSection id="laws" title="Which laws apply">
        <p>We offer the course internationally. The rights below follow the law that applies to you. Where more than one law applies, we follow the one that gives you the stronger protection on that point.</p>
        <LegalSubhead>United Kingdom</LegalSubhead>
        <p>
          The UK GDPR and the Data Protection Act 2018 apply if you are in the United Kingdom, including the amendments to those laws that are in force. The Information Commissioner’s Office is the supervisory authority. We do not process special-category data, such as health, religion, or biometrics used to identify you, and we do not process criminal-offence data. Part 3 of the Data Protection Act 2018, which covers law enforcement processing, does not apply to this course.
        </p>
        <p>
          The Privacy and Electronic Communications Regulations 2003 cover cookies, similar storage, and electronic mail. The <LegalLink href="#storage">storage section</LegalLink> says what the browser keeps. The <LegalLink href="#notices">messages section</LegalLink> says which emails you can stop.
        </p>
        <LegalSubhead>European Economic Area and Switzerland</LegalSubhead>
        <p>
          The EU General Data Protection Regulation (Regulation (EU) 2016/679) applies when we offer the course to you in the EEA. You can complain to the supervisory authority where you live, where you work, or where you believe a problem happened. In Switzerland the Federal Act on Data Protection applies. The access, correction, deletion, and complaint rights in the UK and Europe section are how you use those laws with us. The ePrivacy rules cover storage on your device in the same way as the UK regulations.
        </p>
        <LegalSubhead>United States and other countries</LegalSubhead>
        <p>
          There is no single US federal privacy law for a course like this. California’s Consumer Privacy Act, as amended by the CPRA, and the similar comprehensive privacy laws in other US states, are in the <LegalLink href="#united-states">United States section</LegalLink>. The Children’s Online Privacy Protection Act protects children under 13. Canada’s PIPEDA, Australia’s Privacy Act, and Brazil’s LGPD are in the <LegalLink href="#elsewhere">other countries section</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection id="data" title="What we hold">
        <p>We collect the data needed to run an account and the course. We do not buy data about you. You can read the public lessons without an account. Your answers are not on those pages.</p>
        <LegalSubhead>Account</LegalSubhead>
        <p>
          Name, email address, the time the account was created, and whether the email is confirmed. We also store a daily goal, a learning mode (lessons in order, or every lesson open), a timezone taken from your browser (UTC until then) so reminders arrive in your daytime, whether practice reminders, progress notices and reminder emails are on, when you finished the short introduction, and when you were last active. If Google sends a picture link, we store the link. We do not analyse the picture.
        </p>
        <LegalSubhead>Password</LegalSubhead>
        <p>If you set a password, we store an Argon2id hash. We do not store the password itself. A password has to be at least 10 characters. An email confirmation link stores a SHA-256 hash of a token that works once and expires in 24 hours.</p>
        <LegalSubhead>Google</LegalSubhead>
        <p>
          Google sign-in is optional. If you use it, we ask Google for the openid, email and profile scopes. We receive Google’s user id, your name, a verified email address, and a picture link when Google sends one. An email Google has not verified is not used to create or link an account. The user id stays on the account, so a later change of email still signs you into the same account. We do not receive a password from Google. Google is a separate controller for its own service. Its notice is <LegalLink href="https://policies.google.com/privacy">Google’s privacy policy</LegalLink>.
        </p>
        <LegalSubhead>Learning record</LegalSubhead>
        <p>Practice is generated for you. For each session we store the course, the lesson, the mode (learn, review or challenge), the problem seeds and difficulty, when it started and finished, and the mastery estimate before and after.</p>
        <p>For each problem we store your answer, whether it was right, how long it took, how many attempts were wrong, whether you used a hint or revealed the solution, a struggle score, and the mastery estimate after that problem. Across a lesson we store mastery, struggle, items seen, clean solves, review timing, and when you last opened the lesson.</p>
        <p>
          The progress page is calculated from that record: what you have practised, where you struggle, and what to do next. The daily plan, the difficulty steps, and the review dates are teaching tools. They are not a profile we sell, and they are not used to decide anything outside the course. We do not publish your answers, and we do not offer them as training data.
        </p>
        <LegalSubhead>Notifications</LegalSubhead>
        <p>
          The account can hold short notices: security events, progress milestones, and practice reminders. Each one stores a title, a short body, a link inside the course, when it was created, and whether you have seen, read, kept or dismissed it. If you allow notifications on a device, we store the address that device’s push service gives us (a browser push endpoint, or an Apple push token if you use a FreeMathCamp app), the keys needed to send to that address, and a short note of the browser or app. We also store a random id so a reminder email can turn reminder emails off without signing in. That id is not a password.
        </p>
        <LegalSubhead>Session</LegalSubhead>
        <p>
          A signed-in browser holds a random token in an httpOnly cookie. We store a SHA-256 hash of that token, with an expiry 30 days ahead. The expiry slides forward while you use the course. With the session we store the IP address and a user-agent string, shortened, so we can show you a new sign-in and so you can sign other devices out. Signing out deletes that session on the server and removes the cookie.
        </p>
        <LegalSubhead>Connection data</LegalSubhead>
        <p>
          Vercel, which hosts the website, and the server that hosts the API and the database, may record an IP address, the time of a request, and ordinary request details such as the browser. We use those logs to deliver the course, apply rate limits, and look into abuse. We do not run a separate analytics product, and we do not add those logs to an advertising profile.
        </p>
      </LegalSection>

      <LegalSection id="why" title="Why we use it">
        <p>Each use has a basis in the UK GDPR and the EU GDPR.</p>
        <LegalSubhead>Running the course</LegalSubhead>
        <p>
          Account details, sessions, the learning record, and the notices that make the course work are used to provide the lessons, the practice, the progress page, and the daily plan. The basis is contract, Article 6(1)(b). You ask for an account, and this is the data needed to provide it. The learning record evaluates how the maths is going. That is profiling in the data-protection sense, and it stays inside the course.
        </p>
        <LegalSubhead>Google sign-in</LegalSubhead>
        <p>When you use the Google button, we use the profile fields Google sends so we can open or link your account. The basis is the same contract, limited to that sign-in.</p>
        <LegalSubhead>Security and abuse</LegalSubhead>
        <p>
          We use the account, the session’s IP address and user agent, and short-lived host logs to keep the service up, protect accounts, tell you about a new sign-in, and stop misuse. The basis is legitimate interests, Article 6(1)(f). The interest is a free course that stays available, and an account that stays yours. You can object. We will stop unless we have a compelling reason to continue, such as investigating abuse of the service.
        </p>
        <LegalSubhead>Legal duties</LegalSubhead>
        <p>We use the data a duty requires when we answer a privacy right, keep a record the law tells us to keep, or send a breach notice. The basis is legal obligation, Article 6(1)(c).</p>
        <p>
          We do not use your data for advertising. We do not use consent as a substitute for the contract that runs the course. If we ever wanted a new use that the law treats as optional, we would ask first, and refusing would leave the course in place.
        </p>
        <LegalSubhead>Decisions about you</LegalSubhead>
        <p>
          A mastery estimate, a review date, and the next lesson in the plan are feedback on practice. They do not affect a job, credit, insurance, an exam board, a school grade, or a legal right. The course is not run under Article 22 of the UK GDPR or the EU GDPR. You can still ask us to explain the record, and you can reset it or delete the account.
        </p>
      </LegalSection>

      <LegalSection id="notices" title="Messages we send">
        <p>We use Resend to deliver email. The address on the account is the only address we write to.</p>
        <LegalSubhead>About the account</LegalSubhead>
        <p>
          Creating an account with email sends one message so you can confirm the address. The link works once and expires in 24 hours. Security notices are also emailed while the account exists: a new sign-in, Google linked, a password set or changed, other devices signed out, and course progress reset. These are about access to the account. They are not a mailing list, and they stay on so we can tell you if someone else uses the account. You can stop them by deleting the account.
        </p>
        <LegalSubhead>About practice</LegalSubhead>
        <p>
          Progress milestones, such as finishing a lesson, stay in the course and, if you have allowed it, on a push notification. They are not emailed. A few re-engagement reminders can be emailed when reminder emails are on: a note if you have not started, a note if you have been away, and a weekly summary. Reminder emails are on until you turn them off. Each one includes an unsubscribe link, and mail apps can unsubscribe in one click. Turning them off does not close the account and does not stop security email.
        </p>
        <p>
          In the course itself, account notices are shown regardless. Progress notices and practice reminders follow the switches on the account. Push is sent only after you allow notifications on that device. We do not buy an advertising identifier, and we do not use push for ads.
        </p>
        <p>Under the UK Privacy and Electronic Communications Regulations, and the equivalent rules in the EEA, electronic mail that promotes a service needs consent or a narrow existing-customer exception, plus an unsubscribe in every message. Reminder emails are only about this course, they carry an unsubscribe, and you can refuse them without losing the lessons. We do not send third-party marketing.</p>
      </LegalSection>

      <LegalSection id="storage" title="Storage on your device">
        <p>We do not set advertising cookies, and we do not use a third-party analytics cookie. Because the storage below is there to run the course you asked for, or to remember a display choice on the device, we do not show a consent banner for it.</p>
        <ul className={list}>
          <li>
            <span className="text-foreground">__Host-fmc_session</span> in production, or <span className="text-foreground">fmc_session</span> in development. An httpOnly, SameSite=Lax cookie. In production it is Secure and uses the __Host- prefix. It is the session token. Strictly necessary to stay signed in.
          </li>
          <li>
            <span className="text-foreground">fmc_oauth</span>. A short-lived httpOnly cookie, about 10 minutes, used only while a Google sign-in is in progress, and only on the Google callback path. It holds the check values for that sign-in. It is deleted when the sign-in finishes.
          </li>
          <li>
            <span className="text-foreground">theme</span> in the browser’s local storage. Light, dark, or match the system. It stays on the device. We do not receive it as a field on your account.
          </li>
          <li>
            <span className="text-foreground">fmc:flash</span> in session storage. A one-line message after a full-page redirect, such as account deletion. It is read once and removed.
          </li>
        </ul>
        <p>A push subscription, if you allow notifications, is stored on our server as described above. The browser or the phone keeps its own copy of that subscription.</p>
      </LegalSection>

      <LegalSection id="sharing" title="Who else handles it">
        <p>We do not sell personal data. We do not share it for cross-context behavioural advertising. The organisations below handle it so the course can run. They are processors, except Google, which is a separate controller for Google sign-in, and the push service, which delivers a message you allowed.</p>
        <ul className={list}>
          <li>
            <span className="text-foreground">Vercel</span> hosts the website. It processes requests so pages load. Its notice is <LegalLink href="https://vercel.com/legal/privacy-policy">Vercel’s privacy policy</LegalLink>.
          </li>
          <li>
            <span className="text-foreground">The server we operate</span> runs the API and the Postgres database. It stores the account and the learning record.
          </li>
          <li>
            <span className="text-foreground">Resend</span> sends the email described above. It receives the address, the message, and the headers needed to deliver it, including an unsubscribe header on reminder emails. Its notice is <LegalLink href="https://resend.com/legal/privacy-policy">Resend’s privacy policy</LegalLink>.
          </li>
          <li>
            <span className="text-foreground">Google</span>, if you choose Google sign-in. A picture link is loaded by your browser from the site that hosts the picture, and that site sees the request.
          </li>
          <li>
            <span className="text-foreground">A push service</span>, if you allow notifications. That is the browser’s push service, or Apple Push Notification service on an iPhone. It sees the device address and the message it delivers. We do not give it your learning record as a profile.
          </li>
        </ul>
        <p>
          We use hosts on written terms that require them to act on our instructions, keep the data secure, assist with privacy incidents, delete or return the data when the service ends, and allow the work to be reviewed. That contract is the data processing agreement for this course.
        </p>
        <p>
          {AUTHOR.name} is the controller of learner accounts. He does not process personal data as a school’s, an employer’s, or another organisation’s processor. An account belongs to the person who creates it. We are not a “school official” for the US Family Educational Rights and Privacy Act, and a school record is not created here unless a separate written agreement says so. We do not offer that agreement today.
        </p>
        <p>We disclose data if the law requires it, or to establish or defend a legal claim. Where the law allows us to say so first, we will.</p>
      </LegalSection>

      <LegalSection id="transfers" title="Where the data is">
        <p>You may be in a different country from the servers. Vercel processes website traffic in the United States and in other countries it publishes. Resend processes email from the United States. The API and the database run on a server we operate, which may be outside the United Kingdom and the European Economic Area. A push service delivers from its own network.</p>
        <p>
          When personal data moves from the UK or the EEA to a country without an adequacy decision, we use a transfer tool the law recognises. For the EEA that is the European Commission’s Standard Contractual Clauses. For the UK that is the International Data Transfer Agreement, or the UK Addendum to the Standard Contractual Clauses. We use hosts whose contracts include those terms. Where a transfer needs supplementary measures, we rely on the ones the contract and the law require, including encryption in transit.
        </p>
        <p>You can ask which country your account is stored in, and which safeguard applies. We will tell you.</p>
      </LegalSection>

      <LegalSection id="retention" title="How long we keep it">
        <ul className={list}>
          <li>Account, profile, linked Google identity, learning record, and notification preferences: until you delete the account in Settings, or until you ask us to delete it.</li>
          <li>Session: 30 days from the last extension, or sooner when you sign out. Sign-out deletes the session.</li>
          <li>Email confirmation token: 24 hours, or sooner when it is used.</li>
          <li>Google sign-in check cookie: about 10 minutes.</li>
          <li>Dismissed notices: deleted about 30 days after you dismiss them. Read notices you have not kept: deleted about 180 days after you read them. Notices you keep stay until you dismiss them or delete the account.</li>
          <li>Push subscription: until the push service reports that it is no longer valid, you turn notifications off on that device, or you delete the account.</li>
          <li>Host logs: for the host’s ordinary security retention, separate from your account.</li>
        </ul>
        <p>
          Deleting the account deletes the user and, with it, the sessions, the linked Google identity, the learning record, the answers, the notices, and the push subscriptions. The cookie is removed when that deletion signs you out. Display preferences can remain on the device until you clear them. They do not identify the deleted account to us.
        </p>
        <p>If a host keeps backups, they age out on that host’s backup cycle. We do not restore a deleted account into the live course. Resetting course progress clears the learning record for that course and the progress notices. It leaves the account in place.</p>
      </LegalSection>

      <LegalSection id="security" title="How we protect it">
        <p>
          In production the site and the API are served over HTTPS. Passwords are hashed with Argon2id. Session tokens are stored as SHA-256 hashes, so a copy of the database is not a list of usable tokens. Cookies are httpOnly. Google is linked only from a verified email. You can download a JSON copy of the account from Settings, and you can delete the account there. Deletion asks you to type the email on the account, and the password when one is set.
        </p>
        <p>
          If a breach creates a risk to your rights, we will tell the relevant authority and, when the law requires it, tell you. A notice to an authority is due without undue delay and, where feasible, within 72 hours of our becoming aware of the breach, as the UK GDPR and the EU GDPR require.
        </p>
      </LegalSection>

      <LegalSection id="europe" title="Your rights in the UK and Europe">
        <p>If the UK GDPR, the Data Protection Act 2018, or the EU GDPR applies, you can:</p>
        <ul className={list}>
          <li>Be told what we do with your data. This page is that notice.</li>
          <li>Access the personal data we hold about you. Settings can download a JSON file of the account, the learning record, the answers, and the notices. Email us if you need something that file does not include, such as sign-in sessions.</li>
          <li>Correct it. Settings can change the name, password, daily goal, learning mode, and notification choices. To change the email address on the account, email us. Reminder emails can be stopped from the link in the message.</li>
          <li>Delete it. Settings includes Delete account. You can also email us. Deletion covers the account, the learning record, the sessions, the linked Google identity, the notices, and the push subscriptions.</li>
          <li>Restrict what we do with it while a correction or an objection is open.</li>
          <li>Receive a portable copy. The JSON download is that copy. Email us if you need it in another ordinary format.</li>
          <li>Object to processing based on legitimate interests, including the session IP address used for security. We will stop unless we have a compelling legitimate ground, such as an open abuse investigation. Objecting to reminder emails is the unsubscribe link.</li>
          <li>Ask us not to make a decision about you based only on automated processing if that decision has a legal effect, or a similar significant effect. The learning record does not do that. See the section on why we use the data.</li>
          <li>Withdraw consent where processing is based on consent. The account itself runs on contract, not on consent. Allowing push on a device is a choice you can reverse in the browser or the phone.</li>
          <li>Complain to a supervisory authority. You can complain to us first. You do not have to.</li>
        </ul>
        <p>
          We reply within one month of a request that shows it is from you. If a request is complex, or you send several, the law lets us extend that by up to two further months, and we will tell you within the first month if we do. We may ask you to confirm you control the email on the account before we send the learning record or delete anything. We do not charge for a request the law requires us to meet. A fee or a refusal is reserved for a request that is manifestly unfounded or excessive, which is the limit the UK GDPR and the EU GDPR already set.
        </p>
        <p>These rights sit with the Data Protection Act 2018 and, in the EEA, with the GDPR. This policy does not waive them.</p>
      </LegalSection>

      <LegalSection id="united-states" title="Your rights in the United States">
        <p>
          This section uses “personal information” in the sense of the California Consumer Privacy Act, as amended by the CPRA, and the similar comprehensive privacy laws in other states, including Virginia, Colorado, Connecticut, Utah, Texas, Oregon, and any other US state whose comprehensive privacy law applies to you. We aim this course at learners in the United States as well as the United Kingdom. We do not treat a US learner as outside this policy.
        </p>
        <LegalSubhead>Categories</LegalSubhead>
        <ul className={list}>
          <li>Identifiers: name, email, account id, and a Google user id if you use Google. A random unsubscribe id if reminder emails are on.</li>
          <li>Account records: those identifiers, a password hash if you set a password, a picture link if one is stored, timezone, daily goal, and notification preferences.</li>
          <li>Education information you create on the course: answers, problem results, mastery, struggle, review dates, and the progress summary.</li>
          <li>Internet or network activity: requests to the site, host logs, and the IP address and user agent stored on a session.</li>
          <li>Approximate information you give us: a timezone. We do not collect precise geolocation.</li>
        </ul>
        <p>
          We do not collect government identifiers, financial information, or a purchase history. There is nothing to buy. We do not collect precise geolocation, and we do not use sensitive personal information to infer characteristics about you. The password hash is used only to sign you in.
        </p>
        <LegalSubhead>Sources, purposes, and disclosure</LegalSubhead>
        <p>
          We collect this information from you, and from Google if you choose Google. We use it to provide the course, to keep it secure, to send the messages described above, and to meet the law. We disclose it to the hosts named above so they can run the site, the database, and email, and to Google when you start that sign-in. We do not disclose personal information to third parties for their own direct marketing. We do not use it to track you across other companies’ apps or websites for advertising.
        </p>
        <LegalSubhead>Sale, sharing, and targeted advertising</LegalSubhead>
        <p>
          We do not sell personal information. We do not share it for cross-context behavioural advertising. We do not use it for targeted advertising. We have no actual knowledge of selling or sharing the personal information of anyone under 16. A browser Global Privacy Control signal is treated as an opt-out of sale, sharing, and targeted advertising. There is no sale, sharing, or targeted advertising to stop, and the signal does not close your account or reduce the course.
        </p>
        <LegalSubhead>Requests</LegalSubhead>
        <p>
          Depending on your state, you can ask us to confirm, access, correct, delete, and provide a portable copy of your personal information. You can opt out of sale, sharing, and targeted advertising. You can appeal a refusal by replying to our email about the request. You will not be charged, and the free course will not be reduced, because you used a privacy right. An authorised agent can ask for you if you show that the agent is allowed to act. We do not offer a financial incentive in exchange for personal information.
        </p>
        <p>
          If you are a California resident you may also ask for the categories of personal information we collected, the categories of sources, the business or commercial purpose, and the categories of third parties we disclose it to. This page is that notice. We will not discriminate against you for exercising these rights. The same email address handles a “do not sell or share” request, a deletion request, and an appeal.
        </p>
        <LegalSubhead>Children in the United States</LegalSubhead>
        <p>
          The Children’s Online Privacy Protection Act applies to personal information from children under 13. The course is not directed at children under 13, and we do not knowingly create an account for a child under 13. If you are a parent and you believe we have, email us and we will delete the account and the information collected with it. We do not condition the course on a child disclosing more information than the course needs, because we do not offer accounts to children under 13.
        </p>
        <LegalSubhead>Email</LegalSubhead>
        <p>
          The CAN-SPAM Act treats promotional email differently from transactional email. Security and confirmation messages are about the account you opened. Reminder emails are about this course, they identify FreeMathCamp, and they include a working unsubscribe. We honour an unsubscribe promptly. A postal address for a formal notice is available if you email us.
        </p>
      </LegalSection>

      <LegalSection id="elsewhere" title="Other countries">
        <p>
          Canada’s PIPEDA, Australia’s Privacy Act 1988 and the Australian Privacy Principles, and Brazil’s LGPD give people rights to be told what is collected, to access it, to correct it, and to delete it. In Brazil those rights include information about sharing, a portable copy, and information about the possibility of refusing consent and what that refusal means. If one of those laws applies to you, write to us and we will handle the request under it.
        </p>
        <p>If your country gives you a privacy right this policy has not named, write to us and we will follow the right that binds us.</p>
      </LegalSection>

      <LegalSection id="age" title="Age">
        <p>
          FreeMathCamp starts from the basics and is used by adults and by older school students getting ready for calculus. It is not directed at children under 13. Do not create an account if you are under 13. If you are under 18, a parent or guardian should know you are using it.
        </p>
        <p>
          In the United Kingdom the age of digital consent for an information society service is 13. In the EEA it is between 13 and 16, depending on the country. If you are under the age that applies where you live, a parent or guardian should be the one who agrees to the account. We do not knowingly keep an account for a child under 13. If you are a parent or guardian and you believe we have, email us and we will delete it.
        </p>
        <p>
          The UK Age Appropriate Design Code applies to online services likely to be accessed by children. A maths course that starts at place value can be opened by a child, so we treat the code as relevant and we keep the product inside it:
        </p>
        <ul className={list}>
          <li>The learning record exists to teach. It is not used to advertise, and it is not sold.</li>
          <li>We do not ask for data the course does not need. There is no public profile.</li>
          <li>We do not collect precise location. A timezone is used so a reminder can land in the daytime.</li>
          <li>Defaults do not publish your work. Reminder emails can be refused without losing the lessons.</li>
          <li>We do not use nudge patterns to extract extra data. Difficulty and reviews move because of how the practice went.</li>
          <li>A parent can email us to close an account.</li>
        </ul>
        <p>We do not profile children for advertising.</p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>
          If we change how we use personal data, we will update this page and the date at the top. A change that starts a new use, or that needs a fresh legal basis, will be described before it starts. Keeping the course free is not something we will reverse by editing this policy quietly. A charge would be a separate offer, and the <LegalLink href="/terms">Terms</LegalLink> say you would have to accept it first.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact and complaints">
        <p>
          Email <LegalLink href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</LegalLink>. We will reply.
        </p>
        <p>
          In the United Kingdom, complain to the Information Commissioner’s Office at <LegalLink href="https://ico.org.uk">ico.org.uk</LegalLink>. In the EEA, complain to the supervisory authority in your country. The European Data Protection Board publishes the <LegalLink href="https://www.edpb.europa.eu/about-edpb/about-edpb/members_en">list of authorities</LegalLink>. In Switzerland, complain to the Federal Data Protection and Information Commissioner. In California, you may also contact the California Privacy Protection Agency. Writing to us does not limit a complaint to an authority.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
