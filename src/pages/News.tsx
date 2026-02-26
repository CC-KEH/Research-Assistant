export default function News() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 overflow-y-auto scrollbar-thin">
      {/* Product Overview Section */}
      <section className="mb-12 ">
        <h1 className="text-3xl font-bold text-center mb-4">Release Notes</h1>
        <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto">
          Welcome to the Help Center! Our product is designed to make your daily
          tasks simpler, faster, and more efficient. Whether you’re managing
          projects, organizing data, or collaborating with your team, we’re here
          to ensure you have the best experience possible.
        </p>
      </section>

      <section className="mb-12 ">
        <h4 className="text-3xl font-bold mb-4">What's new</h4>
        <ul className="text-gray-400 leading-relaxed max-w-2xl mx-auto">
          <li className="mb-4 list-disc list-inside">
            <span className="font-semibold">More LLM Support: </span> We’ve
            expanded our support for more language models, giving you greater
            flexibility and improved performance across a wider range of tasks.
          </li>
          <li className="mb-4 list-disc list-inside">
            <span className="font-semibold">UI/UX Improvements:</span> We’ve
            made several enhancements to the user interface, including a more
            intuitive layout, improved navigation, and a refreshed design to
            make your experience smoother and more enjoyable.
          </li>
          <li className="mb-4 list-disc list-inside">
            <span className="font-semibold">Performance Improvements:</span>{" "}
            Using the power of Rust, we’ve optimized the core of our application
            to deliver faster load times, smoother interactions, and improved
            stability, ensuring you can work more efficiently than ever before.
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
