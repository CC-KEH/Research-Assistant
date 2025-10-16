import React, { useState, useRef, useEffect } from "react";
import { pdfjs, Document, Page } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  BookmarkCheck,
  BookmarkIcon,
  ChevronLeft,
  ChevronRight,
  EraserIcon,
  HighlighterIcon,
  MoonIcon,
  PenIcon,
  SunIcon,
} from "lucide-react";

import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// TODO: Add Search in File Functionality: ctrl + f

interface Point {
  x: number;
  y: number;
}

interface PDFViewerProps {
  file: string;
}

interface Path {
  points: Point[];
  tool: "pen" | "highlight";
}

const PDFViewer: React.FC<PDFViewerProps> = ({ file }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [tool, setTool] = useState<
    "pen" | "highlight" | "eraser" | "bookmark" | null
  >(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<Path | null>(null);
  const [history, setHistory] = useState<Path[][]>([]);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [showSearchBox, setShowSearchBox] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePrevPage = () => {
    if (pageNumber > 1) setPageNumber(pageNumber - 1);
  };

  const handleNextPage = () => {
    if (pageNumber < numPages) setPageNumber(pageNumber + 1);
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const toggleBookmark = () => {
    setBookmarks((prev) =>
      prev.includes(pageNumber)
        ? prev.filter((page) => page !== pageNumber)
        : [...prev, pageNumber]
    );
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    paths.forEach((path) => {
      ctx.beginPath();
      path.points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = path.tool === "pen" ? "red" : "rgba(255,255,0,0.3)";
      ctx.lineWidth = path.tool === "pen" ? 2 : 20;
      ctx.lineCap = "round";
      ctx.stroke();
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };

    if (tool === "pen" || tool === "highlight") {
      setDrawing(true);
      setCurrentPath({ points: [pos], tool });
    } else if (tool === "eraser") {
      setDrawing(true);
      eraseAt(pos); // erase immediately on mouse down
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };

    if (!drawing) return;

    if (tool === "pen" || tool === "highlight") {
      setCurrentPath((prev) => {
        if (!prev) return null;
        const updated = { ...prev, points: [...prev.points, pos] };

        const ctx = canvasRef.current?.getContext("2d");
        if (ctx && prev.points.length > 0) {
          const last = prev.points[prev.points.length - 1];
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.strokeStyle = prev.tool === "pen" ? "red" : "rgba(255,255,0,0.3)";
          ctx.lineWidth = prev.tool === "pen" ? 2 : 20;
          ctx.lineCap = "round";
          ctx.stroke();
        }

        return updated;
      });
    } else if (tool === "eraser") {
      eraseAt(pos);
    }
  };

  const handleMouseUp = () => {
    if (currentPath) {
      setPaths((prev) => [...prev, currentPath]);
      setCurrentPath(null);
    }
    setDrawing(false);
  };

  const eraseAt = (pos: Point) => {
    if (!paths.length) return;

    const radius = 15; // size of eraser

    // Save snapshot for undo
    setHistory((prev) => [...prev, [...paths]]);

    // Filter out paths that have points near the cursor
    const updatedPaths = paths.filter(
      (path) =>
        !path.points.some(
          (pt) => Math.hypot(pt.x - pos.x, pt.y - pos.y) < radius
        )
    );

    setPaths(updatedPaths); // update paths
    redrawCanvas(); // redraw canvas
  };

  const handleUndo = () => {
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;

      // Get the last snapshot
      const lastPaths = prevHistory[prevHistory.length - 1];

      // Restore paths
      setPaths(lastPaths);

      // Remove the last snapshot from history
      return prevHistory.slice(0, -1);
    });
  };

  const highlightMatches = () => {
    const textLayers = document.querySelectorAll(
      ".react-pdf__Page__textContent span"
    );
    textLayers.forEach((span) => {
      const el = span as HTMLElement;
      const originalText = el.textContent || "";
      if (
        searchTerm &&
        originalText.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        el.style.backgroundColor = isDarkMode ? "orange" : "yellow";
      } else {
        el.style.backgroundColor = "";
      }
    });
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => highlightMatches());
    return () => cancelAnimationFrame(id);
  }, [searchTerm, pageNumber]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearchBox(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else if (e.key === "Escape") {
        setShowSearchBox(false);
        setSearchTerm("");
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [paths, pageNumber]);
  // TODO: Fix the PDF Height
  return (
    <div
      className={`h-full rounded-md overflow-hidden ${
        isDarkMode ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      {showSearchBox && (
        <Card className="fixed top-4 right-6 p-3 z-50 w-72 shadow-xl">
          <Input
            ref={searchInputRef}
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </Card>
      )}

      <div className="relative w-fit overflow-y-auto flex justify-center">
        <div className="flex flex-row gap-2 mb-4 justify-center rounded-md z-10 fixed w-1/4 bottom-4">
          <Button onClick={handlePrevPage} variant="outline">
            <ChevronLeft />
          </Button>
          <Button onClick={handleNextPage} variant="outline">
            <ChevronRight />
          </Button>
          <Button
            variant={tool === "pen" ? "default" : "outline"}
            onClick={() => setTool("pen")}
          >
            <PenIcon />
          </Button>
          <Button
            variant={tool === "highlight" ? "default" : "outline"}
            onClick={() => setTool("highlight")}
          >
            <HighlighterIcon />
          </Button>
          <Button variant="outline" onClick={() => setTool("eraser")}>
            <EraserIcon />
          </Button>
          <Button
            onClick={toggleBookmark}
            variant={bookmarks.includes(pageNumber) ? "destructive" : "outline"}
          >
            {bookmarks.includes(pageNumber) ? (
              <BookmarkCheck />
            ) : (
              <BookmarkIcon />
            )}
          </Button>
          <Button onClick={toggleTheme} variant="outline">
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </Button>
        </div>
        <div
          style={{
            filter: isDarkMode ? "invert(1) hue-rotate(180deg)" : "none",
          }}
        >
          <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
            <Page
              pageNumber={pageNumber}
              renderAnnotationLayer={true}
              renderTextLayer={true}
            />
          </Document>
          <canvas
            ref={canvasRef}
            width={800}
            height={1000}
            className={`absolute top-0 left-0 z-10 bg-transparent ${
              tool === "pen" || tool === "highlight" || tool === "eraser"
                ? "pointer-events-auto"
                : "pointer-events-none"
            }`}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          />
        </div>
      </div>

      <p
        className={`mt-4 text-sm ${
          isDarkMode ? "bg-black text-white" : "bg-white text-black"
        }`}
      >
        Page {pageNumber} of {numPages} {bookmarks.includes(pageNumber) && "🔖"}
      </p>
    </div>
  );
};

export default PDFViewer;
