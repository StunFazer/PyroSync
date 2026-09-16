import * as THREE from 'three';
import { ParticleEngineConfig, AspectRatioType } from '../../types';

// -------------------------------------------------------------
// Brightness Extraction Shader (Isolates luminous cores for bloom)
// -------------------------------------------------------------
export const BRIGHT_PASS_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const BRIGHT_PASS_FRAGMENT = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uThreshold;
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(tDiffuse, vUv);
    float luma = dot(tex.rgb, vec3(0.2126, 0.7152, 0.0722));
    if (luma > uThreshold) {
      gl_FragColor = vec4(tex.rgb * (luma - uThreshold) / max(0.001, luma), tex.a);
    } else {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
  }
`;

// -------------------------------------------------------------
// Separable Gaussian Blur Shader (Horizontal & Vertical passes)
// -------------------------------------------------------------
export const GAUSSIAN_BLUR_FRAGMENT = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uDirection; // (1.0/width, 0.0) or (0.0, 1.0/height)
  varying vec2 vUv;

  void main() {
    vec4 sum = vec4(0.0);
    vec2 dir = uDirection * 1.8;

    // 9-tap Gaussian kernel weights
    sum += texture2D(tDiffuse, vUv - dir * 4.0) * 0.0162162162;
    sum += texture2D(tDiffuse, vUv - dir * 3.0) * 0.0540540541;
    sum += texture2D(tDiffuse, vUv - dir * 2.0) * 0.1216216216;
    sum += texture2D(tDiffuse, vUv - dir * 1.0) * 0.1945945946;
    sum += texture2D(tDiffuse, vUv)             * 0.2270270270;
    sum += texture2D(tDiffuse, vUv + dir * 1.0) * 0.1945945946;
    sum += texture2D(tDiffuse, vUv + dir * 2.0) * 0.1216216216;
    sum += texture2D(tDiffuse, vUv + dir * 3.0) * 0.0540540541;
    sum += texture2D(tDiffuse, vUv + dir * 4.0) * 0.0162162162;

    gl_FragColor = sum;
  }
`;

// -------------------------------------------------------------
// Projector Calibration Composite Shader:
// 1. Additive Bloom blending
// 2. Brightness / Gain multiplier
// 3. Pitch-Black #000000 clamp (eliminates projector backlight wash)
// 4. Aspect ratio scissoring & alignment guide crosshairs
// -------------------------------------------------------------
export const CALIBRATION_COMPOSITE_FRAGMENT = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform float uGain;
  uniform float uBlackClamp;
  uniform float uBloomIntensity;
  uniform vec4  uAspectScissor; // (minU, minV, maxU, maxV)
  uniform float uShowGuides;
  varying vec2 vUv;

  void main() {
    // 1. Aspect Ratio Scissor Check: outside bounds are strictly #000000
    if (vUv.x < uAspectScissor.x || vUv.x > uAspectScissor.z ||
        vUv.y < uAspectScissor.y || vUv.y > uAspectScissor.w) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    vec4 sceneColor = texture2D(tScene, vUv);
    vec4 bloomColor = texture2D(tBloom, vUv);

    // 2. Additive HDR Bloom Composition
    vec3 color = sceneColor.rgb + bloomColor.rgb * uBloomIntensity;

    // 3. Master Brightness / Gain multiplier
    color *= uGain;

    // 4. Perceptual Luminance calculation (ITU-R BT.709)
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));

    // 5. Strict Black-Level Cutoff Clamp:
    // If luminance falls below uBlackClamp, force absolute 0.0 (pitch black)
    // Above uBlackClamp, apply smooth remapping curve to eliminate projector gray fog
    if (luma < uBlackClamp) {
      color = vec3(0.0);
    } else {
      float remapped = (luma - uBlackClamp) / max(0.0001, (1.0 - uBlackClamp));
      color = color * (remapped / max(0.0001, luma));
    }

    // 6. Optional Projector Calibration Alignment Guides (crosshairs & border)
    if (uShowGuides > 0.5) {
      vec2 center = (uAspectScissor.xy + uAspectScissor.zw) * 0.5;
      vec2 dFromCenter = abs(vUv - center);
      vec2 dFromBorder = min(abs(vUv - uAspectScissor.xy), abs(vUv - uAspectScissor.zw));

      // 1px border line
      if (dFromBorder.x < 0.002 || dFromBorder.y < 0.002) {
        color = max(color, vec3(0.0, 0.8, 1.0)); // Cyan border
      }
      // Center crosshairs
      if ((dFromCenter.x < 0.001 && dFromCenter.y < 0.05) ||
          (dFromCenter.y < 0.001 && dFromCenter.x < 0.05)) {
        color = max(color, vec3(1.0, 0.8, 0.0)); // Amber center mark
      }
    }

    gl_FragColor = vec4(min(vec3(1.0), color), 1.0);
  }
