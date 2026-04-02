import { startTransition, useState } from "react";

type StepId = "contact" | "card" | "confirm";

type ContactDetails = {
  email: string;
  fullName: string;
  phone: string;
  shippingAddress: string;
};

type CardDetails = {
  cardNumber: string;
  cvc: string;
  expiry: string;
  nameOnCard: string;
};

const STEP_LABELS: Array<{ id: StepId; label: string; number: string }> = [
  { id: "contact", label: "Contact", number: "01" },
  { id: "card", label: "Credit card", number: "02" },
  { id: "confirm", label: "Confirm", number: "03" },
];

const DEFAULT_CONTACT: ContactDetails = {
  email: "",
  fullName: "",
  phone: "",
  shippingAddress: "",
};

const DEFAULT_CARD: CardDetails = {
  cardNumber: "",
  cvc: "",
  expiry: "",
  nameOnCard: "",
};

function App(): JSX.Element {
  const [currentStep, setCurrentStep] = useState<StepId>("contact");
  const [contact, setContact] = useState<ContactDetails>(DEFAULT_CONTACT);
  const [card, setCard] = useState<CardDetails>(DEFAULT_CARD);
  const [lastAction, setLastAction] = useState("Try window._web_skills.checkoutDesk.prepareCheckout(...)");
  const [submissionState, setSubmissionState] = useState<"idle" | "ready">("idle");

  function goToStep(step: StepId): void {
    startTransition(() => {
      setCurrentStep(step);
      window.location.hash = step;
      document.getElementById(step)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleContactSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!isContactComplete(contact)) {
      setLastAction("Contact step still needs a complete email, name, phone, and shipping address.");
      return;
    }

    setLastAction("Contact details are ready. The desk moved to the credit-card step.");
    goToStep("card");
  }

  function handleCardSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!isCardComplete(card)) {
      setLastAction("Card step still needs name, number, expiry, and CVC.");
      return;
    }

    setLastAction("Payment details are staged. The desk moved to confirm for a human review.");
    goToStep("confirm");
  }

  function handleSubmit(): void {
    if (!isContactComplete(contact) || !isCardComplete(card)) {
      setLastAction("Complete the earlier steps before the order can be confirmed.");
      return;
    }

    setSubmissionState("ready");
    setLastAction("Checkout package is prepared. A human can now review and place the order.");
  }

  return (
    <div className="page-shell">
      <div className="page-noise" aria-hidden="true" />
      <main className="checkout-desk">
        <section className="intro-band">
          <div className="intro-copy">
            <p className="eyebrow">React local-state example</p>
            <h1>Checkout desk</h1>
            <p className="intro-text">
              A deliberately ordinary three-step checkout flow that shows how `web-skill` can still help with older or
              DOM-shaped web apps. The skill fills fields, clicks Continue, and lands the user on a review-ready
              confirm screen.
            </p>
          </div>

          <div className="intro-meta">
            <div>
              <span className="meta-label">Skill entrypoint</span>
              <code>window._web_skills.checkoutDesk</code>
            </div>
            <div>
              <span className="meta-label">Current route</span>
              <p>#{currentStep}</p>
            </div>
            <div>
              <span className="meta-label">Last action</span>
              <p>{lastAction}</p>
            </div>
          </div>
        </section>

        <section className="desk-grid">
          <aside className="summary-rail">
            <div className="summary-card">
              <p className="eyebrow eyebrow-dark">Basket summary</p>
              <h2>Weekend carry-on kit</h2>
              <ul className="line-items">
                <li>
                  <span>Canvas weekender</span>
                  <strong>$148</strong>
                </li>
                <li>
                  <span>Travel organizer set</span>
                  <strong>$38</strong>
                </li>
                <li>
                  <span>Express packing note</span>
                  <strong>$12</strong>
                </li>
              </ul>

              <div className="totals">
                <div>
                  <span>Subtotal</span>
                  <strong>$198</strong>
                </div>
                <div>
                  <span>Shipping</span>
                  <strong>$16</strong>
                </div>
                <div className="grand-total">
                  <span>Total</span>
                  <strong>$214</strong>
                </div>
              </div>
            </div>

            <div className="summary-card summary-card-muted">
              <p className="eyebrow eyebrow-dark">Why this exists</p>
              <p>
                This demo intentionally avoids app-wide stores and advanced framework routing. The point is that a
                stable task-level skill can still sit on top of a very normal browser form.
              </p>
            </div>
          </aside>

          <section className="flow-column">
            <nav className="step-strip" aria-label="Checkout steps">
              {STEP_LABELS.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  className="step-chip"
                  data-active={currentStep === step.id}
                  onClick={() => goToStep(step.id)}
                >
                  <span>{step.number}</span>
                  <strong>{step.label}</strong>
                </button>
              ))}
            </nav>

            <section
              id="contact"
              className="step-panel"
              data-active={currentStep === "contact"}
              tabIndex={-1}
            >
              <header className="panel-header">
                <div>
                  <p className="eyebrow">Step 1</p>
                  <h2>Contact</h2>
                </div>
                <span className="panel-note">Traditional form fields</span>
              </header>

              <form className="form-grid" name="contactForm" onSubmit={handleContactSubmit}>
                <label>
                  <span>Email</span>
                  <input
                    name="email"
                    type="email"
                    value={contact.email}
                    onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))}
                    placeholder="alex@example.com"
                  />
                </label>
                <label>
                  <span>Full name</span>
                  <input
                    name="fullName"
                    type="text"
                    value={contact.fullName}
                    onChange={(event) => setContact((current) => ({ ...current, fullName: event.target.value }))}
                    placeholder="Alex Morgan"
                  />
                </label>
                <label>
                  <span>Phone</span>
                  <input
                    name="phone"
                    type="tel"
                    value={contact.phone}
                    onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="+44 20 7946 0991"
                  />
                </label>
                <label className="full-width">
                  <span>Shipping address</span>
                  <textarea
                    name="shippingAddress"
                    value={contact.shippingAddress}
                    onChange={(event) =>
                      setContact((current) => ({ ...current, shippingAddress: event.target.value }))
                    }
                    rows={4}
                    placeholder="21 Mercer Street, London, W1F 9TB"
                  />
                </label>
                <footer className="panel-footer panel-footer-inline">
                  <p>Agents can fill these same DOM fields directly instead of learning the whole page structure.</p>
                  <button type="submit">
                    Continue to credit card
                  </button>
                </footer>
              </form>
            </section>

            <section
              id="card"
              className="step-panel"
              data-active={currentStep === "card"}
              tabIndex={-1}
            >
              <header className="panel-header">
                <div>
                  <p className="eyebrow">Step 2</p>
                  <h2>Credit card</h2>
                </div>
                <span className="panel-note">Still plain old inputs</span>
              </header>

              <form className="form-grid" name="cardForm" onSubmit={handleCardSubmit}>
                <label className="full-width">
                  <span>Name on card</span>
                  <input
                    name="nameOnCard"
                    type="text"
                    value={card.nameOnCard}
                    onChange={(event) => setCard((current) => ({ ...current, nameOnCard: event.target.value }))}
                    placeholder="Alex Morgan"
                  />
                </label>
                <label className="full-width">
                  <span>Card number</span>
                  <input
                    name="cardNumber"
                    type="text"
                    inputMode="numeric"
                    value={card.cardNumber}
                    onChange={(event) => setCard((current) => ({ ...current, cardNumber: event.target.value }))}
                    placeholder="4242 4242 4242 4242"
                  />
                </label>
                <label>
                  <span>Expiry</span>
                  <input
                    name="expiry"
                    type="text"
                    value={card.expiry}
                    onChange={(event) => setCard((current) => ({ ...current, expiry: event.target.value }))}
                    placeholder="08 / 28"
                  />
                </label>
                <label>
                  <span>CVC</span>
                  <input
                    name="cvc"
                    type="text"
                    inputMode="numeric"
                    value={card.cvc}
                    onChange={(event) => setCard((current) => ({ ...current, cvc: event.target.value }))}
                    placeholder="314"
                  />
                </label>
                <footer className="panel-footer panel-footer-inline">
                  <p>The skill advances this step by submitting the same form a person would submit.</p>
                  <button type="submit">
                    Continue to confirm
                  </button>
                </footer>
              </form>
            </section>

            <section
              id="confirm"
              className="step-panel confirm-panel"
              data-active={currentStep === "confirm"}
              tabIndex={-1}
            >
              <header className="panel-header">
                <div>
                  <p className="eyebrow">Step 3</p>
                  <h2>Confirm</h2>
                </div>
                <span className="panel-note">{submissionState === "ready" ? "Ready to place order" : "Review first"}</span>
              </header>

              <div className="confirm-grid">
                <article>
                  <span className="meta-label">Contact</span>
                  <strong>{contact.fullName || "Pending"}</strong>
                  <p>{contact.email || "No email captured yet."}</p>
                  <p>{contact.shippingAddress || "Shipping address will appear here."}</p>
                </article>
                <article>
                  <span className="meta-label">Payment</span>
                  <strong>{maskCard(card.cardNumber)}</strong>
                  <p>{card.nameOnCard || "Cardholder name will appear here."}</p>
                  <p>{card.expiry ? `Expiry ${card.expiry}` : "Expiry not provided yet."}</p>
                </article>
              </div>

              <footer className="panel-footer">
                <p>The last step is intentionally human-friendly: the agent prepares the handoff, then the user reviews.</p>
                <button type="button" onClick={handleSubmit}>
                  Place mock order
                </button>
              </footer>
            </section>
          </section>
        </section>
      </main>
    </div>
  );
}

function isContactComplete(contact: ContactDetails): boolean {
  return Boolean(contact.email && contact.fullName && contact.phone && contact.shippingAddress);
}

function isCardComplete(card: CardDetails): boolean {
  return Boolean(card.cardNumber && card.cvc && card.expiry && card.nameOnCard);
}

function maskCard(cardNumber: string): string {
  const digits = cardNumber.replace(/\s+/g, "");

  if (digits.length < 4) {
    return "Card not staged";
  }

  return `•••• •••• •••• ${digits.slice(-4)}`;
}

export default App;
