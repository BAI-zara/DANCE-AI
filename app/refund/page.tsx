import Link from "next/link";

export default function RefundPage() {
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
        <h1>Refund Policy</h1>
        <p>
          Dance AI Pro is a digital product. Because access is delivered
          immediately after purchase, payments are generally non-refundable.
        </p>

        <section>
          <h2>7-Day Review Window</h2>
          <p>
            If you believe you were charged by mistake or the product did not
            work as expected, contact us within 7 days at support@danceai.com.
            We will review eligible requests case by case.
          </p>
        </section>

        <section>
          <h2>PayPal Payments</h2>
          <p>
            Some refund or dispute handling may also be subject to PayPal&apos;s
            payment policies and buyer protection process.
          </p>
        </section>
      </article>

      <footer className="legal-footer">Last updated: April 26, 2026</footer>
    </main>
  )
}
