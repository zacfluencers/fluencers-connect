import Link from "next/link";
import { LegalLayout, Section } from "@/components/LegalLayout";

export const metadata = { title: "Terms of Service - Fluencers Connect" };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="10 July 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Influencer
        Connect (the &ldquo;Service&rdquo;), a marketplace operated by Fluencers
        Group (&ldquo;Fluencers Group&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo; or
        &ldquo;our&rdquo;). By creating an account or using the Service, you agree
        to these Terms. If you do not agree, please do not use the Service.
      </p>

      <Section n={1} title="What Fluencers Connect is">
        <p>
          Fluencers Connect is a two-sided marketplace that connects
          &ldquo;Brands&rdquo; (businesses looking to book content) with
          &ldquo;Creators&rdquo; (individuals who produce content such as UGC,
          event coverage and B-roll). We provide the platform, booking tools and
          payment handling. We are not the employer, agent or partner of any
          Creator or Brand, and the actual content work is agreed directly between
          the Brand and the Creator.
        </p>
      </Section>

      <Section n={2} title="Eligibility and accounts">
        <p>
          You must be at least 18 years old and able to form a binding contract to
          use the Service. You are responsible for the accuracy of the information
          you provide, for keeping your login details secure, and for all activity
          that happens under your account. Tell us promptly if you suspect
          unauthorised use.
        </p>
      </Section>

      <Section n={3} title="Brand subscriptions">
        <p>
          Some Brand features require a paid subscription. Subscription prices,
          billing frequency (weekly or annual) and what&rsquo;s included are shown
          at checkout. Subscriptions are billed through our payment provider,
          Stripe, and renew automatically until cancelled. You can cancel at any
          time from your billing settings; cancellation stops future renewals but
          does not refund the current period unless required by law.
        </p>
      </Section>

      <Section n={4} title="Bookings, payments and escrow">
        <p>
          When a Brand books a Creator, payment is taken up front through Stripe
          and held securely (in escrow) until the work is delivered and approved.
          Once the Brand approves the delivered content, the funds are released to
          the Creator&rsquo;s connected Stripe account, minus our platform fee.
          Our current platform fee is 10% of the booking value; we&rsquo;ll always
          show the amounts before you confirm.
        </p>
        <p>
          Creators receive payouts through Stripe Connect and must complete
          Stripe&rsquo;s onboarding (including identity and bank details) before
          they can be paid. Payout timing is governed by Stripe.
        </p>
      </Section>

      <Section n={5} title="Cancellations and refunds">
        <p>
          If a booking is cancelled or declined before the work is approved, the
          held funds are refunded to the Brand. Once content has been approved and
          released to the Creator, the booking is generally final. Nothing in these
          Terms removes any refund or cancellation rights you have under applicable
          consumer law.
        </p>
      </Section>

      <Section n={6} title="Content and intellectual property">
        <p>
          Creators keep ownership of content they produce unless they agree
          otherwise with a Brand. By delivering content through a booking, a
          Creator grants the booking Brand the licence to use that content as
          described in the booking. You are responsible for ensuring you have the
          rights to anything you upload, and for not infringing anyone
          else&rsquo;s intellectual property.
        </p>
      </Section>

      <Section n={7} title="Acceptable use">
        <p>You agree not to use the Service to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>break the law or infringe others&rsquo; rights;</li>
          <li>post false, misleading, harmful, hateful or explicit content;</li>
          <li>
            take payments or communications off-platform to avoid fees or evade
            our protections;
          </li>
          <li>
            attempt to disrupt, reverse-engineer, scrape or gain unauthorised
            access to the Service;
          </li>
          <li>impersonate anyone or misrepresent your affiliation.</li>
        </ul>
        <p>
          We may suspend or remove accounts that breach these Terms or put other
          users at risk.
        </p>
      </Section>

      <Section n={8} title="Our role and disclaimers">
        <p>
          We provide the platform &ldquo;as is&rdquo;. We do not guarantee the
          quality, legality or outcome of any booking, or the conduct of any Brand
          or Creator. While we handle payments and hold funds in escrow to reduce
          risk, disputes about the work itself are ultimately between the Brand and
          the Creator. We may help resolve disputes but are not obliged to.
        </p>
      </Section>

      <Section n={9} title="Limitation of liability">
        <p>
          Nothing in these Terms limits liability that cannot be limited by law
          (such as for death or personal injury caused by negligence, or for
          fraud). Subject to that, we are not liable for indirect or consequential
          loss, and our total liability to you for any claim relating to the
          Service is limited to the greater of the fees you paid us in the three
          months before the claim, or £100.
        </p>
      </Section>

      <Section n={10} title="Suspension and termination">
        <p>
          You can stop using the Service and close your account at any time. We may
          suspend or end your access if you breach these Terms, if required by law,
          or to protect the Service or other users. Terms that by their nature
          should survive termination (such as payment obligations and liability
          limits) will continue to apply.
        </p>
      </Section>

      <Section n={11} title="Changes to these Terms">
        <p>
          We may update these Terms from time to time. If we make material changes
          we&rsquo;ll take reasonable steps to let you know. Continuing to use the
          Service after changes take effect means you accept the updated Terms.
        </p>
      </Section>

      <Section n={12} title="Governing law">
        <p>
          These Terms are governed by the laws of England and Wales, and the courts
          of England and Wales have exclusive jurisdiction, except where applicable
          consumer law gives you the right to bring a claim elsewhere.
        </p>
      </Section>

      <Section n={13} title="Contact us">
        <p>
          Questions about these Terms? Email us at{" "}
          <a
            href="mailto:jonathan@fluencersgroup.com"
            className="text-[var(--accent-2)] underline-offset-4 hover:underline"
          >
            jonathan@fluencersgroup.com
          </a>
          . See also our{" "}
          <Link
            href="/privacy"
            className="text-[var(--accent-2)] underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </Section>
    </LegalLayout>
  );
}
