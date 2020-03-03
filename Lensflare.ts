import {
    AdditiveBlending,
    Box2,
    BufferGeometry,
    ClampToEdgeWrapping,
    Color,
    DataTexture,
    Fog,
    InterleavedBuffer,
    InterleavedBufferAttribute,
    Mesh,
    MeshBasicMaterial,
    NearestFilter,
    RawShaderMaterial,
    RGBFormat,
    Texture,
    Vector2,
    Vector3,
    Vector4,
} from "three";

const stupidFog = new Fog(0xffffff, 1000, 1000);

const SHADER = {
    fragmentShader: `precision highp float;

        uniform sampler2D map;
        uniform vec3 color;

        varying vec2 vUV;
        varying float vVisibility;

        void main() {

            vec4 texture = texture2D( map, vUV );
            texture.a *= vVisibility;
            gl_FragColor = texture;
            gl_FragColor.rgb *= color;

        }`,
    uniforms: {
        color: { value: null },
        map: { value: null },
        occlusionMap: { value: null },
        scale: { value: null },
        screenPosition: { value: null },
    },
    vertexShader: `precision highp float;

        uniform vec3 screenPosition;
        uniform vec2 scale;

        uniform sampler2D occlusionMap;

        attribute vec3 position;
        attribute vec2 uv;

        varying vec2 vUV;
        varying float vVisibility;

        void main() {

            vUV = uv;

            vec2 pos = position.xy;

            vec4 visibility = texture2D( occlusionMap, vec2( 0.1, 0.1 ) );
            visibility += texture2D( occlusionMap, vec2( 0.5, 0.1 ) );
            visibility += texture2D( occlusionMap, vec2( 0.9, 0.1 ) );
            visibility += texture2D( occlusionMap, vec2( 0.9, 0.5 ) );
            visibility += texture2D( occlusionMap, vec2( 0.9, 0.9 ) );
            visibility += texture2D( occlusionMap, vec2( 0.5, 0.9 ) );
            visibility += texture2D( occlusionMap, vec2( 0.1, 0.9 ) );
            visibility += texture2D( occlusionMap, vec2( 0.1, 0.5 ) );
            visibility += texture2D( occlusionMap, vec2( 0.5, 0.5 ) );

            vVisibility =        visibility.r / 9.0;
            vVisibility *= 1.0 - visibility.g / 9.0;
            vVisibility *=       visibility.b / 9.0;

            gl_Position = vec4( ( pos * scale + screenPosition.xy ).xy, screenPosition.z, 1.0 );

        }`,
};

/**
 * This version of the ThreeJS Lensflares is because the Lensflare file from ThreeJS is not typed
 * and as such, not accepted by the TS compiler.
 */
export class Lensflare extends Mesh {
    type = "Lensflare";
    frustumCulled = false;
    renderOrder = Infinity;
    flares: LensflareElement[] = [];
    isLensflare = true;
    material1a = getMaterial1a();
    material1b: RawShaderMaterial;
    material2: RawShaderMaterial;

    tempMap = new DataTexture(new Uint8Array(16 * 16 * 3), 16, 16, RGBFormat);
    occlusionMap = new DataTexture(
        new Uint8Array(16 * 16 * 3),
        16,
        16,
        RGBFormat
    );

    private size = new Vector2();
    private screenPositionPixels = new Vector2();
    private positionScreen = new Vector3();
    private positionView = new Vector3();
    private validArea = new Box2();
    private viewport = new Vector4();
    private mesh1: Mesh;
    private mesh2: Mesh;

