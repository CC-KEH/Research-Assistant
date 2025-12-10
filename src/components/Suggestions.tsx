import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookmarkIcon } from "lucide-react";

export default function Suggestions() {
  function toggleReadLater() {}

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
      <h1 className="text-center border-0 mb-0">Similar Papers</h1>
      <p className="text-center mb-2">Based on the papers in workspace.</p>
      {suggestions.length === 0 ? (
        <p className="text-muted-foreground">No suggestions available.</p>
      ) : (
        <div className="min-w-xl max-h-[575px] mx-auto overflow-y-auto scrollbar-thin">
          {suggestions.map((paper, index) => (
            <Card
              key={index}
              className="shadow-md rounded-2xl w-full my-4 min-h-20 max-h-30"
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
                  <div className="flex flex-row gap-2">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleReadLater}
                    >
                      <BookmarkIcon />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
