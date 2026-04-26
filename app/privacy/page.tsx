import Link from "next/link";

export default function PrivacyPage() {
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
        <h1>Privacy Policy</h1>
        <p>
          Dance AI respects your privacy. This page explains what information may
          be collected when you use our AI dance analyzer.
        </p>

        <section>
          <h2>Camera Data</h2>
          <p>
            The app requests camera access so it can detect body movement and
            render pose analysis in real time. Camera input is used for the
            dance analysis experience and should not be shared unless a feature
            clearly asks you to export or submit content.
          </p>
        </section>

        <section>
          <h2>Cookies</h2>
          <p>
            We may use cookies or similar technologies to keep the site working,
            remember preferences, measure usage, and improve conversion flows.
          </p>
        </section>

        <section>
          <h2>Third Parties</h2>
          <p>
            Payments may be processed by PayPal. Analytics providers may help us
            understand product usage and performance. These third parties handle
            data according to their own privacy policies.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about privacy can be sent to support@danceai.com.
          </p>
        </section>
      </article>

      <footer className="legal-footer">Last updated: April 26, 2026</footer>
    </main>
  )
}
