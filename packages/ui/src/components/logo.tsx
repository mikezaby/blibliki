import { cn } from "@/lib/cn";

// Four jigsaw pieces with the top right one missing. The tab that points into
// the gap, with the square above it, is a lowercase i. Drawn on a 100-unit
// grid: 4-unit seams, tabs 7.2 wide and 9 long, outer corners of radius 10.
// Each app's public/favicon.svg carries the same path with its own fills.
const MARK_PATH =
  "M16 6H48V20.4H37V35.6H48V48H31.6V59H24.4V48H6V16A10 10 0 0 1 16 6ZM6 52H20.4V63H35.6V52H48V68.4H59V75.6H48V94H16A10 10 0 0 1 6 84ZM52 52H68.4V41H75.6V52H94V84A10 10 0 0 1 84 94H52V79.6H63V64.4H52ZM68.4 29.8H75.6V37H68.4Z";

export interface LogoProps {
  // Writes the name beside the mark. The mark then follows the font size,
  // standing a little taller than the capitals.
  wordmark?: boolean;
  className?: string;
}

function Logo({ wordmark = false, className }: LogoProps) {
  if (!wordmark) {
    return (
      <svg
        viewBox="0 0 100 100"
        fill="currentColor"
        role="img"
        aria-label="Blibliki"
        className={cn("ui-logo-mark", className)}
      >
        <path d={MARK_PATH} />
      </svg>
    );
  }

  return (
    <span className={cn("ui-logo", className)}>
      {/* Cropped to the drawing, so the stylesheet sizes the square itself. */}
      <svg
        viewBox="6 6 88 88"
        fill="currentColor"
        aria-hidden="true"
        className="ui-logo__mark"
      >
        <path d={MARK_PATH} />
      </svg>
      Blibliki
    </span>
  );
}

export { Logo };
