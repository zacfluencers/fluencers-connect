import Link from "next/link";
import { LegalLayout, Section } from "@/components/LegalLayout";

export const metadata = { title: "Privacy Policy — Fluencers Connect" };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="10 July 2026">
      <p>
        This Privacy Policy explains how Fluencers Group (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects and uses your personal data
        when you use Fluencers Connect (the &ldquo;Service&rdquo;). We are the
        data controller. We are based in the United Kingdom and handle your data in
        line with UK GDPR and the Data Protection Act 2018.
      </p>

      <Section n={1} title="Data we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-[var(--foreground)]">Account details</strong> —
            your name, email address, password (stored encrypted) and whether
            you&rsquo;re a Brand or Creator.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">Profile information</strong>{" "}
            — anything you add to your profile, such as company details, bio,
            niche, rates, images/logo, and your social handles.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">Social data</strong> — when
            you connect a public Instagram or TikTok handle, we retrieve public
            profile data (such as follower counts, avatar and engagement) to
            populate your profile.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">Payment data</strong> —
            bookings, subscriptions and payouts are processed by Stripe. We
            don&rsquo;t store your full card or bank details; Stripe does, as a
            separate controller.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">Content and messages</strong>{" "}
            — bookings, briefs, delivered content, and messages you send through
            the Service.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">Technical data</strong> —
            basic usage information, cookies needed to keep you signed in, and
            limited diagnostic data if something goes wrong.
          </li>
        </ul>
      </Section>

      <Section n={2} title="How and why we use it">
        <p>We use your data to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>provide the Service, your account, bookings and payments (to perform our contract with you);</li>
          <li>send service emails such as booking updates and messages (contract / legitimate interests);</li>
          <li>keep the Service secure, prevent fraud and fix problems (legitimate interests);</li>
          <li>comply with our legal and tax obligations (legal obligation).</li>
        </ul>
        <p>
          We do not sell your personal data.
        </p>
      </Section>

      <Section n={3} title="Who we share it with (sub-processors)">
        <p>
          We use trusted providers to run the Service. Each only processes data as
          needed to provide their service:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong className="text-[var(--foreground)]">Stripe</strong> — payments, subscriptions and creator payouts.</li>
          <li><strong className="text-[var(--foreground)]">Supabase</strong> — database, authentication and file storage.</li>
          <li><strong className="text-[var(--foreground)]">Vercel</strong> — hosting of the Service.</li>
          <li><strong className="text-[var(--foreground)]">Resend</strong> — sending account and notification emails.</li>
          <li><strong className="text-[var(--foreground)]">Sentry</strong> — error monitoring to keep the Service reliable.</li>
          <li><strong className="text-[var(--foreground)]">ScrapeCreators</strong> — retrieving public social-profile data you choose to connect.</li>
          <li><strong className="text-[var(--foreground)]">Sanity</strong> — managing website content.</li>
        </ul>
      </Section>

      <Section n={4} title="Cookies">
        <p>
          We use only the cookies needed to run the Service — mainly to keep you
          signed in and secure. We don&rsquo;t use advertising or third-party
          tracking cookies.
        </p>
      </Section>

      <Section n={5} title="International transfers">
        <p>
          Some of our providers process data outside the UK. Where they do, we rely
          on appropriate safeguards (such as UK-approved transfer mechanisms) to
          protect your data.
        </p>
      </Section>

      <Section n={6} title="How long we keep it">
        <p>
          We keep your data for as long as your account is active and as needed to
          provide the Service. After you close your account we delete or anonymise
          your data, except where we need to keep certain records (for example,
          transaction records for tax and legal reasons).
        </p>
      </Section>

      <Section n={7} title="Your rights">
        <p>Under UK GDPR you have the right to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>access the personal data we hold about you;</li>
          <li>correct inaccurate data;</li>
          <li>ask us to delete your data;</li>
          <li>object to or restrict certain processing;</li>
          <li>receive a copy of your data in a portable format.</li>
        </ul>
        <p>
          To exercise any of these, email{" "}
          <a
            href="mailto:jonathan@fluencersgroup.com"
            className="text-[var(--accent-2)] underline-offset-4 hover:underline"
          >
            jonathan@fluencersgroup.com
          </a>
          . You also have the right to complain to the UK&rsquo;s Information
          Commissioner&rsquo;s Office (ICO) at{" "}
          <a
            href="https://ico.org.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-2)] underline-offset-4 hover:underline"
          >
            ico.org.uk
          </a>
          .
        </p>
      </Section>

      <Section n={8} title="Security">
        <p>
          We take reasonable technical and organisational measures to protect your
          data, including encryption in transit, encrypted passwords and access
          controls. No online service can be completely secure, but we work to keep
          your data safe.
        </p>
      </Section>

      <Section n={9} title="Children">
        <p>
          The Service is for people aged 18 and over. We do not knowingly collect
          data from children.
        </p>
      </Section>

      <Section n={10} title="Changes and contact">
        <p>
          We may update this policy from time to time; the &ldquo;last
          updated&rdquo; date above shows when. For any privacy questions or
          requests, contact us at{" "}
          <a
            href="mailto:jonathan@fluencersgroup.com"
            className="text-[var(--accent-2)] underline-offset-4 hover:underline"
          >
            jonathan@fluencersgroup.com
          </a>
          . See also our{" "}
          <Link
            href="/terms"
            className="text-[var(--accent-2)] underline-offset-4 hover:underline"
          >
            Terms of Service
          </Link>
          .
        </p>
      </Section>
    </LegalLayout>
  );
}
