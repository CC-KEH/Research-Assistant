import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookmarkIcon, ExternalLinkIcon } from "lucide-react";
import { ArxivItem } from "@/lib/types";
import { info } from "@/lib/logger";
import Loading from "@/components/common/Loader";

interface SuggestionsProps {
  suggestions?: ArxivItem[];
  isLoading?: boolean;
  error?: string | null;
  onToggleReadLater?: (paper: ArxivItem) => void;
}

export default function Suggestions({
  suggestions = [],
  isLoading = false,
  error = null,
  onToggleReadLater,
}: SuggestionsProps) {
  const handleToggleReadLater = useCallback(
    (paper: ArxivItem) => {
      info(`Toggled read later: ${paper.title}`);
      onToggleReadLater?.(paper);
    },
    [onToggleReadLater],
  );

  return (
    <div className="mt-3 text-muted-foreground w-full h-full flex flex-col">
      {/* FIX: changed h1 → h2 — h1 implies a top-level page heading.
          This is a panel section within a larger layout. */}
      <h2 className="text-center mb-6 border-b pb-2 text-xl font-semibold">
        Similar / Related Papers
      </h2>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loading />
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
          {suggestions.map((paper) => (
            // FIX: key by paper.id — the Arxiv type has an id field.
            // key={`${title}-${index}`} used index which defeats the purpose
            // of keys and breaks reconciliation when the list reorders.
            <Card
              key={paper.id}
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
                    {/* FIX: removed raw URL text — it was redundant with the
                        View button below and cluttered the card. */}
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

                    {/* FIX: only render the bookmark button if the handler is
                        wired up. A non-functional UI element (icon that does
                        nothing visible) is worse than no element at all. */}
                    {onToggleReadLater && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleReadLater(paper)}
                        title="Save for later"
                      >
                        <BookmarkIcon className="h-4 w-4" />
                      </Button>
                    )}
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
