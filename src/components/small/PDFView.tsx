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

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

interface Point {
  x: number;
  y: number;
}

interface PDFViewerProps {
  file: string;
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
  const [paths, setPaths] = useState<Point[][]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [history, setHistory] = useState<Point[][][]>([]);
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
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "red";

    paths.forEach((path) => {
      ctx.beginPath();
      path.forEach((point, idx) => {
        if (idx === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };

    if (tool === "pen") {
      setDrawing(true);
      setCurrentPath([pos]);
    } else if (tool === "eraser") {
      eraseAt(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || tool !== "pen") return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const pos = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    setCurrentPath((prev) => {
      const updated = [...prev, pos];

      ctx.beginPath();
      const last = prev[prev.length - 1];
      if (last) ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.stroke();

      return updated;
    });
  };

  const handleMouseUp = () => {
    if (tool === "pen" && currentPath.length > 0) {
      const newPaths = [...paths, currentPath];
      setPaths(newPaths);
      setHistory((prev) => [...prev, newPaths]);
      setCurrentPath([]);
      setDrawing(false);
    }
  };

  const eraseAt = (pos: Point) => {
    const radius = 10;
    const updatedPaths = paths.filter(
      (path) =>
        !path.some((pt) => Math.hypot(pt.x - pos.x, pt.y - pos.y) < radius)
    );
    if (updatedPaths.length !== paths.length) {
      setHistory((prev) => [...prev, paths]);
      setPaths(updatedPaths);
    }
  };

  const handleUndo = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setPaths(last);
      return prev.slice(0, -1);
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
        el.style.backgroundColor = "yellow";
      } else {
        el.style.backgroundColor = "";
      }
    });
  };

  useEffect(() => {
    highlightMatches();
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

  return (
    <div
      className={`p-4 h-full rounded-md mt-2 ${
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

      <div className="flex flex-row gap-2 mb-4 justify-center rounded-md py-2">
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

      <div className="relative w-fit">
        <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={pageNumber} renderAnnotationLayer renderTextLayer />
        </Document>
        <canvas
          ref={canvasRef}
          width={800}
          height={1000}
          className="absolute top-0 left-0 z-10 pointer-events-auto bg-transparent"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        />
      </div>

      <p className="mt-4 text-sm">
        Page {pageNumber} of {numPages} {bookmarks.includes(pageNumber) && "🔖"}
      </p>
    </div>
  );
};

export default PDFViewer;
