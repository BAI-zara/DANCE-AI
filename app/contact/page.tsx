import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link className="product-logo" href="/">
          <span className="logo-mark">DA</span>
          <span>
            <strong>Dance AI</strong>
            <small>AI Dance Analyzer</small>
          </span>
        </Link>
        <Link className="legal-home" href="/">
          Back to app
        </Link>
      </header>

      <article className="legal-card card">
        <h1>Contact</h1>
        <p>
          Need help with Dance AI, billing, privacy, or product access? Contact
          our support team.
        </p>

        <section>
          <h2>Email</h2>
          <p>support@danceai.com</p>
        </section>

        <section>
          <h2>Support Scope</h2>
          <p>
            We can help with payment questions, product access, account issues,
            privacy requests, and general feedback.
          </p>
        </section>
      </article>

      <footer className="legal-footer">Last updated: April 26, 2026</footer>
    </main>
  )
}
