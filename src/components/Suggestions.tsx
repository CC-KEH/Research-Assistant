import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Suggestions() {
  const suggestions = [
    {
      title: "Efficient Algorithms for Big Data",
      publishedDate: "2024-11-12",
      author: "Jane Doe",
      link: "https://example.com/paper1",
    },
    {
      title: "Quantum Machine Learning Advances",
      publishedDate: "2025-03-22",
      author: "John Smith",
      link: "https://example.com/paper2",
    },
    {
      title: "Efficient Algorithms for Big Data",
      publishedDate: "2024-11-12",
      author: "Jane Doe",
      link: "https://example.com/paper1",
    },
    {
      title: "Quantum Machine Learning Advances",
      publishedDate: "2025-03-22",
      author: "John Smith",
      link: "https://example.com/paper2",
    },
    {
      title: "Efficient Algorithms for Big Data",
      publishedDate: "2024-11-12",
      author: "Jane Doe",
      link: "https://example.com/paper1",
    },
    {
      title: "Quantum Machine Learning Advances",
      publishedDate: "2025-03-22",
      author: "John Smith",
      link: "https://example.com/paper2",
    },
    {
      title: "Efficient Algorithms for Big Data",
      publishedDate: "2024-11-12",
      author: "Jane Doe",
      link: "https://example.com/paper1",
    },
    {
      title: "Quantum Machine Learning Advances",
      publishedDate: "2025-03-22",
      author: "John Smith",
      link: "https://example.com/paper2",
    },
  ];

  return (
    <div>
      {suggestions.length === 0 ? (
        <p className="text-muted-foreground">No suggestions available.</p>
      ) : (
        <div className="space-y-4 max-h-[525px] overflow-y-auto pr-2 scrollbar-thin">
          {suggestions.map((paper, index) => (
            <Card
              key={index}
              className="shadow-md rounded-2xl w-full py-4 min-h-20 max-h-30"
            >
              <CardContent className="space-y-1">
                <h3 className="text-sm font-medium">{paper.title}</h3>
                <div className="flex flex-row justify-between items-start">
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>
                      <span className="font-semibold">Author:</span>{" "}
                      {paper.author}
                    </p>
                    <p>
                      <span className="font-semibold">Published:</span>{" "}
                      {new Date(paper.publishedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={paper.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
