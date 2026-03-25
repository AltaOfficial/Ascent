import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata = { title: "Privacy Policy — Ascent" };

const sections = [
  {
    num: "01",
    title: "What We Collect",
    body: [
      "Ascent collects only what is necessary to operate the service. This includes account information (email address), data you voluntarily enter (tasks, compliance logs, session records, notes), and basic usage data (feature interactions, error logs) to improve the product.",
      "We do not collect biometric data, location data, or any information beyond what you explicitly provide within the App.",
    ],
  },
  {
    num: "02",
    title: "How We Use Your Data",
    body: [
      "Your data is used solely to provide and improve the Ascent experience. Specifically: to render your dashboard, power the analytics layer, and provide context to the AI Advisor when you choose to use it.",
      "We do not use your personal behavioral data for advertising. We do not sell, rent, or share your data with third parties for commercial purposes.",
    ],
  },
  {
    num: "03",
    title: "AI Advisor & Data",
    body: [
      "When you interact with the AI Advisor, your messages and the project memory context you have configured are sent to a third-party language model API (Anthropic) to generate responses. This data is subject to Anthropic's data usage policies in addition to ours.",
      "We recommend not entering sensitive personal or financial information into the Advisor beyond what is necessary for your strategic planning use case.",
    ],
  },
  {
    num: "04",
    title: "Data Storage",
    body: [
      "Your data is stored on secured cloud infrastructure. We use industry-standard encryption in transit and at rest. Access to production data is restricted to essential personnel only.",
      "During the early access period, data retention and backup policies are in active development. We recommend exporting or noting important data independently.",
    ],
  },
  {
    num: "05",
    title: "Your Rights",
    body: [
      "You have the right to access, correct, export, or delete your data at any time. To exercise any of these rights, contact us through the waitlist channel. Deletion requests will be processed within 30 days.",
    ],
  },
  {
    num: "06",
    title: "Cookies & Tracking",
    body: [
      "Ascent does not use advertising cookies or third-party tracking pixels. We may use minimal session cookies for authentication and preference persistence. No behavioral data is shared with ad networks.",
    ],
  },
  {
    num: "07",
    title: "Changes to This Policy",
    body: [
      "We may update this Privacy Policy as the product evolves. We will notify users of material changes via the email associated with your account. Continued use after notification constitutes acceptance.",
    ],
  },
  {
    num: "08",
    title: "Contact",
    body: [
      "For privacy-related questions or data requests, reach out through the Ascent waitlist contact channel. We are committed to responding within 5 business days.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-100 px-15 py-[18px] flex items-center justify-between border-b"
        style={{
          borderColor: "var(--border)",
          background: "rgba(10,10,12,0.92)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display text-[15px] font-bold tracking-[0.01em] text-text-primary no-underline"
        >
          <img src="/logo.svg" alt="Ascent" className="w-5 h-5" />
          Ascent
        </Link>
        <Link
          href="/"
          className="text-[11px] text-text-secondary tracking-[0.05em] no-underline hover:text-text-mid transition-colors duration-150"
        >
          ← Back to Ascent
        </Link>
      </nav>

      <div className="max-w-[720px] mx-auto px-15 pt-[120px] pb-[100px]">
        <div className="text-[10px] tracking-[0.15em] uppercase text-text-secondary mb-4">
          Legal
        </div>
        <h1
          className="font-display font-bold tracking-[-0.03em] leading-[1.05] mb-3"
          style={{ fontSize: "clamp(36px,5vw,56px)" }}
        >
          Privacy Policy
        </h1>
        <div
          className="text-[11px] text-text-secondary tracking-[0.04em] mb-14 pb-8 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          Last updated: March 19, 2026
        </div>

        {sections.map((s, i) => (
          <div key={s.num}>
            <div className="mb-12">
              <div className="font-display text-[14px] font-semibold tracking-[0.01em] mb-3 text-text-primary">
                <span className="text-[10px] tracking-[0.1em] text-text-secondary mr-2">
                  {s.num}
                </span>
                {s.title}
              </div>
              {s.body.map((p, j) => (
                <p
                  key={j}
                  className="text-[13px] text-text-secondary leading-[1.9] tracking-[0.02em] mb-3 last:mb-0"
                >
                  {p}
                </p>
              ))}
            </div>
            {i < sections.length - 1 && (
              <div
                className="h-px mb-12"
                style={{ background: "var(--border)" }}
              />
            )}
          </div>
        ))}
      </div>

      <Footer />
    </>
  );
}
