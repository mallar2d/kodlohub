/**
 * Test setup for Brat TD.
 *
 * Provides global mocks for browser APIs not available in Node:
 * - Canvas 2D rendering context
 * - Audio API
 * - requestAnimationFrame / cancelAnimationFrame
 * - matchMedia
 */

// ── Canvas 2D context mock ──────────────────────────────────────────
class MockCanvasRenderingContext2D {
  canvas: HTMLCanvasElement = {} as HTMLCanvasElement;

  // fillStyle / strokeStyle etc.
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  font = '';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  globalAlpha = 1;
  globalCompositeOperation: GlobalCompositeOperation = 'source-over';
  shadowBlur = 0;
  shadowColor = 'transparent';
  shadowOffsetX = 0;
  shadowOffsetY = 0;
  miterLimit = 10;
  direction: CanvasDirection = 'inherit';
  filter = 'none';
  imageSmoothingEnabled = true;
  imageSmoothingQuality: ImageSmoothingQuality = 'low';

  // Stub methods
  arc() {}
  beginPath() {}
  clearRect() {}
  clip() {}
  closePath() {}
  drawImage() {}
  ellipse() {}
  fill() {}
  fillRect() {}
  fillText() {}
  getImageData(_x: number, _y: number, _w: number, _h: number): ImageData {
    return { data: new Uint8ClampedArray(4), width: 1, height: 1 } as ImageData;
  }
  lineTo() {}
  measureText(_text: string): TextMetrics {
    return { width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 0, fontBoundingBoxAscent: 0, fontBoundingBoxDescent: 0, alphabeticBaseline: 0, emHeightAscent: 0, emHeightDescent: 0, hangingBaseline: 0, ideographicBaseline: 0 };
  }
  moveTo() {}
  putImageData() {}
  quadraticCurveTo() {}
  rect() {}
  restore() {}
  rotate() {}
  save() {}
  scale() {}
  setTransform() {}
  stroke() {}
  strokeRect() {}
  strokeText() {}
  transform() {}
  translate() {}
  createLinearGradient() { return { addColorStop() {} } as unknown as CanvasGradient; }
  createRadialGradient() { return { addColorStop() {} } as unknown as CanvasGradient; }
  createPattern() { return {} as CanvasPattern; }
  arcTo() {}
  bezierCurveTo() {}
  isPointInPath() { return false; }
  isPointInStroke() { return false; }
  resetTransform() {}
  roundRect() {}
  setLineDash() {}
  getLineDash() { return []; }
  getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } as unknown as DOMMatrix; }
  createImageData() { return { data: new Uint8ClampedArray(4), width: 1, height: 1 } as ImageData; }
}

// Patch Canvas getContext to return our mock
if (typeof HTMLCanvasElement !== 'undefined') {
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (
    contextId: string,
    _options?: any,
  ): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
    if (contextId === '2d') {
      return new MockCanvasRenderingContext2D() as unknown as CanvasRenderingContext2D;
    }
    return origGetContext?.call(this, contextId, _options) ?? null;
  };
}

// ── Audio mock ──────────────────────────────────────────────────────
if (typeof globalThis.Audio === 'undefined') {
  (globalThis as any).Audio = class MockAudio {
    src = '';
    volume = 1;
    loop = false;
    currentTime = 0;
    paused = true;
    play() { return Promise.resolve(); }
    pause() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

// ── requestAnimationFrame mock ──────────────────────────────────────
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback): number => {
    return setTimeout(() => cb(performance.now()), 0) as unknown as number;
  };
  (globalThis as any).cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}

// ── matchMedia mock ─────────────────────────────────────────────────
if (typeof globalThis.matchMedia === 'undefined') {
  (globalThis as any).matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
