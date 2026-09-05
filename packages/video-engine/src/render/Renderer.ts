import { RenderPass } from "@/core/graph";
import { VideoModuleType } from "@/modules";
import { FRAGMENT, VERTEX } from "./shaders";

type Target = { texture: WebGLTexture; framebuffer: WebGLFramebuffer };

export class Renderer {
  private gl: WebGL2RenderingContext;
  private programs = new Map<VideoModuleType, WebGLProgram>();
  private targets = new Map<string, Target>();
  private black!: WebGLTexture;

  constructor(private canvas: OffscreenCanvas) {
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 is not available in this worker");
    this.gl = gl;

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.setup();
    });

    this.setup();
  }

  resize(width: number, height: number) {
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.disposeTargets();
  }

  render(passes: RenderPass[]) {
    const { gl } = this;
    const { width, height } = this.canvas;
    gl.viewport(0, 0, width, height);

    for (const pass of passes) {
      const program = this.programs.get(pass.moduleType);
      if (!program) continue;
      gl.useProgram(program);

      const isOutput = pass.moduleType === VideoModuleType.Output;
      gl.bindFramebuffer(
        gl.FRAMEBUFFER,
        isOutput ? null : this.target(pass.moduleId).framebuffer,
      );

      let unit = 0;
      for (const [ioName, sourceId] of Object.entries(pass.inputs)) {
        const texture =
          sourceId === null ? this.black : this.target(sourceId).texture;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(program, `u_${ioName}`), unit);
        unit += 1;
      }

      for (const [name, value] of Object.entries(pass.uniforms)) {
        gl.uniform1f(gl.getUniformLocation(program, `u_${name}`), value);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  dispose() {
    this.disposeTargets();
    for (const program of this.programs.values()) {
      this.gl.deleteProgram(program);
    }
    this.programs.clear();
    this.gl.deleteTexture(this.black);
  }

  private setup() {
    const { gl } = this;
    this.programs.clear();
    this.targets.clear();
    gl.bindVertexArray(gl.createVertexArray());

    for (const [type, fragment] of Object.entries(FRAGMENT)) {
      this.programs.set(type as VideoModuleType, this.compile(fragment));
    }

    this.black = this.createTexture(1, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]),
    );
  }

  private compile(fragment: string): WebGLProgram {
    const { gl } = this;
    const program = gl.createProgram();
    const stages = [
      [gl.VERTEX_SHADER, VERTEX],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const;
    for (const [kind, source] of stages) {
      const shader = gl.createShader(kind);
      if (!shader) throw new Error("Could not create shader");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compile failed");
      }
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "Program link failed");
    }

    return program;
  }

  private createTexture(width: number, height: number): WebGLTexture {
    const { gl } = this;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
  }

  // One canvas-sized texture per non-output module, created on first use.
  // ponytail: targets outlive removed modules until the next resize; prune
  // against the pass list if memory matters.
  private target(moduleId: string): Target {
    const existing = this.targets.get(moduleId);
    if (existing) return existing;

    const { gl } = this;
    const texture = this.createTexture(this.canvas.width, this.canvas.height);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const target = { texture, framebuffer };
    this.targets.set(moduleId, target);

    return target;
  }

  private disposeTargets() {
    for (const { texture, framebuffer } of this.targets.values()) {
      this.gl.deleteTexture(texture);
      this.gl.deleteFramebuffer(framebuffer);
    }
    this.targets.clear();
  }
}
