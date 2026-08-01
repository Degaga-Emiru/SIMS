"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "What is SIMS and who is it for?",
    answer:
      "SIMS (Smart Inventory Management System) is a cloud-based platform designed for retailers, wholesalers, and businesses of all sizes that need real-time inventory tracking, sales management, and analytics.",
  },
  {
    question: "Can I migrate data from my existing system?",
    answer:
      "Yes. SIMS supports CSV and Excel imports for products, categories, suppliers, and customers. Our support team can assist with larger migrations on Professional and Enterprise plans.",
  },
  {
    question: "How does role-based access control work?",
    answer:
      "SIMS includes four roles: Super Admin, Inventory Manager, Store Manager, and Sales Staff. Each role has specific permissions to ensure team members only access what they need.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. We use industry-standard encryption, JWT authentication, bcrypt password hashing, and regular security audits. Data is stored on secure PostgreSQL databases with automated backups.",
  },
  {
    question: "Do you offer a free trial?",
    answer:
      "Yes, all plans include a 14-day free trial with full access to features. No credit card required to start.",
  },
  {
    question: "Can I use SIMS on mobile devices?",
    answer:
      "SIMS is fully responsive and works on tablets and smartphones. A dedicated mobile app is on our roadmap for Q3 2026.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 lg:py-28 bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently Asked <span className="text-primary">Questions</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to know about SIMS.
          </p>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={faq.question}
              className="rounded-lg border border-border bg-background overflow-hidden"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-6 py-4 text-left font-medium transition-colors hover:bg-muted/50"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                {faq.question}
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              {openIndex === index && (
                <div className="border-t px-6 pb-4 pt-2 text-muted-foreground">{faq.answer}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
