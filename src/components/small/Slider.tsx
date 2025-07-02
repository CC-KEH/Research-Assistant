import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface CustomSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
}

export default function CustomSlider({
  label,
  min,
  max,
  step,
  defaultValue = (min + max) / 2,
  onChange,
}: CustomSliderProps) {
  // Ensure last tick is included (fix for floating point error)
  const ticks: number[] = [];
  for (let val = min; val <= max; val = parseFloat((val + step).toFixed(10))) {
    ticks.push(val);
  }

  const skipInterval = Math.ceil(ticks.length / 6);

  return (
    <div className="space-y-4 min-w-[300px]">
      <Label>{label}</Label>
      <div className="relative">
        <Slider
          defaultValue={[defaultValue]}
          min={min}
          max={max}
          step={step}
          aria-label={label}
          onValueChange={(val) => onChange?.(val[0])}
        />
        <div className="mt-3 flex w-full justify-between text-xs text-muted-foreground">
          {ticks.map((val, i) => {
            const showLabel =
              i % skipInterval === 0 || val === min || val === max;
            return (
              <div key={i} className="flex flex-col items-center w-4">
                <div
                  className={cn(
                    "h-2 w-px bg-muted-foreground",
                    !showLabel && "h-1 bg-muted-foreground/50"
                  )}
                />
                <span className={cn("mt-1", !showLabel && "opacity-0")}>
                  {parseFloat(val.toFixed(2))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
