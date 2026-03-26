import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookmarkIcon, ExternalLinkIcon } from "lucide-react"; // added ExternalLink for clarity
import { Arxiv } from "@/lib/types";

interface SuggestionsProps {
  suggestions?: Arxiv[];
  isLoading?: boolean;
  error?: string | null;
  onToggleReadLater?: (paper: Arxiv) => void;
}

export default function Suggestions({
  suggestions = [],
  isLoading = false,
  error = null,
  onToggleReadLater,
}: SuggestionsProps) {
  // Placeholder toggle – replace with real logic later (e.g. save to localStorage or backend)
  const handleToggleReadLater = (paper: Arxiv) => {
    console.log("Toggled read later:", paper.title);
    onToggleReadLater?.(paper);
  };

  return (
    <div className="mt-3 text-muted-foreground min-w-xl h-full flex flex-col">
      <h1 className="text-center mb-6 border-b pb-2 text-xl font-semibold">
        Similar / Related Papers
      </h1>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground animate-pulse">
            Loading related papers...
          </p>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-destructive text-center p-6">
          {error}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>No related papers found yet.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin pr-2 pb-12">
          {suggestions.map((paper, index) => (
            <Card
              key={`${paper.title}-${index}`}
              className="shadow-md rounded-2xl w-full mb-4 border border-border/60 hover:border-primary/40 transition-colors"
            >
              <CardContent className="p-4 space-y-2">
                <h3 className="text-base font-medium leading-tight">
                  {paper.title}
                </h3>

                <div className="flex flex-row justify-between items-start gap-4">
                  <div className="text-xs text-muted-foreground space-y-1 flex-1">
                    {paper.authors && paper.authors.length > 0 && (
                      <p>
                        <span className="font-semibold">Authors:</span>{" "}
                        {paper.authors.join(", ")}
                      </p>
                    )}
                    {paper.publishedDate && (
                      <p>
                        <span className="font-semibold">Published:</span>{" "}
                        {new Date(paper.publishedDate).toLocaleDateString()}
                      </p>
                    )}
                    <p className="break-all opacity-70 mt-1">{paper.link}</p>
                  </div>

                  <div className="flex flex-row gap-2 shrink-0">
                    <a
                      href={paper.link.startsWith("http") ? paper.link : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        paper.link.startsWith("http")
                          ? ""
                          : "pointer-events-none opacity-50"
                      }
                    >
                      <Button variant="outline" size="sm">
                        View
                        <ExternalLinkIcon className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </a>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleReadLater(paper)}
                      title="Save for later"
                    >
                      <BookmarkIcon className="h-4 w-4" />
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
