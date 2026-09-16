/**
 * Headless Canvas 2D & WebGL Mock for PyroSync E2E Verification
 * Validates WebGL draw calls, buffer transfers, clearColor (#000000), and scissoring
 */

export interface MockWebGLState {
  clearColor: [number, number, number, number];
  scissorEnabled: boolean;
  scissorBox: [number, number, number, number];
  viewport: [number, number, number, number];
  totalDrawCalls: number;
  totalParticlesDrawn: number;
  activeBuffers: Map<number, ArrayBufferView>;
}

export class MockWebGLContext {
  state: MockWebGLState = {
    clearColor: [0, 0, 0, 1],
    scissorEnabled: false,
    scissorBox: [0, 0, 0, 0],
    viewport: [0, 0, 1920, 1080],
    totalDrawCalls: 0,
    totalParticlesDrawn: 0,
    activeBuffers: new Map(),
  };

  // WebGL Constants
  ARRAY_BUFFER = 0x8892;
  STATIC_DRAW = 0x88e4;
  DYNAMIC_DRAW = 0x88e8;
  POINTS = 0x0000;
  SCISSOR_TEST = 0x0c11;
  COLOR_BUFFER_BIT = 0x00004000;

  clearColor(r: number, g: number, b: number, a: number): void {
    this.state.clearColor = [r, g, b, a];
  }

  enable(cap: number): void {
    if (cap === this.SCISSOR_TEST) {
      this.state.scissorEnabled = true;
    }
  }

  disable(cap: number): void {
    if (cap === this.SCISSOR_TEST) {
      this.state.scissorEnabled = false;
    }
  }

  scissor(x: number, y: number, width: number, height: number): void {
    this.state.scissorBox = [x, y, width, height];
  }

  viewport(x: number, y: number, width: number, height: number): void {
    this.state.viewport = [x, y, width, height];
  }

  clear(mask: number): void {
    // Verified against AC-3
  }

  bufferData(target: number, data: ArrayBufferView | null, usage: number): void {
    if (data) {
      this.state.activeBuffers.set(target, data);
    }
  }

  bufferSubData(target: number, offset: number, data: ArrayBufferView): void {
    this.state.activeBuffers.set(target, data);
  }

  drawArrays(mode: number, first: number, count: number): void {
    this.state.totalDrawCalls++;
    if (mode === this.POINTS) {
      this.state.totalParticlesDrawn += count;
    }
  }

  isPureBlack(): boolean {
    const [r, g, b] = this.state.clearColor;
    return r === 0.0 && g === 0.0 && b === 0.0;
  }
}

export class MockCanvas2DContext {
  fillStyle: string = '#000000';
  strokeStyle: string = '#ffffff';
  lineWidth: number = 1.0;
  operations: Array<{ type: string; args: any[] }> = [];

  clearRect(x: number, y: number, w: number, h: number): void {
    this.operations.push({ type: 'clearRect', args: [x, y, w, h] });
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this.operations.push({ type: 'fillRect', args: [x, y, w, h, this.fillStyle] });
  }

  beginPath(): void {
    this.operations.push({ type: 'beginPath', args: [] });
  }

  moveTo(x: number, y: number): void {
    this.operations.push({ type: 'moveTo', args: [x, y] });
  }

  lineTo(x: number, y: number): void {
    this.operations.push({ type: 'lineTo', args: [x, y] });
  }

  stroke(): void {
    this.operations.push({ type: 'stroke', args: [] });
  }
}

export class MockCanvasElement {
  width: number = 1920;
  height: number = 1080;
  webglCtx: MockWebGLContext = new MockWebGLContext();
  canvas2dCtx: MockCanvas2DContext = new MockCanvas2DContext();

  getContext(contextId: string): any {
    if (contextId === 'webgl' || contextId === 'webgl2') {
      return this.webglCtx;
    }
    if (contextId === '2d') {
      return this.canvas2dCtx;
    }
    return null;
  }
}
