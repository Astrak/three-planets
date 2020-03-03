import * as dat from "dat.gui";
import {
    Color,
    DirectionalLight,
    LinearFilter,
    PerspectiveCamera,
    RepeatWrapping,
    Scene,
    TextureLoader,
    WebGLRenderer,
} from "three";
import { Lensflare } from "./Lensflare";
import { OrbitControls, Planet } from "./src";

let needsRender = true;
const tLoader = new TextureLoader();
const scale = 5;

const sun = new DirectionalLight(0xffffff, 15);
sun.position.set(5 * scale, 0, 0);

const earth = new Planet({
    albedoMap: tLoader.load("textures/earth/land2_8192.png", filterLinear),
    atmosphereAltitudeOfAverageDensity: 0.45,
    bumpMap: tLoader.load("textures/earth/bump.jpg", filterLinear),
    cityMap: tLoader.load("textures/earth/city3.jpg", repeatWrapping),
    cityMask: tLoader.load("textures/earth/cities_4096.jpg", repeatWrapping),
    cloudMap: tLoader.load("textures/earth/clouds.jpg", filterLinear),
    cloudsCastShadows: true,
    emissiveMap: tLoader.load("textures/earth/ground4096.jpg", filterLinear),
    heightSegments: 150,
    planetRadius: scale,
    specularMap: tLoader.load("textures/earth/specular.png", filterLinear),
    suburbsMask: tLoader.load("textures/earth/suburbs512-2.jpg", repeatWrapping),
    sun,
    widthSegments: 150,
});

let renderer: THREE.WebGLRenderer;
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let controls: OrbitControls;

const params = {
    averageDensityAltitude: 0.25,
    scale: 1,
    shininess: 30,
    wavelength1: 0.65,
    wavelength2: 0.57,
    wavelength3: 0.475,
};

setScene();
animate();

scene!.add(earth, sun);

function setScene() {
    scene = new Scene();

    renderer = new WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x00000);
    renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(renderer.domElement);

    camera = new PerspectiveCamera(70, innerWidth / innerHeight, 0.001 * scale, 50 * scale);
    camera.position.z = scale * 2;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener("change", () => (needsRender = true));
    controls.enableDamping = true;
    controls.enableRotate = true;
    controls.panSpeed = 0.04;
    controls.panDampingFactor = 0.04;
    controls.rotateSpeed = 0.005;
    controls.rotateDampingFactor = 0.04;
    controls.zoomSpeed = 0.04;
    controls.zoomDampingFactor = 0.04;

    window.addEventListener(
        "resize",
        () => {
            camera.aspect = innerWidth / innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(innerWidth, innerHeight);
            needsRender = true;
        },
        false
    );

    setGUI();

    animate();

    lensEffect();
}

function setGUI() {
    const gui = new dat.GUI();

    gui.add(renderer, "toneMappingExposure", 0, 40).onChange(() => (needsRender = true));

    const sunFolder = gui.addFolder("sun");
    sunFolder.add(sun, "intensity", 0, 100).onChange(() => (needsRender = true));

    const atmFolder = gui.addFolder("atmosphere");
    atmFolder
        .add(earth, "atmosphereAltitudeOfAverageDensity", 0, 1)
        .onChange(() => (needsRender = true));
    atmFolder.add(earth, "atmosphereKm", 0.0001, 0.03, 0.0001).onChange(() => (needsRender = true));
    atmFolder.add(earth, "atmosphereKr", 0.0001, 0.03, 0.0001).onChange(() => (needsRender = true));
    atmFolder.add(earth, "atmosphereG", -1, 1, 0.001).onChange(() => (needsRender = true));
    atmFolder.add(params, "wavelength1", 0.4, 0.8, 0.001).onChange(() => {
        earth.wavelengths[0] = params.wavelength1;
        needsRender = true;
    });
    atmFolder.add(params, "wavelength2", 0.4, 0.8, 0.001).onChange(() => {
        earth.wavelengths[1] = params.wavelength2;
        needsRender = true;
    });
    atmFolder.add(params, "wavelength3", 0.4, 0.8, 0.001).onChange(() => {
        earth.wavelengths[2] = params.wavelength3;
        needsRender = true;
    });

    const litHemi = gui.addFolder("lit hemisphere");
    litHemi.add(earth, "shininess", 0, 200).onChange(() => (needsRender = true));
    litHemi
        .add(earth, "cloudAltitude", 0, 0.001 * scale, 0.0001 * scale)
        .onChange(() => (needsRender = true));
    litHemi.add(earth, "maxGroundAltitude", 0, 10, 0.1).onChange(() => (needsRender = true));

    const night = gui.addFolder("night hemisphere");
    night.add(earth, "nightContrast", 1, 3).onChange(() => (needsRender = true));
    night.add(earth, "cityScale", 1, 400).onChange(() => (needsRender = true));
    night.add(earth, "suburbsScale", 1, 400).onChange(() => (needsRender = true));
}

function repeatWrapping(texture: THREE.Texture) {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    needsRender = true;
}

function filterLinear(texture: THREE.Texture) {
    texture.minFilter = LinearFilter;
    needsRender = true;
}

function lensEffect() {
    const textureFlare1 = tLoader.load(
        "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/lensflare/lensflare0.png",
        t => (needsRender = true)
    );
    const textureFlare2 = tLoader.load(
        "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/lensflare/lensflare2.png",
        t => (needsRender = true)
    );
    const textureFlare3 = tLoader.load(
        "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/lensflare/lensflare3.png",
        t => (needsRender = true)
    );
    const color = new Color();
    const lensflare = new Lensflare();
    lensflare.addFlare({ texture: textureFlare1, size: 1000, distance: 0.0, color });
    lensflare.addFlare({ texture: textureFlare2, size: 6000, distance: 0.0 });
    lensflare.addFlare({ texture: textureFlare3, size: 100, distance: 0.2 });
    lensflare.addFlare({ texture: textureFlare3, size: 300, distance: 0.3 });
    lensflare.addFlare({ texture: textureFlare3, size: 70, distance: 0.5 });
    lensflare.addFlare({ texture: textureFlare3, size: 180, distance: 0.9 });
    lensflare.addFlare({ texture: textureFlare3, size: 70, distance: 1.0 });
    sun.add(lensflare);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (needsRender) {
        renderer.render(scene, camera);
        needsRender = false;
    }
}
