import type { Metadata } from "next";
import { LegalLink, LegalPage, LegalSection, LegalSubhead } from "@/components/legal/legal-page";
import { AUTHOR, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The terms for Free Math Camp, a free course in the maths you need before calculus. Governed by the laws of England and Wales, with the mandatory consumer protections of the country where you live left in place.",
  alternates: { canonical: "/terms" },
};

const SECTIONS = [
  { id: "agreement", title: "This agreement" },
  { id: "free", title: "The course is free" },
  { id: "who", title: "Who can use it" },
  { id: "account", title: "Your account" },
  { id: "course", title: "Using the course" },
  { id: "answers", title: "Your answers" },
  { id: "material", title: "Our material" },
  { id: "use", title: "Acceptable use" },
  { id: "google", title: "Google" },
  { id: "privacy", title: "Privacy" },
  { id: "availability", title: "Availability and changes" },
  { id: "nature", title: "What the course is" },
  { id: "liability", title: "Liability" },
  { id: "closing", title: "Closing the account" },
  { id: "law", title: "Law and courts" },
  { id: "contact", title: "Contact" },
] as const;

const list = "list-disc space-y-1.5 pl-5";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated="1 November 2026"
      sections={SECTIONS}
      lede={
        <>
          <p>
            These terms are the agreement between you and <span className="text-foreground">{AUTHOR.name}</span> for the course at <LegalLink href={SITE.url}>freemathcamp.app</LegalLink>. The course is free. Creating an account means you agree to these terms and have read the <LegalLink href="/privacy">Privacy policy</LegalLink>.
          </p>
        </>
      }
    >
      <LegalSection id="agreement" title="This agreement">
        <p>
          <span className="text-foreground">{AUTHOR.name}</span> is the other party to this agreement. He created the course. He is a private individual, not a company or an organisation. Free Math Camp is the name of the course. Contact <LegalLink href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</LegalLink>. If you need a postal address for a formal notice, ask and he will provide one.
        </p>
        <p>
          Before you create an account, these terms tell you who we are, what the course is, that the price is zero, that there is no subscription term, and how to close the account. That is the information a distance contract is meant to give you up front, including under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 in the United Kingdom.
        </p>
        <p>If you use the course for a trade, a business, or a profession, the consumer sections still apply wherever a mandatory rule says they do. Nothing in these terms is applied so as to remove a right the law says you cannot give up.</p>
      </LegalSection>

      <LegalSection id="free" title="The course is free">
        <ul className={list}>
          <li>The lessons, the practice, and saved progress are free.</li>
          <li>We do not take a payment card to open an account.</li>
          <li>We do not start a trial that becomes a subscription.</li>
          <li>We do not lock a lesson behind a paid plan.</li>
          <li>We do not sell your personal data to pay for the course.</li>
        </ul>
        <p>If we ever offer something optional and paid, it will be a separate offer with its own price. It will not be required to keep using the course these terms describe, and we will not charge this account unless you agree to that separate offer first.</p>
        <p>There is nothing to refund, because there is nothing to pay. A term that hid a fee, or that tried to add one by changing this page, would not be applied.</p>
      </LegalSection>

      <LegalSection id="who" title="Who can use it">
        <p>
          The course is for a person learning. It starts from the basics and it is used by adults and by older school students. It is not directed at children under 13. Do not create an account if you are under 13.
        </p>
        <p>
          You need to be able to enter an agreement under the law that applies to you, or a parent or guardian needs to agree for you. In the United Kingdom a person under 18 may still use the course, and the protections the law gives minors stay in place. A contract with a minor is not enforced against them where the law says it cannot be. In the EEA, if you are under the digital-consent age of your country, a parent or guardian should agree the account. The <LegalLink href="/privacy#age">Privacy policy</LegalLink> says the same thing about personal data.
        </p>
        <p>Use your own account. Do not create an account for someone else unless you are allowed to agree for them and they are at least 13, or you are their parent or guardian.</p>
      </LegalSection>

      <LegalSection id="account" title="Your account">
        <p>
          You can register with email and a password, or with Google when that option is shown. A verified email from Google signs into the account that already uses that address. An unverified address is not linked. A password has to be at least 10 characters and no more than 128. Keep it to yourself. Tell us if you think someone else is using the account.
        </p>
        <p>
          Practice and the saved plan need a confirmed email. You can change your name, password, daily goal, learning mode, and notification choices in Settings. To change the email address on the account, email us. You can download a copy of your data there, reset course progress, and delete the account. Deletion removes the account, the sessions, the linked Google identity, the learning record, and the notices, as the <LegalLink href="/privacy">Privacy policy</LegalLink> describes.
        </p>
        <p>
          We can suspend or close an account that breaks these terms, that is being used to attack the service, or that the law requires us to close. Where we can do so safely, we will tell you the reason first and let you ask for a copy of your data. We will act first where waiting would leave the service, or another person, at risk. Closing an account for misuse does not by itself delete a copy you already downloaded.
        </p>
      </LegalSection>

      <LegalSection id="course" title="Using the course">
        <p>
          Lessons explain an idea, show it, and then practise it. Problems are generated for you. In the default mode, Path mode, lessons open in order: a lesson unlocks when you finish a practice session on the one before it. Audit mode opens every lesson, and you can switch at any time. The public lesson pages can be read without an account.
        </p>
        <p>
          A session is marked from your answers. Mastery, struggle, review dates, and the daily plan are a learning record for you. They are not a qualification, a certificate, a grade, or a reference we give to a school or an employer. Do not present them as one.
        </p>
        <p>The course is built to be used in a browser. A phone can open it. The layout is most comfortable on a larger screen.</p>
      </LegalSection>

      <LegalSection id="answers" title="Your answers">
        <p>
          You keep any rights you have in what you type. You give us a licence to host it, show it back to you, and use it to mark the practice and to update the learning record, for as long as the account exists, and only so we can provide the course. The licence ends when the answers are deleted, apart from a backup copy that ages out on the host’s backup cycle.
        </p>
        <p>We do not publish your answers, sell them, or offer them as training data.</p>
        <p>You agree that what you submit is yours to submit, and that it does not include another person’s personal data, a secret, or anything you are not allowed to store with us. Answers are maths. They are not a place to store a password or someone else’s information.</p>
      </LegalSection>

      <LegalSection id="material" title="Our material">
        <p>
          The lesson text, diagrams, problem generators, worked examples, and the site design belong to {AUTHOR.name}, or are used with his permission. He gives you a personal, non-exclusive licence to use them while you take the course, for your own learning. You may keep copies of your own answers.
        </p>
        <p>Do not republish the lessons as your own course, scrape the site to build a competing product, or strip attribution from material that carries it. You may link to a public lesson.</p>
        <LegalSubhead>Copyright notices</LegalSubhead>
        <p>
          If you believe material on the site infringes a copyright you hold, email <LegalLink href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</LegalLink> with:
        </p>
        <ul className={list}>
          <li>the page, and a description of the material</li>
          <li>the work you say is infringed</li>
          <li>your contact details</li>
          <li>a statement that you believe the use is not authorised, made in good faith</li>
          <li>a statement that the notice is accurate, and that you are the rightsholder or allowed to act for them</li>
          <li>your name, as a signature</li>
        </ul>
        <p>
          We will review the notice and remove or restrict material that infringes. This is a notice process for the United Kingdom and, where it applies, a notice under the US Digital Millennium Copyright Act. It is not a registration with a copyright office. If you are in the United States and you want a counter-notice after a removal, reply to the same address with the material, where it appeared, a statement under penalty of perjury that the removal was a mistake, your contact details, and consent to the jurisdiction the DMCA requires. We will follow the process the statute sets out.
        </p>
      </LegalSection>

      <LegalSection id="use" title="Acceptable use">
        <p>Use the course to learn. In particular, do not:</p>
        <ul className={list}>
          <li>Probe, scan, or try to break the service, or use it to reach the server, another account, or anyone else’s data</li>
          <li>Overload the site, or automate requests in a way that degrades it for other people</li>
          <li>Try to access an account that is not yours</li>
          <li>Upload malware, or anything whose purpose is to harm the service or another person</li>
          <li>Use the course to harass, or to store unlawful material</li>
          <li>Present progress as a credential issued by us</li>
          <li>Resell access, or frame the course so that it looks like someone else’s product</li>
        </ul>
        <p>We may remove an answer or end a session that does this. For a mistake that does not put other people at risk, we will tell you and give you a chance to stop, where the law and the safety of the service allow it.</p>
      </LegalSection>

      <LegalSection id="google" title="Google">
        <p>
          The Google button is optional. Google provides its own service under its own terms, and Google is responsible for that service. An outage or a decision on Google’s side is Google’s. You can use email and a password instead. If the account started with Google, you can add a password later from Settings.
        </p>
      </LegalSection>

      <LegalSection id="privacy" title="Privacy">
        <p>
          The <LegalLink href="/privacy">Privacy policy</LegalLink> explains the personal data we use. It is the notice for the UK GDPR, the Data Protection Act 2018, and the EU GDPR, and it states the US, Canadian, Australian, Brazilian, and Swiss rights we honour. These terms do not reduce the rights in that policy. The hosts that store the site and the database do so as our processors, on the data processing terms the policy describes.
        </p>
        <p>
          Reminder emails can be stopped from the unsubscribe link in the message. Security email about the account continues while the account exists. Push notifications are sent only if you allow them on the device.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="Availability and changes">
        <p>We aim to keep the course available. Maintenance, a host failure, or a legal duty can take a page offline for a time. We do not promise uninterrupted access, and we do not promise that a particular lesson will stay unchanged forever.</p>
        <p>
          We may correct a lesson, a problem, or the way a score is explained. A correction will not be used to remove mastery you have already earned, except where a broken check marked a wrong answer as right, and we will say so when that happens.
        </p>
        <p>
          We may update these terms. The page will show a new date. If a change materially reduces the free course, or adds a restriction that affects why you joined, we will post it before it takes effect. You can delete the account if you do not want the new terms. Using the course after that date means you accept the update, except where the law requires a clearer agreement. An update will not add a fee to this account.
        </p>
        <p>If we close the course, we will say so on the site beforehand when we can, and you can ask for a copy of your data before the closing date.</p>
      </LegalSection>

      <LegalSection id="nature" title="What the course is">
        <p>
          The course is practice in the maths used before calculus. It is educational. It is not a programme from an accredited institution, not a school, and not professional, financial, medical, or examination advice. It is not an offer of a grade, a place at a college, a job, or a particular result. You decide how you use what you practise. Work you submit to a school or an exam board is governed by that institution’s rules, not by these terms.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="Liability">
        <p>
          You keep every right that a contract is not allowed to take away. That includes liability for death or personal injury caused by negligence, liability for fraud or fraudulent misrepresentation, and any mandatory consumer or data-protection right in the United Kingdom, the European Economic Area, Switzerland, the United States, or the country where you live.
        </p>
        <LegalSubhead>Consumer rights</LegalSubhead>
        <p>
          If you are a consumer in the United Kingdom, the Consumer Rights Act 2015 and the unfair-terms rules still apply, including the bar on terms that hide a fee or that deny a statutory right. Digital content must be of satisfactory quality, fit for purpose, and as described, to the extent those duties apply to a free service. In the EEA, the mandatory rules on unfair terms still apply, and so do the rules on digital content and digital services where they cover a free service, including where personal data is part of the bargain and the law treats it that way.
        </p>
        <p>
          If you live in the United States, you keep any consumer, privacy, or warranty right a federal or state law says a contract cannot take away. These terms do not require arbitration, and they do not waive a class action where the law of your state says that waiver is ineffective.
        </p>
        <LegalSubhead>Other loss</LegalSubhead>
        <p>
          Outside those rights, we are liable for direct loss that was a foreseeable result of our breaking these terms, or of our failing to use reasonable care and skill. We are not liable for loss of profit, loss of business, loss of data you did not keep a copy of, or other indirect or consequential loss, to the extent the law allows that limit. The course is free, so a foreseeable direct loss will often be limited. A court can still award what the law requires.
        </p>
        <p>Keep your own copy of work you care about, as well as the copy on the account. Settings can download the copy we hold.</p>
      </LegalSection>

      <LegalSection id="closing" title="Closing the account">
        <p>You may delete the account at any time in Settings, or by emailing us. Deletion is immediate. There is no charge.</p>
        <p>
          If you live in the United Kingdom or the EEA and a statutory cooling-off right applies to this free service, you can cancel within 14 days of creating the account by deleting it or writing to us. There is nothing to return and nothing to refund. We do not ask you to give up that right as a condition of opening the account. If you ask us to start providing the course during those 14 days, which is what creating an account and practising does, cancellation still closes the account. It does not create a fee.
        </p>
        <p>
          We are not signed up to an alternative dispute resolution scheme, and we are not obliged to use one. You can still email us. You can also complain to a consumer authority, or to a data-protection authority, where you have that right. In the UK the data-protection authority is the Information Commissioner’s Office, and consumer advice is available from Citizens Advice.
        </p>
      </LegalSection>

      <LegalSection id="law" title="Law and courts">
        <p>These terms are governed by the laws of England and Wales.</p>
        <p>
          If you live in the United Kingdom or the European Economic Area, you keep the mandatory protections of the country where you live, and you may bring a claim in the courts of that country. We may bring a claim in the courts of your country of residence, or in the courts of England and Wales. This section leaves in place any right to a local court that the law says you cannot give up.
        </p>
        <p>
          If you live in the United States or somewhere else, you can still bring a claim where a local mandatory rule says the courts of your country, or of your state, must be open to you. Otherwise the courts of England and Wales decide disputes under these terms.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          Email <LegalLink href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</LegalLink>. The <LegalLink href="/privacy">Privacy policy</LegalLink> explains personal data, including how to complain to a supervisory authority.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
