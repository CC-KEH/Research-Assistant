import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface TitleBarProps {
  title?: string;
  icon?: string;
}

export function TitleBar({ title = "My App", icon }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized);
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-7 w-full shrink-0
                 bg-background border-b border-border select-none"
    >
      {/* Left: icon + title */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 pl-3 flex-1 min-w-0"
      >
        {icon && (
          <img
            src={icon}
            alt="app icon"
            draggable={false}
            className="w-4 h-4 object-contain shrink-0"
          />
        )}
        <span
          data-tauri-drag-region
          className="text-[12.5px] font-medium tracking-wide
                     text-muted-foreground truncate"
        >
          {title}
        </span>
      </div>

      {/* Right: window controls — no drag region here */}
      <div className="flex items-stretch h-full shrink-0">
        <WinBtn onClick={() => appWindow.minimize()} label="Minimize">
          <MinimizeIcon />
        </WinBtn>

        <WinBtn
          onClick={() => appWindow.toggleMaximize()}
          label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
        </WinBtn>

        <WinBtn onClick={() => appWindow.close()} label="Close" isClose>
          <CloseIcon />
        </WinBtn>
      </div>
    </div>
  );
}

/* ─── Button ─────────────────────────────────────────────────────────────── */

function WinBtn({
  onClick,
  label,
  isClose = false,
  children,
}: {
  onClick: () => void;
  label: string;
  isClose?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center w-[46px] h-full border-none
                  text-muted-foreground transition-colors duration-100 cursor-pointer
                  ${
                    isClose
                      ? "hover:bg-red-300 hover:text-white active:bg-red-500"
                      : "hover:bg-accent hover:text-accent-foreground active:bg-accent/70"
                  }`}
    >
      {children}
    </button>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */

function MinimizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <rect x="0" y="4.5" width="10" height="1" fill="currentColor" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <rect x="0" y="2" width="8" height="8" stroke="currentColor" />
      <path d="M2 2V0H10V8H8" stroke="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <line
        x1="0"
        y1="0"
        x2="10"
        y2="10"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <line
        x1="10"
        y1="0"
        x2="0"
        y2="10"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
