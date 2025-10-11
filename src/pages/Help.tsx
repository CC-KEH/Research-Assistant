import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I reset my password?",
    answer:
      "Go to the login page and click on 'Forgot password'. Follow the instructions sent to your registered email address to reset it.",
  },
  {
    question: "Can I use the product on multiple devices?",
    answer:
      "Yes! You can log in to your account on multiple devices, and your data will sync automatically across all of them.",
  },
  {
    question: "Is there a free trial available?",
    answer:
      "We offer a 14-day free trial with access to all premium features. You can cancel anytime before the trial ends.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Our support team is available 24/7. You can reach us via the 'Contact' page or email us at support@example.com.",
  },
];

export default function Help() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 overflow-y-auto scrollbar-thin">
      {/* Product Overview Section */}
      <section className="mb-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Help & Support</h1>
        <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto">
          Welcome to the Help Center! Our product is designed to make your daily
          tasks simpler, faster, and more efficient. Whether you’re managing
          projects, organizing data, or collaborating with your team, we’re here
          to ensure you have the best experience possible.
        </p>
      </section>

      {/* FAQs Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border rounded-2xl shadow-sm overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="flex justify-between items-center w-full text-left px-5 py-4 transition-colors"
              >
                <span className="font-medium text-gray-400">
                  {faq.question}
                </span>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {openIndex === index && (
                <div className="px-5 py-4 text-gray-400 border-t">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contact Prompt */}
      <div className="mt-12 text-center">
        <p className="text-gray-600">
          Still need help?{" "}
          <a
            href="/contact"
            className="text-blue-600 hover:underline font-medium"
          >
            Contact our support team
          </a>
          .
        </p>
      </div>
    </div>
  );
}
