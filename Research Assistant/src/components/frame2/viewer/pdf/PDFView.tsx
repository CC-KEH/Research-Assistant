import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { pdfjs, Document, Page } from "react-pdf";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  EraserIcon,
  HighlighterIcon,
  MoonIcon,
  PenIcon,
  SunIcon,
  DownloadIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

import type {
  AnnotationPath,
  PagePathsMap,
  FileAnnotations,
} from "@/lib/types";
import { invoke } from "@tauri-apps/api/core";
import Loading from "@/components/common/Loader";
import { error } from "@/lib/logger";
import { saveContentToPDF } from "@/lib/backend";
import { useConfig } from "@/components/providers/ConfigProvider";

interface PDFViewerProps {
  file: string;
}

interface MatchRect {
  top: number;
  left: number;
  width: number;
  height: number;
  pageNum: number;
  globalIndex: number;
}

// A persisted selection-based highlight rect (page-relative coords)
interface SelectionHighlight {
  id: string;
  pageNum: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ file }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [tool, setTool] = useState<"pen" | "highlight" | "eraser" | null>(null);
  const [pdfSource, setPdfSource] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [pagePathsMap, setPagePathsMap] = useState<PagePathsMap>({});
  const [historyMap, setHistoryMap] = useState<
    Record<number, AnnotationPath[][]>
  >({});
  const [showSearchBox, setShowSearchBox] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Selection-based highlights
  const [selectionHighlights, setSelectionHighlights] = useState<
    SelectionHighlight[]
  >([]);

  // Search match state
  const [matchRects, setMatchRects] = useState<MatchRect[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1);

  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const pageWrapperRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const drawingState = useRef<{
    active: boolean;
    page: number;
    currentPath: AnnotationPath | null;
  }>({ active: false, page: 1, currentPath: null });

  const renderedPagesRef = useRef<Set<number>>(new Set());

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const focusTimeoutRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const thumbDragRef = useRef<{
    startY: number;
    startScrollTop: number;
  } | null>(null);
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(0);

  const { config, updateConfig } = useConfig();

  // ─── Toolbar styles ──────────────────────────────────────────────────────

  const toolbarStyles = useMemo(
    () => ({
      base: isDarkMode
        ? "bg-[#1C1917]/80 border-[#2E2820]/60 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_1px_0_rgba(237,232,223,0.04)_inset] backdrop-blur-2xl backdrop-saturate-200"
        : "bg-[#2C2416]/85 border-[#DDD6CB]/15 shadow-[0_8px_32px_rgba(28,25,23,0.35)]",
      btn: isDarkMode
        ? "text-[#EDE8DF]/40 hover:text-[#EDE8DF]/80 hover:bg-[#EDE8DF]/[0.08]"
        : "text-[#F8F5F0]/50 hover:text-[#F8F5F0] hover:bg-[#F8F5F0]/10",
      btnActive:
        "bg-[#C9A96E]/25 text-[#F8F5F0] shadow-[inset_0_1px_2px_rgba(28,25,23,0.3)]",
      divider: isDarkMode ? "bg-[#EDE8DF]/10" : "bg-[#F8F5F0]/15",
    }),
    [isDarkMode],
  );

  // ─── Annotations: persist / read ────────────────────────────────────────

  const persistAnnotations = useCallback(
    (updatedMap: PagePathsMap) => {
      if (!config) return;
      updateConfig({
        ...config,
        annotations: {
          ...(config.annotations ?? {}),
          [file]: { pagePathsMap: updatedMap } satisfies FileAnnotations,
        },
      });
    },
    [file, config, updateConfig],
  );

  const readAnnotationsFromConfig = useCallback((): PagePathsMap => {
    const fa: FileAnnotations | undefined = config?.annotations?.[file];
    if (!fa) return {};
    const out: PagePathsMap = {};
    for (const [k, v] of Object.entries(fa.pagePathsMap)) out[Number(k)] = v;
    return out;
  }, [file, config]);

  // ─── Load PDF ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!file) return;
    setPagePathsMap({});
    setHistoryMap({});
    setPdfSource(null);
    setMatchRects([]);
    setActiveMatchIndex(-1);
    setSelectionHighlights([]);
    canvasRefs.current = {};
    pageWrapperRefs.current = {};
    renderedPagesRef.current = new Set();

    let cancelled = false;
    setIsLoadingPdf(true);
    invoke<string>("read_pdf_file", { filePath: file })
      .then((b64) => {
        if (!cancelled) setPdfSource(`data:application/pdf;base64,${b64}`);
      })
      .catch((err) => {
        if (!cancelled) error(`Failed to load PDF: ${err}`);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPdf(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    if (!file) return;
    const saved = readAnnotationsFromConfig();
    if (Object.keys(saved).length > 0) setPagePathsMap(saved);
  }, [file, readAnnotationsFromConfig]);

  // ─── Document load ───────────────────────────────────────────────────────

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      renderedPagesRef.current = new Set();
    },
    [],
  );

  // ─── Canvas: redraw ───────────────────────────────────────────────────────

  const redrawCanvas = useCallback(
    (pageNum: number, paths: AnnotationPath[]) => {
      const canvas = canvasRefs.current[pageNum];
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      paths.forEach((path) => {
        if (!path.points.length) return;
        ctx.beginPath();
        path.points.forEach((pt, i) =>
          i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y),
        );
        // Only pen tool draws on canvas now; highlight is selection-based
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      });
    },
    [],
  );

  useEffect(() => {
    for (const [k, paths] of Object.entries(pagePathsMap)) {
      redrawCanvas(Number(k), paths);
    }
  }, [pagePathsMap, redrawCanvas]);

  // ─── Page render: size the overlay canvas ────────────────────────────────

  const onPageRenderSuccess = useCallback(
    (pageNum: number) => () => {
      const canvas = canvasRefs.current[pageNum];
      if (!canvas) return;
      const pdfCanvas = canvas.parentElement?.querySelector(
        ".react-pdf__Page__canvas",
      ) as HTMLCanvasElement | null;
      if (!pdfCanvas) return;
      const w = parseFloat(pdfCanvas.style.width) || pdfCanvas.offsetWidth;
      const h = parseFloat(pdfCanvas.style.height) || pdfCanvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      redrawCanvas(pageNum, pagePathsMap[pageNum] ?? []);
      renderedPagesRef.current.add(pageNum);
    },
    [pagePathsMap, redrawCanvas],
  );

  // ─── Selection-based highlighting ────────────────────────────────────────
  //
  // When the highlight tool is active and the user releases the mouse anywhere
  // inside a page wrapper, we read window.getSelection(), iterate over its
  // DOMRects, and store each rect translated into page-relative coordinates.

  const handlePageMouseUp = useCallback(
    (pageNum: number) => (e: React.MouseEvent<HTMLDivElement>) => {
      if (tool !== "highlight") return;

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      const rects = Array.from(range.getClientRects());
      if (!rects.length) return;

      const wrapper = pageWrapperRefs.current[pageNum];
      if (!wrapper) return;
      const wrapperRect = wrapper.getBoundingClientRect();

      const newHighlights: SelectionHighlight[] = rects
        .filter((r) => r.width > 1 && r.height > 1)
        .map((r) => ({
          id: `${pageNum}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          pageNum,
          top: r.top - wrapperRect.top,
          left: r.left - wrapperRect.left,
          width: r.width,
          height: r.height,
        }));

      if (!newHighlights.length) return;

      setSelectionHighlights((prev) => [...prev, ...newHighlights]);

      // Clear the browser selection so it doesn't linger
      sel.removeAllRanges();
    },
    [tool],
  );

  // Eraser also removes selection highlights near the click position
  const eraseSelectionHighlightsAt = useCallback(
    (pageNum: number, pos: { x: number; y: number }) => {
      const RADIUS = 20;
      setSelectionHighlights((prev) =>
        prev.filter((h) => {
          if (h.pageNum !== pageNum) return true;
          // Check if pos is within the highlight rect (expanded by RADIUS)
          const withinX =
            pos.x >= h.left - RADIUS && pos.x <= h.left + h.width + RADIUS;
          const withinY =
            pos.y >= h.top - RADIUS && pos.y <= h.top + h.height + RADIUS;
          return !(withinX && withinY);
        }),
      );
    },
    [],
  );

  // ─── Search: compute match rects ─────────────────────────────────────────

  const computeMatchRects = useCallback(() => {
    if (!searchTerm) {
      setMatchRects([]);
      setActiveMatchIndex(-1);
      return;
    }

    const lower = searchTerm.toLowerCase();
    const rects: MatchRect[] = [];
    let globalIndex = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const wrapper = pageWrapperRefs.current[pageNum];
      if (!wrapper) continue;

      const wrapperRect = wrapper.getBoundingClientRect();

      const spans = wrapper.querySelectorAll<HTMLElement>(
        ".react-pdf__Page__textContent span",
      );

      spans.forEach((span) => {
        const text = span.textContent ?? "";
        if (!text.toLowerCase().includes(lower)) return;

        const sr = span.getBoundingClientRect();
        rects.push({
          top: sr.top - wrapperRect.top,
          left: sr.left - wrapperRect.left,
          width: sr.width,
          height: sr.height,
          pageNum,
          globalIndex: globalIndex++,
        });
      });
    }

    setMatchRects(rects);
    setActiveMatchIndex(rects.length > 0 ? 0 : -1);
  }, [searchTerm, numPages]);

  useEffect(() => {
    const id = setTimeout(computeMatchRects, 150);
    return () => clearTimeout(id);
  }, [computeMatchRects]);

  // ─── Scroll active match into view ───────────────────────────────────────

  useEffect(() => {
    if (activeMatchIndex < 0 || !matchRects[activeMatchIndex]) return;
    const m = matchRects[activeMatchIndex];
    const wrapper = pageWrapperRefs.current[m.pageNum];
    const container = scrollContainerRef.current;
    if (!wrapper || !container) return;

    const wrapperTop = wrapper.offsetTop;
    const matchMidY = wrapperTop + m.top + m.height / 2;
    const targetScrollTop = matchMidY - container.clientHeight / 2;
    container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
  }, [activeMatchIndex, matchRects]);

  const navigateMatch = useCallback(
    (direction: 1 | -1) => {
      setActiveMatchIndex((prev) => {
        if (matchRects.length === 0) return -1;
        if (prev < 0) return 0;
        return (prev + direction + matchRects.length) % matchRects.length;
      });
    },
    [matchRects.length],
  );

  // ─── Scrollbar ────────────────────────────────────────────────────────────

  const updateScrollbar = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const ratio = el.clientHeight / el.scrollHeight;
    const tH = Math.max(el.clientHeight * ratio, 32);
    const maxScroll = el.scrollHeight - el.clientHeight;
    const tT =
      maxScroll > 0 ? (el.scrollTop / maxScroll) * (el.clientHeight - tH) : 0;
    setThumbHeight(tH);
    setThumbTop(tT);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    updateScrollbar();
    el.addEventListener("scroll", updateScrollbar, { passive: true });
    const ro = new ResizeObserver(updateScrollbar);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollbar);
      ro.disconnect();
    };
  }, [updateScrollbar]);

  const handleThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const el = scrollContainerRef.current;
    if (!el) return;
    thumbDragRef.current = { startY: e.clientY, startScrollTop: el.scrollTop };

    const onMove = (ev: MouseEvent) => {
      const drag = thumbDragRef.current;
      if (!drag || !el) return;
      const dy = ev.clientY - drag.startY;
      const ratio = el.scrollHeight / el.clientHeight;
      el.scrollTop = drag.startScrollTop + dy * ratio;
    };
    const onUp = () => {
      thumbDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  // ─── Canvas coordinate helper ────────────────────────────────────────────

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // ─── Eraser ──────────────────────────────────────────────────────────────

  const eraseAt = useCallback(
    (pageNum: number, pos: { x: number; y: number }) => {
      const RADIUS = 20;
      setPagePathsMap((prev) => {
        const paths = prev[pageNum] ?? [];
        const remaining = paths.filter(
          (p) =>
            !p.points.some(
              (pt) => Math.hypot(pt.x - pos.x, pt.y - pos.y) < RADIUS,
            ),
        );
        if (remaining.length === paths.length) return prev;
        setHistoryMap((h) => ({
          ...h,
          [pageNum]: [...(h[pageNum] ?? []), paths],
        }));
        const updated = { ...prev, [pageNum]: remaining };
        persistAnnotations(updated);
        redrawCanvas(pageNum, remaining);
        return updated;
      });

      // Also erase selection highlights near this position
      eraseSelectionHighlightsAt(pageNum, pos);
    },
    [persistAnnotations, redrawCanvas, eraseSelectionHighlightsAt],
  );

  // ─── Mouse handlers ───────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (pageNum: number) => (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Only pen draws on canvas; highlight is handled at wrapper level
      if (tool !== "pen" && tool !== "eraser") return;
      const pos = getCanvasPos(e);
      if (tool === "pen") {
        drawingState.current = {
          active: true,
          page: pageNum,
          currentPath: { points: [pos], tool },
        };
      } else if (tool === "eraser") {
        drawingState.current = {
          active: true,
          page: pageNum,
          currentPath: null,
        };
        eraseAt(pageNum, pos);
      }
    },
    [tool, eraseAt],
  );

  const handleMouseMove = useCallback(
    (pageNum: number) => (e: React.MouseEvent<HTMLCanvasElement>) => {
      const ds = drawingState.current;
      if (!ds.active || ds.page !== pageNum) return;
      const pos = getCanvasPos(e);
      if (tool === "pen" && ds.currentPath) {
        const prev = ds.currentPath;
        const ctx = canvasRefs.current[pageNum]?.getContext("2d");
        if (ctx && prev.points.length > 0) {
          const last = prev.points[prev.points.length - 1];
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.strokeStyle = "red";
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
        }
        drawingState.current.currentPath = {
          ...prev,
          points: [...prev.points, pos],
        };
      } else if (tool === "eraser") {
        eraseAt(pageNum, pos);
      }
    },
    [tool, eraseAt],
  );

  const handleMouseUp = useCallback(
    (pageNum: number) => () => {
      const ds = drawingState.current;
      if (!ds.active || ds.page !== pageNum) return;
      if (ds.currentPath && ds.currentPath.points.length > 0) {
        const path = ds.currentPath;
        setPagePathsMap((prev) => {
          setHistoryMap((h) => ({
            ...h,
            [pageNum]: [...(h[pageNum] ?? []), prev[pageNum] ?? []],
          }));
          const updated = {
            ...prev,
            [pageNum]: [...(prev[pageNum] ?? []), path],
          };
          persistAnnotations(updated);
          return updated;
        });
      }
      drawingState.current = {
        active: false,
        page: pageNum,
        currentPath: null,
      };
    },
    [persistAnnotations],
  );

  // ─── Undo ────────────────────────────────────────────────────────────────

  const handleUndo = useCallback(() => {
    const lastPage = drawingState.current.page;
    setHistoryMap((prevH) => {
      const pageHist = prevH[lastPage] ?? [];
      if (!pageHist.length) return prevH;
      const lastPaths = pageHist[pageHist.length - 1];
      setPagePathsMap((prev) => {
        const updated = { ...prev, [lastPage]: lastPaths };
        persistAnnotations(updated);
        redrawCanvas(lastPage, lastPaths);
        return updated;
      });
      return { ...prevH, [lastPage]: pageHist.slice(0, -1) };
    });
  }, [persistAnnotations, redrawCanvas]);

  // ─── Download ────────────────────────────────────────────────────────────

  const createDocument = useCallback(async () => {
    try {
      saveContentToPDF(
        config?.basicConfig ?? null,
        config?.knowledgeStoreConfig ?? null,
        config?.tabsConfig ?? null,
        file,
      );
    } catch (err) {
      error(`Failed to create document: ${err}`);
    }
  }, [config, file]);

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearchBox(true);
        focusTimeoutRef.current = window.setTimeout(() => {
          searchInputRef.current?.focus();
          focusTimeoutRef.current = null;
        }, 0);
      } else if (e.key === "Escape") {
        setShowSearchBox(false);
        setSearchTerm("");
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "Enter" && showSearchBox) {
        e.preventDefault();
        navigateMatch(e.shiftKey ? -1 : 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (focusTimeoutRef.current !== null)
        window.clearTimeout(focusTimeoutRef.current);
    };
  }, [handleUndo, navigateMatch, showSearchBox]);

  // ─── Cursor style when highlight tool is active ──────────────────────────
  // Allow normal text selection cursor in highlight mode
  const pageWrapperStyle = useCallback(
    (isDarkMode: boolean): React.CSSProperties => ({
      position: "relative",
      display: "inline-block",
      filter: isDarkMode ? "invert(1) hue-rotate(180deg)" : "none",
      // In highlight mode, show text cursor to invite selection
      cursor: tool === "highlight" ? "text" : undefined,
      // Allow text selection in highlight mode; block it otherwise so drawing works
      userSelect: tool === "highlight" ? "text" : "none",
    }),
    [tool],
  );

  // ─── Loading ──────────────────────────────────────────────────────────────

  const isLoading = isLoadingPdf || (!!pdfSource && numPages === 0);

  // ─── Render ──────────────────────────────────────────────────────────────

  const showScrollbar =
    thumbHeight < (scrollContainerRef.current?.clientHeight ?? 0);

  return (
    <div
      className={`mt-2.5 min-h-0 rounded-md flex flex-col ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}
    >
      {/* Search box */}
      {showSearchBox && (
        <Card className="fixed top-24 right-26 p-3 z-50 w-80 shadow-xl">
          <div className="flex gap-1">
            <Input
              ref={searchInputRef}
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  navigateMatch(e.shiftKey ? -1 : 1);
                }
              }}
              className="w-full"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigateMatch(-1)}
              disabled={!searchTerm}
              className="shrink-0 px-2"
              title="Previous (Shift+Enter)"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigateMatch(1)}
              disabled={!searchTerm}
              className="shrink-0 px-2"
              title="Next (Enter)"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {matchRects.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {activeMatchIndex + 1} / {matchRects.length} · Shift+Enter ← ·
              Enter →
            </p>
          )}
          {searchTerm && matchRects.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">No matches</p>
          )}
        </Card>
      )}

      {/* Outer wrapper for scroll + scrollbar */}
      <div className="relative flex-1 min-h-0">
        {isLoading && (
          <div className="absolute inset-0 top-80 flex items-center justify-center z-20">
            <Loading />
          </div>
        )}

        {!isLoadingPdf && !pdfSource && (
          <div className="flex items-center justify-center h-full">
            <p>No PDF loaded</p>
          </div>
        )}

        {/* Scroll container */}
        <div
          ref={scrollContainerRef}
          className="h-full w-full overflow-y-auto flex flex-col items-center gap-4 py-4"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Floating toolbar */}
          <div
            className={`fixed bottom-6 z-50 flex flex-row items-center gap-0.5 p-1.5 rounded-2xl border ${toolbarStyles.base}`}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTool(tool === "pen" ? null : "pen")}
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${tool === "pen" ? toolbarStyles.btnActive : toolbarStyles.btn}`}
            >
              <PenIcon className="h-[15px] w-[15px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTool(tool === "highlight" ? null : "highlight")}
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${tool === "highlight" ? toolbarStyles.btnActive : toolbarStyles.btn}`}
              title="Highlight (select text to highlight)"
            >
              <HighlighterIcon className="h-[15px] w-[15px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTool(tool === "eraser" ? null : "eraser")}
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${tool === "eraser" ? toolbarStyles.btnActive : toolbarStyles.btn}`}
            >
              <EraserIcon className="h-[15px] w-[15px]" />
            </Button>
            <div
              className={`mx-1 h-4 w-px rounded-full ${toolbarStyles.divider}`}
            />
            <Button
              onClick={() => setIsDarkMode((d) => !d)}
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarStyles.btn}`}
            >
              {isDarkMode ? (
                <SunIcon className="h-[15px] w-[15px]" />
              ) : (
                <MoonIcon className="h-[15px] w-[15px]" />
              )}
            </Button>
            <Button
              onClick={createDocument}
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-xl transition-all duration-150 ${toolbarStyles.btn}`}
            >
              <DownloadIcon className="h-[15px] w-[15px]" />
            </Button>
          </div>

          {pdfSource && (
            <div style={{ visibility: isLoading ? "hidden" : "visible" }}>
              <Document
                file={pdfSource}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={null}
                noData={null}
              >
                {Array.from({ length: numPages }, (_, i) => i + 1).map(
                  (pageNum) => (
                    <div
                      key={pageNum}
                      ref={(el) => {
                        pageWrapperRefs.current[pageNum] = el;
                      }}
                      style={pageWrapperStyle(isDarkMode)}
                      onMouseUp={handlePageMouseUp(pageNum)}
                    >
                      <Page
                        pageNumber={pageNum}
                        renderAnnotationLayer
                        renderTextLayer
                        onRenderSuccess={onPageRenderSuccess(pageNum)}
                        loading={null}
                      />

                      {/* Selection-based highlight overlays */}
                      {selectionHighlights
                        .filter((h) => h.pageNum === pageNum)
                        .map((h) => (
                          <div
                            key={h.id}
                            style={{
                              position: "absolute",
                              top: h.top,
                              left: h.left,
                              width: h.width,
                              height: h.height,
                              background: "rgba(255, 220, 0, 0.40)",
                              borderRadius: 2,
                              pointerEvents: "none",
                              zIndex: 10,
                              mixBlendMode: "multiply",
                            }}
                          />
                        ))}

                      {/* Search highlight overlays — above selection highlights */}
                      {matchRects
                        .filter((m) => m.pageNum === pageNum)
                        .map((m) => (
                          <div
                            key={m.globalIndex}
                            style={{
                              position: "absolute",
                              top: m.top,
                              left: m.left,
                              width: m.width,
                              height: m.height,
                              background:
                                m.globalIndex === activeMatchIndex
                                  ? "rgba(255, 140, 0, 0.55)"
                                  : "rgba(255, 220, 0, 0.35)",
                              borderRadius: 2,
                              pointerEvents: "none",
                              zIndex: 11,
                              outline:
                                m.globalIndex === activeMatchIndex
                                  ? "2px solid rgba(255,100,0,0.8)"
                                  : "none",
                            }}
                          />
                        ))}

                      {/* Drawing canvas — above everything */}
                      <canvas
                        ref={(el) => {
                          canvasRefs.current[pageNum] = el;
                        }}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          zIndex: 12,
                          backgroundColor: "transparent",
                        }}
                        className={
                          tool === "pen" || tool === "eraser"
                            ? "pointer-events-auto cursor-crosshair"
                            : "pointer-events-none"
                        }
                        onMouseDown={handleMouseDown(pageNum)}
                        onMouseMove={handleMouseMove(pageNum)}
                        onMouseUp={handleMouseUp(pageNum)}
                        onMouseLeave={handleMouseUp(pageNum)}
                      />
                    </div>
                  ),
                )}
              </Document>
            </div>
          )}
        </div>

        {/* Minimal custom scrollbar */}
        {showScrollbar && (
          <div
            className="absolute right-0 top-0 bottom-0 w-[10px] rounded-full"
            style={{ background: "transparent" }}
          >
            <div
              onMouseDown={handleThumbMouseDown}
              style={{
                position: "absolute",
                top: thumbTop,
                height: thumbHeight,
                width: "5px",
                borderRadius: "9999px",
                background: isDarkMode
                  ? "rgba(237,232,223,0.25)"
                  : "rgba(44,36,22,0.2)",
                cursor: "grab",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  isDarkMode ? "rgba(237,232,223,0.45)" : "rgba(44,36,22,0.4)";
              }}
              onMouseLeave={(e) => {
                if (!thumbDragRef.current)
                  (e.currentTarget as HTMLDivElement).style.background =
                    isDarkMode
                      ? "rgba(237,232,223,0.25)"
                      : "rgba(44,36,22,0.2)";
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
