import React from "react";
import { useTheme } from "../providers/ThemeProvider";

const Loading: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.theme === "dark";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        gap: 24,
      }}
    >
      <style>{`
        @keyframes load-orbit-1 {
          from { transform: rotate(0deg) translateX(28px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
        }
        @keyframes load-orbit-2 {
          from { transform: rotate(120deg) translateX(28px) rotate(-120deg); }
          to   { transform: rotate(480deg) translateX(28px) rotate(-480deg); }
        }
        @keyframes load-orbit-3 {
          from { transform: rotate(240deg) translateX(28px) rotate(-240deg); }
          to   { transform: rotate(600deg) translateX(28px) rotate(-600deg); }
        }
        @keyframes load-pulse-ring {
          0%, 100% { opacity: 0.08; transform: scale(1); }
          50%       { opacity: 0.18; transform: scale(1.08); }
        }
        @keyframes load-fade-text {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
      `}</style>

      {/* Orbit rig */}
      <div style={{ position: "relative", width: 72, height: 72 }}>
        {/* Outer pulsing ring */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `0.5px solid ${isDarkMode ? "rgba(237,232,223,0.2)" : "rgba(28,25,23,0.15)"}`,
            animation: "load-pulse-ring 2.4s ease-in-out infinite",
          }}
        />
        {/* Inner static ring */}
        <div
          style={{
            position: "absolute",
            inset: 10,
            borderRadius: "50%",
            border: `0.5px solid ${isDarkMode ? "rgba(237,232,223,0.1)" : "rgba(28,25,23,0.08)"}`,
          }}
        />
        {/* Dot 1 — brightest */}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            position: "absolute",
            top: "50%",
            left: "50%",
            margin: "-3px 0 0 -3px",
            background: isDarkMode
              ? "rgba(237,232,223,0.85)"
              : "rgba(28,25,23,0.8)",
            animation: "load-orbit-1 1.8s cubic-bezier(0.4,0,0.2,1) infinite",
          }}
        />
        {/* Dot 2 — mid */}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            position: "absolute",
            top: "50%",
            left: "50%",
            margin: "-3px 0 0 -3px",
            background: isDarkMode
              ? "rgba(237,232,223,0.5)"
              : "rgba(28,25,23,0.45)",
            animation: "load-orbit-2 1.8s cubic-bezier(0.4,0,0.2,1) infinite",
          }}
        />
        {/* Dot 3 — faintest */}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            position: "absolute",
            top: "50%",
            left: "50%",
            margin: "-3px 0 0 -3px",
            background: isDarkMode
              ? "rgba(237,232,223,0.25)"
              : "rgba(28,25,23,0.2)",
            animation: "load-orbit-3 1.8s cubic-bezier(0.4,0,0.2,1) infinite",
          }}
        />
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: isDarkMode ? "rgba(237,232,223,0.35)" : "rgba(28,25,23,0.35)",
          animation: "load-fade-text 2.4s ease-in-out infinite",
        }}
      >
        Loading document
      </span>
    </div>
  );
};

export default Loading;
