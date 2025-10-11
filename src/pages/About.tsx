export default function About() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 overflow-y-auto scrollbar-thin">
      {/* Header */}
      <h1 className="text-3xl font-bold mb-6 text-center ">About Us</h1>

      {/* Introduction */}
      <p className="text-lg text-gray-400 leading-relaxed mb-8 text-center">
        Welcome to <span className="font-semibold">Our Product</span> — a modern
        solution designed to simplify your workflow and help you achieve more
        with less effort. We believe in creating tools that are intuitive,
        reliable, and built around your needs.
      </p>

      {/* Mission Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-3 ">Our Mission</h2>
        <p className="text-gray-400 leading-relaxed">
          Our mission is to empower individuals and teams by providing
          technology that makes daily operations seamless and efficient. We aim
          to remove complexity, automate the repetitive, and help you focus on
          what truly matters — growth and creativity.
        </p>
      </section>

      {/* Values Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-3 ">Our Values</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-400">
          <li>
            <span className="font-medium">Innovation:</span> We continuously
            improve to stay ahead and deliver the best user experience.
          </li>
          <li>
            <span className="font-medium">Transparency:</span> We value honesty
            and clear communication in everything we do.
          </li>
          <li>
            <span className="font-medium">Customer-Centric:</span> Every feature
            and decision starts with your needs in mind.
          </li>
          <li>
            <span className="font-medium">Quality:</span> We are committed to
            excellence and reliability across our product.
          </li>
        </ul>
      </section>

      {/* Call to Action */}
      <div className="text-center mt-12">
        <p className="text-gray-600">
          Want to learn more?{" "}
          <a
            href="/contact"
            className="text-blue-600 hover:underline font-medium"
          >
            Get in touch with us
          </a>
          .
        </p>
      </div>
    </div>
  );
}
