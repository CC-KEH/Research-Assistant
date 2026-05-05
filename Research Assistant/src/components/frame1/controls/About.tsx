export default function About() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 overflow-y-auto scrollbar-thin">
      {/* Product Overview Section */}
      <section className="mb-12 ">
        <h1 className="text-3xl font-bold text-center mb-4">About</h1>
        <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto">
          Research Assistant started as a personal frustration — juggling dozens
          of PDFs, losing track of notes, and constantly switching between tools
          just to understand a single paper. During my bachelor's major project,
          I found myself manually copying text into AI tools just to get
          explanations or summaries, which was a tedious and inefficient
          process. I thought, there has to be a better way to interact with
          research papers. Why not have a single app where you can load an
          entire paper and chat with it directly? No more copy-pasting, no more
          context switching. Research Assistant was born out of that need for a
          more seamless and integrated way to engage with academic literature.
          It's designed for students, academics, and anyone who reads more
          papers than they'd like to admit — making the research process
          smoother and more intuitive.
        </p>
      </section>

      <section className="mb-12 ">
        <h4 className="text-3xl font-bold mb-4">Support</h4>
        <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto mb-6">
          Support the Project If Research Assistant has saved you time or made
          your research life easier, consider supporting its development. It
          helps keep the project alive and growing.
        </p>
        <ul className="text-gray-400 leading-relaxed max-w-2xl mx-auto">
          <li className="mb-4 list-disc list-inside">
            <a
              href="https://ko-fi.com/CCKEH"
              className="font-semibold hover:underline"
            >
              Ko-fi:
            </a>{" "}
            Buy a one-time coffee
          </li>
          <li className="mb-4 list-disc list-inside">
            <a
              href="https://www.patreon.com/CCKEH"
              className="font-semibold hover:underline"
            >
              Patreon:
            </a>{" "}
            Become a monthly supporter and get early access to new features
          </li>
          <li className="mb-4 list-disc list-inside">
            <a
              href="https://github.com/ArbashHussain"
              className="font-semibold hover:underline"
            >
              GitHub Sponsors:
            </a>{" "}
            Sponsor directly through GitHub
          </li>
        </ul>
      </section>

      {/* Contact Prompt */}
      <div className="mt-12 text-center">
        <p className="text-gray-600">
          Want to contribute?{" "}
          <a
            href="https://github.com/ArbashHussain/Research-Assistant"
            className="text-blue-600 hover:underline font-medium"
          >
            Visit our GitHub repository
          </a>
          .
        </p>
      </div>
    </div>
  );
}
