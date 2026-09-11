import { readsOf, RenderPass } from "@/core/graph";
import { instanceRect } from "@/core/instances";
import { VideoModuleType } from "@/modules";
import { COMPOSE, FRAGMENT, VERTEX } from "./shaders";

type Target = { texture: WebGLTexture; framebuffer: WebGLFramebuffer };

export class Renderer {
  private gl: WebGL2RenderingContext;
  private programs = new Map<VideoModuleType, WebGLProgram>();
  private compose!: WebGLProgram;
  // Canvas-sized targets: `bound` holds the ones written this frame by key,
  // `pool` the free ones. A target goes back to the pool after its last
  // reader, so peak use is about the widest instance count plus one, not one
  // per module and instance.
  // ponytail: nothing survives a frame; a feedback pass will need a target
  // that does.
  private bound = new Map<string, Target>();
  private pool: Target[] = [];
  // Textures no route provides: a pass's kept output (`<target>:prev`),
  // canvas-sized and dropped on resize.
  private external = new Map<string, WebGLTexture>();
  private black!: WebGLTexture;
  private now = 0;

  constructor(readonly canvas: OffscreenCanvas) {
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

  render(passes: RenderPass[], now = 0) {
    const { gl } = this;
    const { width, height } = this.canvas;
    gl.viewport(0, 0, width, height);
    this.now = now;

    const lastRead = new Map<string, number>();
    passes.forEach((pass, index) => {
      for (const key of readsOf(pass)) lastRead.set(key, index);
    });

    passes.forEach((pass, index) => {
      const isOutput = pass.moduleType === VideoModuleType.Output;
      gl.bindFramebuffer(
        gl.FRAMEBUFFER,
        isOutput ? null : this.acquire(pass.target).framebuffer,
      );

      if (pass.compose) {
        this.composeInstances(pass.inputs.in ?? null, pass.compose);
      } else {
        this.draw(pass);
        if (pass.keep) this.keep(pass.target);
      }

      for (const key of readsOf(pass)) {
        if (lastRead.get(key) === index) this.release(key);
      }
    });

    for (const key of Array.from(this.bound.keys())) this.release(key);
  }

  dispose() {
    this.disposeTargets();
    for (const program of this.programs.values()) {
      this.gl.deleteProgram(program);
    }
    this.programs.clear();
    this.gl.deleteProgram(this.compose);
    this.gl.deleteTexture(this.black);
  }

  private draw(pass: RenderPass) {
    const { gl } = this;
    const program = this.programs.get(pass.moduleType);
    if (!program) return;
    gl.useProgram(program);

    let unit = 0;
    for (const [ioName, key] of Object.entries(pass.inputs)) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, this.texture(key));
      gl.uniform1i(gl.getUniformLocation(program, `u_${ioName}`), unit);
      unit += 1;
    }

    for (const [name, value] of Object.entries(pass.uniforms)) {
      gl.uniform1f(gl.getUniformLocation(program, `u_${name}`), value);
    }
    gl.uniform1f(gl.getUniformLocation(program, "u_time"), this.now);
    gl.uniform2f(
      gl.getUniformLocation(program, "u_resolution"),
      this.canvas.width,
      this.canvas.height,
    );

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // One draw per instance with the viewport set to its cell, sampling the same
  // cell of that instance's frame.
  private composeInstances(
    source: string | null,
    { instances, layout }: NonNullable<RenderPass["compose"]>,
  ) {
    const { gl } = this;
    const { width, height } = this.canvas;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.compose);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(this.compose, "u_in"), 0);
    const rect = gl.getUniformLocation(this.compose, "u_rect");

    for (let instance = 0; instance < instances; instance += 1) {
      const cell = instanceRect(instance, instances, layout);
      gl.viewport(
        Math.round(cell.x * width),
        Math.round(cell.y * height),
        Math.round(cell.width * width),
        Math.round(cell.height * height),
      );
      gl.bindTexture(
        gl.TEXTURE_2D,
        this.texture(source === null ? null : `${source}:${instance}`),
      );
      gl.uniform4f(rect, cell.x, cell.y, cell.width, cell.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    gl.viewport(0, 0, width, height);
  }

  private texture(key: string | null): WebGLTexture {
    if (key === null) return this.black;

    return this.external.get(key) ?? this.bound.get(key)?.texture ?? this.black;
  }

  // Copies the framebuffer just drawn into the pass's kept texture.
  private keep(target: string) {
    const { gl } = this;
    const { width, height } = this.canvas;
    const key = `${target}:prev`;
    let texture = this.external.get(key);
    if (!texture) {
      texture = this.createTexture(width, height);
      this.external.set(key, texture);
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, width, height);
  }

  private acquire(key: string): Target {
    const target = this.pool.pop() ?? this.createTarget();
    this.bound.set(key, target);

    return target;
  }

  private release(key: string) {
    const target = this.bound.get(key);
    if (!target) return;
    this.bound.delete(key);
    this.pool.push(target);
  }

  private setup() {
    const { gl } = this;
    this.programs.clear();
    this.bound.clear();
    this.pool = [];
    this.external.clear();
    gl.bindVertexArray(gl.createVertexArray());

    for (const [type, fragment] of Object.entries(FRAGMENT)) {
      this.programs.set(type as VideoModuleType, this.compile(fragment));
    }
    this.compose = this.compile(COMPOSE);

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

  private createTarget(): Target {
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

    return { texture, framebuffer };
  }

  private disposeTargets() {
    for (const { texture, framebuffer } of [
      ...this.bound.values(),
      ...this.pool,
    ]) {
      this.gl.deleteTexture(texture);
      this.gl.deleteFramebuffer(framebuffer);
    }
    this.bound.clear();
    this.pool = [];
    for (const [key, texture] of this.external) {
      if (!key.endsWith(":prev")) continue;
      this.gl.deleteTexture(texture);
      this.external.delete(key);
    }
  }
}