`;

export function calculateAspectScissor(
  aspectRatio: AspectRatioType,
  screenWidth: number,
  screenHeight: number
): [number, number, number, number] {
  if (aspectRatio === 'off' || screenWidth <= 0 || screenHeight <= 0) {
    return [0.0, 0.0, 1.0, 1.0];
  }

  const screenAspect = screenWidth / screenHeight;
  let targetAspect = 16.0 / 9.0;

  if (aspectRatio === '16:9') targetAspect = 16.0 / 9.0;
  else if (aspectRatio === '16:10') targetAspect = 16.0 / 10.0;
  else if (aspectRatio === '4:3') targetAspect = 4.0 / 3.0;
  else if (aspectRatio === '21:9') targetAspect = 21.0 / 9.0;

  if (screenAspect > targetAspect) {
    // Screen is wider than target: pillarbox (black bars on left & right)
    const activeWidthFraction = targetAspect / screenAspect;
    const minU = (1.0 - activeWidthFraction) * 0.5;
    const maxU = 1.0 - minU;
    return [minU, 0.0, maxU, 1.0];
  } else {
    // Screen is taller than target: letterbox (black bars on top & bottom)
    const activeHeightFraction = screenAspect / targetAspect;
    const minV = (1.0 - activeHeightFraction) * 0.5;
    const maxV = 1.0 - minV;
    return [0.0, minV, 1.0, maxV];
  }
}

export class ProjectorPipeline {
  private width: number = 1;
  private height: number = 1;

  // Render targets
  private sceneTarget: THREE.WebGLRenderTarget;
  private brightTarget: THREE.WebGLRenderTarget;
  private blurTargetH: THREE.WebGLRenderTarget;
  private blurTargetV: THREE.WebGLRenderTarget;

  // Post-processing materials
  private brightMaterial: THREE.ShaderMaterial;
  private blurMaterialH: THREE.ShaderMaterial;
  private blurMaterialV: THREE.ShaderMaterial;
  private compositeMaterial: THREE.ShaderMaterial;

  // Fullscreen quad
  private quadCamera: THREE.OrthographicCamera;
  private quadScene: THREE.Scene;
  private quadMesh: THREE.Mesh;

  constructor(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);

    const rtParams: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      stencilBuffer: false,
      depthBuffer: true,
    };

    const halfW = Math.max(1, Math.floor(this.width / 2));
    const halfH = Math.max(1, Math.floor(this.height / 2));

    this.sceneTarget = new THREE.WebGLRenderTarget(this.width, this.height, rtParams);
    this.brightTarget = new THREE.WebGLRenderTarget(halfW, halfH, rtParams);
    this.blurTargetH = new THREE.WebGLRenderTarget(halfW, halfH, rtParams);
    this.blurTargetV = new THREE.WebGLRenderTarget(halfW, halfH, rtParams);

    // Fullscreen quad setup
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadScene = new THREE.Scene();

    const quadGeo = new THREE.PlaneGeometry(2, 2);

    // 1. Bright Pass
    this.brightMaterial = new THREE.ShaderMaterial({
      vertexShader: BRIGHT_PASS_VERTEX,
      fragmentShader: BRIGHT_PASS_FRAGMENT,
      uniforms: {
        tDiffuse: { value: null },
        uThreshold: { value: 0.42 },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 2. Horizontal Blur
    this.blurMaterialH = new THREE.ShaderMaterial({
      vertexShader: BRIGHT_PASS_VERTEX,
      fragmentShader: GAUSSIAN_BLUR_FRAGMENT,
      uniforms: {
        tDiffuse: { value: null },
        uDirection: { value: new THREE.Vector2(1.0 / halfW, 0.0) },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 3. Vertical Blur
    this.blurMaterialV = new THREE.ShaderMaterial({
      vertexShader: BRIGHT_PASS_VERTEX,
      fragmentShader: GAUSSIAN_BLUR_FRAGMENT,
      uniforms: {
        tDiffuse: { value: null },
        uDirection: { value: new THREE.Vector2(0.0, 1.0 / halfH) },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 4. Calibration Composite
    this.compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: BRIGHT_PASS_VERTEX,
      fragmentShader: CALIBRATION_COMPOSITE_FRAGMENT,
      uniforms: {
        tScene: { value: null },
        tBloom: { value: null },
        uGain: { value: 1.0 },
        uBlackClamp: { value: 0.02 },
        uBloomIntensity: { value: 0.25 },
        uAspectScissor: { value: new THREE.Vector4(0, 0, 1, 1) },
        uShowGuides: { value: 0.0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.quadMesh = new THREE.Mesh(quadGeo, this.compositeMaterial);
    this.quadScene.add(this.quadMesh);
  }

  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0 || (width === this.width && height === this.height)) return;

    this.width = width;
    this.height = height;

    const halfW = Math.max(1, Math.floor(width / 2));
    const halfH = Math.max(1, Math.floor(height / 2));

    this.sceneTarget.setSize(width, height);
    this.brightTarget.setSize(halfW, halfH);
    this.blurTargetH.setSize(halfW, halfH);
    this.blurTargetV.setSize(halfW, halfH);

    this.blurMaterialH.uniforms.uDirection.value.set(1.0 / halfW, 0.0);
    this.blurMaterialV.uniforms.uDirection.value.set(0.0, 1.0 / halfH);
  }

  /**
   * Post-processing render pipeline:
   * 1. Render main scene to sceneTarget (FBO) with #000000 clear
   * 2. Extract bright luminous core stars to brightTarget
   * 3. 2-pass separable Gaussian blur (H -> V)
   * 4. Composite final calibrated image to display screen canvas with aspect clamp
   */
  public render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config: ParticleEngineConfig
  ): void {
    const scissor = calculateAspectScissor(config.aspectRatioMask || 'off', this.width, this.height);

    // Stage 1: Render particle scene into HDR render target with pitch-black clear
    renderer.setRenderTarget(this.sceneTarget);
    renderer.setClearColor(0x000000, 1.0);
    renderer.clear();
    renderer.render(scene, camera);

    // Stage 2: Bright pass extraction (half-res)
    this.quadMesh.material = this.brightMaterial;
    this.brightMaterial.uniforms.tDiffuse.value = this.sceneTarget.texture;
    this.brightMaterial.uniforms.uThreshold.value = 0.42;
    renderer.setRenderTarget(this.brightTarget);
    renderer.setClearColor(0x000000, 0.0);
    renderer.clear();
    renderer.render(this.quadScene, this.quadCamera);

    // Stage 3a: Blur pass horizontal
    this.quadMesh.material = this.blurMaterialH;
    this.blurMaterialH.uniforms.tDiffuse.value = this.brightTarget.texture;
    renderer.setRenderTarget(this.blurTargetH);
    renderer.clear();
    renderer.render(this.quadScene, this.quadCamera);

    // Stage 3b: Blur pass vertical
    this.quadMesh.material = this.blurMaterialV;
    this.blurMaterialV.uniforms.tDiffuse.value = this.blurTargetH.texture;
    renderer.setRenderTarget(this.blurTargetV);
    renderer.clear();
    renderer.render(this.quadScene, this.quadCamera);

    // Stage 4: Composite calibrated output onto screen canvas
    this.quadMesh.material = this.compositeMaterial;
    this.compositeMaterial.uniforms.tScene.value = this.sceneTarget.texture;
    this.compositeMaterial.uniforms.tBloom.value = this.blurTargetV.texture;
    this.compositeMaterial.uniforms.uGain.value = config.gain;
    this.compositeMaterial.uniforms.uBlackClamp.value = config.blackClamp;
    this.compositeMaterial.uniforms.uBloomIntensity.value = config.bloomIntensity;
    this.compositeMaterial.uniforms.uAspectScissor.value.set(scissor[0], scissor[1], scissor[2], scissor[3]);
    this.compositeMaterial.uniforms.uShowGuides.value = config.showGuides ? 1.0 : 0.0;

    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 1.0);
    renderer.clear();
    renderer.render(this.quadScene, this.quadCamera);
  }

  public dispose(): void {
    this.sceneTarget.dispose();
    this.brightTarget.dispose();
    this.blurTargetH.dispose();
    this.blurTargetV.dispose();

    this.brightMaterial.dispose();
    this.blurMaterialH.dispose();
    this.blurMaterialV.dispose();
    this.compositeMaterial.dispose();
  }
}
