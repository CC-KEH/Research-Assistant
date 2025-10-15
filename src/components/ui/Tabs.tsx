import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface Tab<T = string> {
  id: T;
  label: string;
}

interface TabsProps<T = string> extends React.HTMLAttributes<HTMLDivElement> {
  tabs: Tab<T>[];
  activeTab?: T;
  onTabChange?: (tabId: T) => void;
}

function TabsInner<T extends string | number>(
  { className, tabs, activeTab, onTabChange, ...props }: TabsProps<T>,
  ref: React.Ref<HTMLDivElement>
) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverStyle, setHoverStyle] = useState({});
  const [activeStyle, setActiveStyle] = useState({
    left: "0px",
    width: "0px",
  });
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Update active tab if `activeTab` prop changes externally
  useEffect(() => {
    const index = tabs.findIndex((tab) => tab.id === activeTab);
    if (index !== -1) setActiveIndex(index);
  }, [activeTab, tabs]);

  useEffect(() => {
    if (hoveredIndex !== null) {
      const hoveredElement = tabRefs.current[hoveredIndex];
      if (hoveredElement) {
        const { offsetLeft, offsetWidth } = hoveredElement;
        setHoverStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    }
  }, [hoveredIndex]);

  useEffect(() => {
    const activeElement = tabRefs.current[activeIndex];
    if (activeElement) {
      const { offsetLeft, offsetWidth } = activeElement;
      setActiveStyle({
        left: `${offsetLeft}px`,
        width: `${offsetWidth}px`,
      });
    }
  }, [activeIndex, tabs]);

  // Initial placement
  useEffect(() => {
    requestAnimationFrame(() => {
      const firstElement = tabRefs.current[0];
      if (firstElement) {
        const { offsetLeft, offsetWidth } = firstElement;
        setActiveStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    });
  }, []);

  return (
    <div ref={ref} className={cn("relative self-center", className)} {...props}>
      <div className="relative">
        {/* Hover Highlight */}
        <div
          className="absolute h-[16px] transition-all duration-300 ease-out rounded-[6px] flex items-center"
          style={{
            ...hoverStyle,
            opacity: hoveredIndex !== null ? 1 : 0,
          }}
        />

        {/* Active Indicator */}
        <div
          className="absolute bottom-[-6px] h-[2px] bg-[#0e0f11] dark:bg-white transition-all duration-300 ease-out"
          style={activeStyle}
        />

        {/* Tabs */}
        <div className="relative flex space-x-[6px] items-center">
          {tabs.map((tab, index) => (
            <div
              key={String(tab.id)}
              ref={(el) => (tabRefs.current[index] = el)}
              className={cn(
                "px-3 py-2 cursor-pointer transition-colors duration-300 h-[17px]",
                index === activeIndex
                  ? "text-[#0e0e10] dark:text-white"
                  : "text-[#0e0f1199] dark:text-[#ffffff99]"
              )}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => {
                setActiveIndex(index);
                onTabChange?.(tab.id);
              }}
            >
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center h-full">
                {tab.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export const Tabs = React.forwardRef(TabsInner) as <T extends string | number>(
  props: TabsProps<T> & { ref?: React.Ref<HTMLDivElement> }
) => ReturnType<typeof TabsInner>;
