export type OscilloscopeOptions = {
  canvas: HTMLCanvasElement;
  buffer: Float32Array;
  width: number;
  height: number;
  triggerLevel?: number; // Default: 0
  rising?: boolean; // Default: true (rising zero-crossing)
  color?: string; // Waveform color
  cyclesToShow?: number; // How many cycles to display (default: 2)
};

export function oscilloscope({
  canvas,
  buffer,
  width,
  height,
  triggerLevel = 0,
  rising = true,
  color = "#22d3ee",
  cyclesToShow = 2,
}: OscilloscopeOptions) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (buffer.length === 0) return;

  const firstSample = buffer[0];
  if (firstSample === undefined) return;

  ctx.clearRect(0, 0, width, height);

  // --- Calculate min/max from buffer, but clamp to at least [-1, 1]
  let minBuffer: number = firstSample;
  let maxBuffer: number = firstSample;
  for (let i = 1; i < buffer.length; ++i) {
    const val = buffer[i];
    if (val === undefined) continue;
    if (val < minBuffer) minBuffer = val;
    if (val > maxBuffer) maxBuffer = val;
  }
  const minVal = Math.min(minBuffer, -1);
  const maxVal = Math.max(maxBuffer, 1);

  // 1. Find the first trigger crossing (default: rising zero-crossing)
  let start = 0;
  for (let i = 1; i < buffer.length; i++) {
    const prev = buffer[i - 1];
    const curr = buffer[i];
    if (prev === undefined || curr === undefined) continue;

    if (
      (rising && prev < triggerLevel && curr >= triggerLevel) ||
      (!rising && prev > triggerLevel && curr <= triggerLevel)
    ) {
      start = i;
      break;
    }
  }

  // 2. Find subsequent zero-crossings to delimit cycles
  const crossings: number[] = [start];
  for (let i = start + 1; i < buffer.length; i++) {
    const prev = buffer[i - 1];
    const curr = buffer[i];
    if (prev === undefined || curr === undefined) continue;

    if (
      (rising && prev < triggerLevel && curr >= triggerLevel) ||
      (!rising && prev > triggerLevel && curr <= triggerLevel)
    ) {
      crossings.push(i);
      if (crossings.length > cyclesToShow) break;
    }
  }

  // If not enough cycles found, just use what we have
  const endIndex = crossings[cyclesToShow];
  const end = endIndex ?? buffer.length;

  // Draw y=0 baseline
  const norm0 = (0 - minVal) / (maxVal - minVal);
  const height0 = height - norm0 * height;
  ctx.strokeStyle = "#FFF";
  ctx.beginPath();
  ctx.moveTo(0, height0);
  ctx.lineTo(width, height0);
  ctx.stroke();

  // 3. Draw only from start to end (no wraparound), scaled to minVal/maxVal
  ctx.beginPath();
  for (let i = start; i < end; i++) {
    const val = buffer[i];
    if (val === undefined) continue;

    const normVal = (val - minVal) / (maxVal - minVal);
    const x = ((i - start) / (end - start - 1)) * width;
    const y = height - normVal * height;
    if (i === start) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}
