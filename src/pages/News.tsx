export default function News() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 overflow-y-auto scrollbar-thin">
      {/* Product Overview Section */}
      <section className="mb-12 ">
        <h1 className="text-3xl font-bold text-center mb-4">Release Notes</h1>
        <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto">
          What's changed, what's new, and what we shipped in Version 2. This is
          the big one a complete rewrite of the app with tons of new features
          and improvements.
        </p>
      </section>

      <section className="mb-12 ">
        <h4 className="text-3xl font-bold mb-4">What's new</h4>
        <ul className="text-gray-400 leading-relaxed max-w-2xl mx-auto">
          <li className="mb-4 list-disc list-inside">
            <span className="font-semibold">New Stack:</span> The old
            CustomTkinter UI is replaced with a Tauri + React frontend, while
            Python + Langchain still handles all the AI heavy lifting under the
            hood. Faster, cleaner, and much easier to extend.
          </li>
          <li className="mb-4 list-disc list-inside">
            <span className="font-semibold">More LLM Support:</span> Claude is
            here. Research Assistant now supports Anthropic's Claude alongside
            OpenAI and Google. More model options, more flexibility.
          </li>
          <li className="mb-4 list-disc list-inside">
            <span className="font-semibold">Arxiv Recommendations:</span> Based
            on what you're reading, the app now suggests related papers from
            Arxiv. Stay in the rabbit hole — intentionally this time.
          </li>
          <li className="mb-4 list-disc list-inside">
            <span className="font-semibold">Pen over PDF:</span> Annotate
            directly on your PDFs. Highlight, draw, and take freehand notes
            without leaving the app.
          </li>
          <li className="mb-4 list-disc list-inside">
            <span className="font-semibold">UI/UX Improvements:</span> The whole
            interface has been redesigned — cleaner layout, better navigation,
            and a reading experience that actually gets out of your way.
          </li>
        </ul>
      </section>
      {/* Contact Prompt */}
      <div className="mt-12 text-center">
        <p className="text-gray-600">
          Want to contribute?{" "}
          <a
            href="https://github.com/CC-KEH/Research-Assistant"
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
