import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
import { LucideIcon, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Todos from "@/pages/Todos";
import Settings from "@/components/Settings";
import About from "@/pages/About";
import News from "@/pages/News";
import { useTheme } from "../providers/ThemeProvider";

interface Tab {
  type: "tab";
  title: string;
  icon: LucideIcon;
  route: string;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
}

interface Toggle {
  type: "toggle";
  icon: LucideIcon;
  toggledIcon: LucideIcon;
  title?: never;
}

type TabItem = Tab | Separator | Toggle;

interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  onChange?: (index: number | null) => void;
}

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: ".5rem",
    paddingRight: ".5rem",
  },
  hover: {
    gap: ".5rem",
    paddingLeft: "1rem",
    paddingRight: "1rem",
  },
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  hover: { width: "auto", opacity: 1 },
};

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-primary",
  onChange,
}: ExpandableTabsProps) {
  const theme = useTheme();
  const [selected, setSelected] = React.useState<number | null>(null);
  const [modal, setModal] = React.useState<
    null | "Todos" | "News" | "Settings" | "About"
  >(null);

  const outsideClickRef = React.useRef(null);

  useOnClickOutside(outsideClickRef, () => {
    setSelected(null);
    onChange?.(null);
  });

  const handleSelect = (index: number | null) => {
    setSelected(index);
    onChange?.(index);
    if (index != null) {
      if (tabs[index].type === "toggle") {
        // Toggle Theme
        if (theme.theme === "dark") {
          theme.setTheme("light");
          tabs[index].icon = Sun;
        } else {
          theme.setTheme("dark");
          tabs[index].icon = Moon;
        }
      } else if (tabs[index].type === "tab") {
        switch (tabs[index].route) {
          case "/Todos":
            setModal("Todos");
            break;
          case "/News":
            setModal("News");
            break;
          case "/Settings":
            setModal("Settings");
            break;
          case "/About":
            setModal("About");
            break;
          default:
            break;
        }
      }
    }
  };

  const Separator = () => (
    <div className="mx-1 h-[24px] w-[1.2px] bg-border" aria-hidden="true" />
  );

  return (
    <div
      ref={outsideClickRef}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border bg-background p-1 shadow-sm",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return <Separator key={`separator-${index}`} />;
        }

        const isSelected = selected === index;

        if (tab.type === "toggle") {
          const Icon = isSelected ? tab.toggledIcon : tab.icon;
          return (
            <motion.button
              key={`toggle-${index}`}
              onClick={() => handleSelect(isSelected ? null : index)}
              className={cn(
                "relative flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-300",
                isSelected
                  ? cn("bg-muted", activeColor)
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isSelected ? "on" : "off"}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex"
                >
                  <Icon size={20} />
                </motion.span>
              </AnimatePresence>
            </motion.button>
          );
        }

        const Icon = tab.icon;
        return (
          <motion.button
            key={tab.title}
            onClick={() => handleSelect(index)}
            initial="initial"
            whileHover="hover"
            animate="initial"
            variants={buttonVariants}
            custom={true}
            transition={{
              type: "spring",
              bounce: 0,
              duration: 0.4,
            }}
            className={cn(
              "relative flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon size={20} />
            <motion.span variants={spanVariants} className="overflow-hidden">
              {tab.title}
            </motion.span>
          </motion.button>
        );
      })}
      <Dialog open={modal !== null} onOpenChange={() => setModal(null)}>
        <DialogContent className="min-w-2xl h-3/4 overflow-y-hidden scrollbar-thin">
          {modal === "Todos" && <Todos />}
          {modal === "News" && <News />}
          {modal === "Settings" && <Settings />}
          {modal === "About" && <About />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
