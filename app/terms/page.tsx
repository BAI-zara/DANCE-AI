import Link from "next/link";

export default function TermsPage() {
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
        <h1>Terms of Service</h1>
        <p>
          By using Dance AI, you agree to use the product responsibly and only
          for lawful personal or commercial creative workflows.
        </p>

        <section>
          <h2>Use Rules</h2>
          <ul>
            <li>You are responsible for the content you record, export, or share.</li>
            <li>You must have permission to record anyone shown in your camera feed.</li>
            <li>You agree to provide accurate payment and account information when required.</li>
          </ul>
        </section>

        <section>
          <h2>Prohibited Behavior</h2>
          <ul>
            <li>Do not use the service for illegal, harmful, abusive, or deceptive activity.</li>
            <li>Do not attempt to disrupt, reverse engineer, overload, or bypass the service.</li>
            <li>Do not submit content that violates another person&apos;s rights.</li>
          </ul>
        </section>

        <section>
          <h2>Disclaimer</h2>
          <p>
            Dance AI is provided as a digital analysis and creative tool. We do
            not guarantee uninterrupted access, medical accuracy, fitness
            outcomes, or professional training advice.
          </p>
        </section>
      </article>

      <footer className="legal-footer">Last updated: April 26, 2026</footer>
    </main>
  )
}
