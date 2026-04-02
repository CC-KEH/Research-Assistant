import { useEffect, useMemo, useState } from "react";
import { GitBranch, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { info } from "@/lib/logger";

export default function Welcome() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["new", "minimal", "smart", "intelligent", "powerful"],
    [],
  );

  useEffect(() => {
    info("<<<<<Welcome mounted>>>>>");
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="container mx-auto">
      <div className="flex gap-8 pt-24 md:pt-28 items-center justify-center flex-col">
        <div>
          <a
            href="https://github.com/CC-KEH/Research-Assistant"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary" size="sm" className="gap-4">
              Read the launch post <MoveRight className="w-4 h-4" />
            </Button>
          </a>
        </div>
        <div className="flex gap-4 flex-col">
          <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular">
            <span className="text-spektr-cyan-50">This is something</span>
            <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1 dark:text-white text-black">
              &nbsp;
              {titles.map((title, index) => (
                <motion.span
                  key={index}
                  className="absolute font-semibold"
                  initial={{ opacity: 0, y: "-100" }}
                  transition={{ type: "spring", stiffness: 50 }}
                  animate={
                    titleNumber === index
                      ? {
                          y: 0,
                          opacity: 1,
                        }
                      : {
                          y: titleNumber > index ? -150 : 150,
                          opacity: 0,
                        }
                  }
                >
                  {title}
                </motion.span>
              ))}
            </span>
          </h1>

          <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
            Effortlessly search, organize, and synthesize academic papers. Ask
            complex questions, generate concise summaries, and uncover key
            insights — all in one intelligent workspace.
          </p>
        </div>
        <div className="flex flex-row gap-3">
          <a
            href="https://github.com/CC-KEH/Research-Assistant"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" className="gap-4" variant="outline">
              Support on GitHub <GitBranch className="w-4 h-4" />
            </Button>
          </a>

          <Link to="/project-setup">
            <Button size="lg" className="gap-4">
              Get Started <MoveRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
