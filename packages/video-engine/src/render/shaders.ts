import { VideoModuleType } from "@/modules";

export const VERTEX = `#version 300 es
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const HEADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
`;

const HSL = `
vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}`;

export const FRAGMENT: Record<VideoModuleType, string> = {
  [VideoModuleType.Source]: `${HEADER}
uniform float u_mode, u_hue, u_saturation, u_lightness, u_spread;
${HSL}
void main() {
  float hue = u_hue + (u_mode > 0.5 ? v_uv.x * u_spread : 0.0);
  outColor = vec4(hsl2rgb(vec3(fract(hue / 360.0), u_saturation, u_lightness)), 1.0);
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
  outColor = mix(a, b, u_amount);
}`,

  [VideoModuleType.Output]: `${HEADER}
uniform sampler2D u_in;
void main() {
  outColor = texture(u_in, v_uv);
}`,
};
