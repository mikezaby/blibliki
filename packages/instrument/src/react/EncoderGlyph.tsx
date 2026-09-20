const ENCODER_CENTER = 32;
const ENCODER_RADIUS = 24;
const ENCODER_START_ANGLE = 135;
const ENCODER_SWEEP_ANGLE = 270;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toRadians(angle: number) {
  return (angle * Math.PI) / 180;
}

function createEncoderPoint(radius: number, angle: number) {
  const radians = toRadians(angle);

  return {
    x: ENCODER_CENTER + radius * Math.cos(radians),
    y: ENCODER_CENTER + radius * Math.sin(radians),
  };
}

function formatPointValue(value: number) {
  return value.toFixed(2);
}

export function createEncoderArcPath(normalized: number | null, anchor = 0) {
  if (normalized === null) {
    return "";
  }

  const safeNormalized = clamp(normalized, 0, 1);
  const safeAnchor = clamp(anchor, 0, 1);
  const lo = Math.min(safeAnchor, safeNormalized);
  const hi = Math.max(safeAnchor, safeNormalized);
  if (hi - lo <= 0) {
    return "";
  }

  const start = createEncoderPoint(
    ENCODER_RADIUS,
    ENCODER_START_ANGLE + lo * ENCODER_SWEEP_ANGLE,
  );
  const end = createEncoderPoint(
    ENCODER_RADIUS,
    ENCODER_START_ANGLE + hi * ENCODER_SWEEP_ANGLE,
  );
  const largeArc = hi - lo > 2 / 3 ? 1 : 0;

  return `M ${formatPointValue(start.x)} ${formatPointValue(start.y)} A ${ENCODER_RADIUS} ${ENCODER_RADIUS} 0 ${largeArc} 1 ${formatPointValue(end.x)} ${formatPointValue(end.y)}`;
}

function createFullEncoderTrackPath() {
  const start = createEncoderPoint(ENCODER_RADIUS, ENCODER_START_ANGLE);
  const midpoint = createEncoderPoint(
    ENCODER_RADIUS,
    ENCODER_START_ANGLE + 180,
  );
  const end = createEncoderPoint(
    ENCODER_RADIUS,
    ENCODER_START_ANGLE + ENCODER_SWEEP_ANGLE,
  );

  return [
    `M ${formatPointValue(start.x)} ${formatPointValue(start.y)}`,
    `A ${ENCODER_RADIUS} ${ENCODER_RADIUS} 0 1 1 ${formatPointValue(midpoint.x)} ${formatPointValue(midpoint.y)}`,
    `A ${ENCODER_RADIUS} ${ENCODER_RADIUS} 0 0 1 ${formatPointValue(end.x)} ${formatPointValue(end.y)}`,
  ].join(" ");
}

const ENCODER_TRACK_PATH = createFullEncoderTrackPath();

export default function EncoderGlyph({
  normalized,
  anchor,
  inactive,
  accent,
}: {
  normalized: number | null;
  anchor?: number;
  inactive: boolean;
  accent: boolean;
}) {
  const activeArcPath = createEncoderArcPath(normalized, anchor);

  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="h-9 w-16 overflow-visible"
    >
      <path
        d={ENCODER_TRACK_PATH}
        fill="none"
        stroke={inactive ? "rgb(63 63 70 / 0.45)" : "rgb(113 113 122 / 0.5)"}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {activeArcPath ? (
        <path
          d={activeArcPath}
          fill="none"
          stroke={
            inactive
              ? "rgb(82 82 91 / 0.5)"
              : accent
                ? "rgb(232 121 249 / 0.95)"
                : "rgb(244 244 245 / 0.92)"
          }
          strokeWidth="4"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}