    constructor() {
        super(
            getLensflareGeometry(),
            new MeshBasicMaterial({ opacity: 0, transparent: true })
        );

        this.material1b = getMaterial1b(this.tempMap);
        this.material2 = getMaterial2(this.occlusionMap);

        this.tempMap.minFilter = NearestFilter;
        this.tempMap.magFilter = NearestFilter;
        this.tempMap.wrapS = ClampToEdgeWrapping;
        this.tempMap.wrapT = ClampToEdgeWrapping;
        this.tempMap.needsUpdate = true;

        this.occlusionMap.minFilter = NearestFilter;
        this.occlusionMap.magFilter = NearestFilter;
        this.occlusionMap.wrapS = ClampToEdgeWrapping;
        this.occlusionMap.wrapT = ClampToEdgeWrapping;
        this.occlusionMap.needsUpdate = true;

        this.mesh1 = new Mesh(this.geometry, this.material1a);
        this.mesh2 = new Mesh(this.geometry, this.material2);

        this.onBeforeRender = (renderer, scene, camera) => {
            renderer.getCurrentViewport(this.viewport);

            const invAspect = this.viewport.w / this.viewport.z;
            const halfViewportWidth = this.viewport.z / 2.0;
            const halfViewportHeight = this.viewport.w / 2.0;

            const size = 16 / this.viewport.w;
            this.size.set(size * invAspect, size);

            this.validArea.min.set(this.viewport.x, this.viewport.y);
            this.validArea.max.set(
                this.viewport.x + (this.viewport.z - 16),
                this.viewport.y + (this.viewport.w - 16)
            );

            // calculate position in screen space

            this.positionView.setFromMatrixPosition(this.matrixWorld);
            this.positionView.applyMatrix4(camera.matrixWorldInverse);

            if (this.positionView.z > 0) {
                return;
            } // lensflare is behind the camera

            this.positionScreen
                .copy(this.positionView)
                .applyMatrix4(camera.projectionMatrix);

            // horizontal and vertical coordinate of the lower left corner of the pixels to copy

            this.screenPositionPixels.x =
                this.viewport.x +
                this.positionScreen.x * halfViewportWidth +
                halfViewportWidth -
                8;
            this.screenPositionPixels.y =
                this.viewport.y +
                this.positionScreen.y * halfViewportHeight +
                halfViewportHeight -
                8;

            // screen cull

            if (this.validArea.containsPoint(this.screenPositionPixels)) {
                // save current RGB to temp texture

                (renderer as any).copyFramebufferToTexture(
                    this.screenPositionPixels,
                    this.tempMap
                );

                // render pink quad

                // tslint:disable:no-string-literal
                const uniforms1a = this.material1a.uniforms;
                uniforms1a["scale"].value = this.size;
                uniforms1a["screenPosition"].value = this.positionScreen;

                renderer.renderBufferDirect(
                    camera,
                    scene,
                    this.geometry,
                    this.material1a,
                    this.mesh1,
                    null
                );

                // copy result to occlusionMap

                (renderer as any).copyFramebufferToTexture(
                    this.screenPositionPixels,
                    this.occlusionMap
                );

                // restore graphics

                const uniforms1b = this.material1b.uniforms;
                uniforms1b["scale"].value = this.size;
                uniforms1b["screenPosition"].value = this.positionScreen;

                renderer.renderBufferDirect(
                    camera,
                    scene,
                    this.geometry,
                    this.material1b,
                    this.mesh1,
                    null
                );

                // render elements

                const vecX = -this.positionScreen.x * 2;
                const vecY = -this.positionScreen.y * 2;

                this.flares.forEach(flare => {
                    const uniforms2 = this.material2.uniforms;

                    uniforms2["color"].value.copy(flare.color);
                    uniforms2["map"].value = flare.texture;
                    uniforms2["screenPosition"].value.x =
                        this.positionScreen.x + vecX * flare.distance;
                    uniforms2["screenPosition"].value.y =
                        this.positionScreen.y + vecY * flare.distance;

                    const bigness = flare.size / this.viewport.w;
                    const invAspect2 = this.viewport.w / this.viewport.z;

                    uniforms2["scale"].value.set(bigness * invAspect2, bigness);
                    // tslint:enable:no-string-literal

                    (this.material2 as any).uniformsNeedUpdate = true;

                    renderer.renderBufferDirect(
                        camera,
                        scene,
                        this.geometry,
                        this.material2,
                        this.mesh2,
                        null
                    );
                });
            }
        };
    }

    addFlare(flare: LensflareElement) {
        flare.color = new Color(flare.color);
        this.flares.push(flare);
    }

    dispose() {
        this.material1a.dispose();
        this.material1b.dispose();
        this.material2.dispose();

        this.tempMap.dispose();
        this.occlusionMap.dispose();

        this.flares.forEach(flare => flare.texture.dispose());
    }
}

export interface LensflareElement {
    texture: Texture;
    size: number;
    distance: number;
    color?: Color | number | string;
}

function getLensflareGeometry() {
    const geometry = new BufferGeometry();

    const float32Array = new Float32Array([
        -1,
        -1,
        0,
        0,
        0,
        1,
        -1,
        0,
        1,
        0,
        1,
        1,
        0,
        1,
        1,
        -1,
        1,
        0,
        0,
        1,
    ]);

    const interleavedBuffer = new InterleavedBuffer(float32Array, 5);

    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.setAttribute(
        "position",
        new InterleavedBufferAttribute(interleavedBuffer, 3, 0, false)
    );
    geometry.setAttribute(
        "uv",
        new InterleavedBufferAttribute(interleavedBuffer, 2, 3, false)
    );

    return geometry;
}

function getMaterial1a(): RawShaderMaterial {
    return new RawShaderMaterial({
        depthTest: true,
        depthWrite: false,
        fragmentShader: `precision highp float;

            void main() {

                gl_FragColor = vec4( 1.0, 0.0, 1.0, 1.0 );

            }`,
        transparent: false,
        uniforms: {
            scale: { value: null },
            screenPosition: { value: null },
        },
        vertexShader: `precision highp float;

            uniform vec3 screenPosition;
            uniform vec2 scale;

            attribute vec3 position;

            void main() {

            gl_Position = vec4( position.xy * scale + screenPosition.xy, screenPosition.z, 1.0 );

            }`,
    });
}

function getMaterial1b(tempMap: DataTexture): RawShaderMaterial {
    return new RawShaderMaterial({
        depthTest: false,
        depthWrite: false,
        fragmentShader: `precision highp float;

            uniform sampler2D map;

            varying vec2 vUV;

            void main() {

                gl_FragColor = texture2D( map, vUV );

            }`,
        transparent: false,
        uniforms: {
            map: { value: tempMap },
            scale: { value: null },
            screenPosition: { value: null },
        },
        vertexShader: `precision highp float;

            uniform vec3 screenPosition;
            uniform vec2 scale;

            attribute vec3 position;
            attribute vec2 uv;

            varying vec2 vUV;

            void main() {

            vUV = uv;

            gl_Position = vec4( position.xy * scale + screenPosition.xy, screenPosition.z, 1.0 );

            }`,
    });
}

function getMaterial2(occlusionMap: Texture) {
    return new RawShaderMaterial({
        blending: AdditiveBlending,
        depthWrite: false,
        fragmentShader: SHADER.fragmentShader,
        transparent: true,
        uniforms: {
            color: { value: new Color(0xff0000) },
            map: { value: null },
            occlusionMap: { value: occlusionMap },
            scale: { value: new Vector2() },
            screenPosition: { value: new Vector3() },
        },
        vertexShader: SHADER.vertexShader,
    });
}
