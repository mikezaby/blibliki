import { VideoModuleType } from "@/modules";

export const VERTEX = `#version 300 es
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// Every pass gets the clock in seconds and the target size in pixels.
const HEADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform float u_time;
uniform vec2 u_resolution;
`;

const HSL = `
vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}`;

const BLIT = `${HEADER}
uniform sampler2D u_in;
void main() {
  outColor = texture(u_in, v_uv);
}`;

// Draws one instance into its cell: the viewport is the cell and u_rect is the
// same cell in the instance's frame.
export const COMPOSE = `${HEADER}
uniform sampler2D u_in;
uniform vec4 u_rect;
void main() {
  outColor = texture(u_in, u_rect.xy + v_uv * u_rect.zw);
}`;

// Control modules have no shader; they never become a pass. Layout has one
// for a single input; with instances its pass composes instead.
export const FRAGMENT: Partial<Record<VideoModuleType, string>> = {
  [VideoModuleType.Source]: `${HEADER}
uniform float u_mode, u_hue, u_saturation, u_lightness, u_spread;
${HSL}
void main() {
  float hue = u_hue + (u_mode > 0.5 ? v_uv.x * u_spread : 0.0);
  outColor = vec4(hsl2rgb(vec3(fract(hue / 360.0), u_saturation, u_lightness)), 1.0);
}`,

  [VideoModuleType.Noise]: `${HEADER}
uniform float u_scale, u_speed, u_octaves, u_contrast;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y);
}
void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = v_uv * vec2(aspect, 1.0) * u_scale;
  vec2 drift = vec2(u_time * u_speed, u_time * u_speed * 0.7);
  float n = 0.0;
  float amp = 0.5;
  float sum = 0.0;
  for (int o = 0; o < 4; o++) {
    if (float(o) >= u_octaves) break;
    n += amp * vnoise(p + drift);
    sum += amp;
    p *= 2.0;
    amp *= 0.5;
  }
  n = clamp((n / sum - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  outColor = vec4(vec3(n), 1.0);
}`,

  [VideoModuleType.Shapes]: `${HEADER}
uniform float u_shape, u_size, u_thickness, u_count, u_x, u_y, u_softness;
void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - vec2(u_x, u_y)) * vec2(aspect, 1.0);
  int shape = int(u_shape + 0.5);
  float d = shape == 0 ? length(p) - u_size
    : shape == 1 ? abs(length(p) - u_size) - u_thickness
    : abs(fract(v_uv.x * u_count) - 0.5) - u_thickness;
  float m = 1.0 - smoothstep(0.0, max(u_softness, 0.0005), d);
  outColor = vec4(vec3(m), m);
}`,

  [VideoModuleType.HueRotate]: `${HEADER}
uniform sampler2D u_in;
uniform float u_amount;
void main() {
  vec4 c = texture(u_in, v_uv);
  float a = radians(u_amount);
  mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * c.rgb;
  vec3 rotated = vec3(yiq.x, yiq.y * cos(a) - yiq.z * sin(a), yiq.y * sin(a) + yiq.z * cos(a));
  outColor = vec4(clamp(toRGB * rotated, 0.0, 1.0), c.a);
}`,

  [VideoModuleType.Merge]: `${HEADER}
uniform sampler2D u_a, u_b;
uniform float u_mode, u_amount;
void main() {
  vec4 a = texture(u_a, v_uv);
  vec4 b = texture(u_b, v_uv);
  int mode = int(u_mode + 0.5);
  if (mode == 1) {
    outColor = vec4(mix(a.rgb, b.rgb, b.a * u_amount), 1.0);
    return;
  }
  // Input a takes the left, top, or top-left side; uv.y runs bottom-up.
  float down = 1.0 - v_uv.y;
  float edge = mode == 2 ? v_uv.x
    : mode == 3 ? down
    : mode == 4 ? (v_uv.x + down) * 0.5
    : -1.0;
  if (edge >= 0.0) {
    outColor = edge < u_amount ? a : b;
    return;
  }
  if (mode >= 5) {
    vec3 blend = mode == 5 ? min(a.rgb + b.rgb, 1.0)
      : mode == 6 ? a.rgb * b.rgb
      : mode == 7 ? 1.0 - (1.0 - a.rgb) * (1.0 - b.rgb)
      : abs(a.rgb - b.rgb);
    outColor = vec4(mix(a.rgb, blend, u_amount), 1.0);
    return;
  }
  outColor = mix(a, b, u_amount);
}`,

  [VideoModuleType.Color]: `${HEADER}
uniform sampler2D u_in;
uniform float u_brightness, u_contrast, u_saturation, u_invert;
void main() {
  vec4 c = texture(u_in, v_uv);
  vec3 rgb = (c.rgb - 0.5) * u_contrast + 0.5 + u_brightness;
  float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
  rgb = mix(vec3(luma), rgb, u_saturation);
  rgb = clamp(rgb, 0.0, 1.0);
  if (u_invert > 0.5) rgb = 1.0 - rgb;
  outColor = vec4(rgb, c.a);
}`,

  [VideoModuleType.Transform]: `${HEADER}
uniform sampler2D u_in;
uniform float u_zoom, u_rotate, u_x, u_y, u_tile;
void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = v_uv - 0.5 - vec2(u_x, u_y) * 0.5;
  p.x *= aspect;
  float a = radians(-u_rotate);
  p = vec2(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a)) / u_zoom;
  p.x /= aspect;
  vec2 uv = p + 0.5;
  if (u_tile > 0.5) {
    uv = fract(uv);
  } else if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    outColor = vec4(0.0);
    return;
  }
  outColor = texture(u_in, uv);
}`,

  [VideoModuleType.Mirror]: `${HEADER}
uniform sampler2D u_in;
uniform float u_mode, u_segments, u_angle;
void main() {
  int mode = int(u_mode + 0.5);
  vec2 uv = v_uv;
  if (mode == 0 || mode == 2) uv.x = uv.x < 0.5 ? uv.x : 1.0 - uv.x;
  if (mode == 1 || mode == 2) uv.y = uv.y < 0.5 ? uv.y : 1.0 - uv.y;
  if (mode == 3) {
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
    float seg = 6.28318530718 / max(u_segments, 1.0);
    float a = atan(p.y, p.x) - radians(u_angle);
    a = mod(a, seg);
    a = abs(a - seg * 0.5);
    p = length(p) * vec2(cos(a), sin(a));
    uv = p / vec2(aspect, 1.0) + 0.5;
  }
  outColor = texture(u_in, uv);
}`,

  [VideoModuleType.Feedback]: `${HEADER}
uniform sampler2D u_in, u_prev;
uniform float u_decay, u_zoom;
void main() {
  vec4 c = texture(u_in, v_uv);
  vec4 p = texture(u_prev, (v_uv - 0.5) / u_zoom + 0.5);
  outColor = vec4(max(c.rgb, p.rgb * u_decay), 1.0);
}`,

  [VideoModuleType.Layout]: BLIT,

  [VideoModuleType.Output]: BLIT,
};
