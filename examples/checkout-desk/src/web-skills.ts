import { z } from "zod";

import { createWebSkillGenerator } from "web-skill";

const stepSchema = z.enum(["contact", "card", "confirm"]);

const contactSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  phone: z.string().min(7),
  shippingAddress: z.string().min(8),
});

const cardSchema = z.object({
  cardNumber: z.string().min(12),
  cvc: z.string().min(3).max(4),
  expiry: z.string().min(4),
  nameOnCard: z.string().min(1),
});

const prepareCheckoutSchema = z.object({
  contact: contactSchema,
  card: cardSchema,
  targetStep: stepSchema.optional().default("confirm"),
});

type PrepareCheckoutInput = z.infer<typeof prepareCheckoutSchema>;

export const webSkills = createWebSkillGenerator();

const checkoutSkill = webSkills.newSkill({
  name: "checkoutDesk",
  title: "Checkout desk API for preparing a handoff-ready confirm screen",
  description:
    "Expose one task-level checkout action that fills named form fields and advances a conventional three-step checkout through normal form submission.",
});

checkoutSkill.addFunction(prepareCheckout, "prepareCheckout", {
  description:
    "Fill contact and credit-card fields on a traditional checkout form, then advance the page to the requested step so a human can review or submit.",
  inputSchema: prepareCheckoutSchema,
  outputSchema: z.object({
    currentStep: stepSchema,
    filledFields: z.number().int().nonnegative(),
    readyToSubmit: z.boolean(),
    route: z.string(),
  }),
});

async function prepareCheckout(rawInput: PrepareCheckoutInput) {
  const input = prepareCheckoutSchema.parse(rawInput);

  if (typeof document === "undefined") {
    throw new Error("prepareCheckout must run in a browser document.");
  }

  setFieldValue("email", input.contact.email);
  setFieldValue("fullName", input.contact.fullName);
  setFieldValue("phone", input.contact.phone);
  setFieldValue("shippingAddress", input.contact.shippingAddress);

  if (input.targetStep === "card" || input.targetStep === "confirm") {
    await waitForDomUpdate();
    submitForm("contactForm");
  }

  setFieldValue("nameOnCard", input.card.nameOnCard);
  setFieldValue("cardNumber", input.card.cardNumber);
  setFieldValue("expiry", input.card.expiry);
  setFieldValue("cvc", input.card.cvc);

  if (input.targetStep === "confirm") {
    await waitForDomUpdate();
    submitForm("cardForm");
  }

  focusCurrentStep(input.targetStep);

  return {
    currentStep: input.targetStep,
    filledFields: 8,
    readyToSubmit: input.targetStep === "confirm",
    route: `#${input.targetStep}`,
  };
}

function setFieldValue(fieldName: string, value: string): void {
  const element = findField(fieldName);

  if (!element) {
    throw new Error(`Could not find checkout field "${fieldName}".`);
  }

  const prototype =
    element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  if (!descriptor?.set) {
    throw new Error(`Could not update checkout field "${fieldName}".`);
  }

  descriptor.set.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function submitForm(formName: "contactForm" | "cardForm"): void {
  const form = document.forms.namedItem(formName);

  if (!form) {
    throw new Error(`Could not find checkout form "${formName}".`);
  }

  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"], input[type="submit"]');

  if (submitButton) {
    submitButton.click();
    return;
  }

  form.requestSubmit();
}

function focusCurrentStep(step: z.infer<typeof stepSchema>): void {
  const section = document.getElementById(step);

  if (!section) {
    return;
  }

  section.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
  section.focus();
}

function waitForDomUpdate(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function findField(fieldName: string): HTMLInputElement | HTMLTextAreaElement {
  const formName = getFieldFormName(fieldName);
  const form = document.forms.namedItem(formName);

  if (!form) {
    throw new Error(`Could not find checkout form "${formName}".`);
  }

  const field = form.elements.namedItem(fieldName);

  if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLTextAreaElement)) {
    throw new Error(`Could not find checkout field "${fieldName}".`);
  }

  return field;
}

function getFieldFormName(fieldName: string): "contactForm" | "cardForm" {
  switch (fieldName) {
    case "email":
    case "fullName":
    case "phone":
    case "shippingAddress":
      return "contactForm";
    case "nameOnCard":
    case "cardNumber":
    case "expiry":
    case "cvc":
      return "cardForm";
    default:
      throw new Error(`Unknown checkout field "${fieldName}".`);
  }
}
