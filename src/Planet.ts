import {
    Color,
    Light,
    Mesh,
    ShaderMaterial,
    SphereBufferGeometry,
    Texture,
    Vector3,
} from "three";
import { AtmosphereMaterial } from "./AtmosphereMaterial";
import { PlanetMaterial } from "./PlanetMaterial";

const ATMOSPHERE_RADIUS = 1.015;

const DEFAULT_KM = 0.001;
const DEFAULT_KR = 0.0025;
const DEFAULT_ATMOSPHERE_G = -0.84;
const DEFAULT_CITIES_SCALE = 200;
const DEFAULT_CLOUD_ALTITUDE = 1.0005;
const DEFAULT_HEIGHT_SEGMENTS = 150;
const DEFAULT_MAX_GROUND_ALTITUDE = 0.001;
const DEFAULT_NIGHT_CONTRAST = 1;
const DEFAULT_SHININESS = 125;
const DEFAULT_SUBURBS_SCALE = 80;
const DEFAULT_WAVELENGTHS: [number, number, number] = [0.65, 0.57, 0.475];
const DEFAULT_WIDTH_SEGMENTS = 150;

export interface PlanetOptions {
    albedoMap: Texture;
    atmosphereG?: number;
    atmosphereKm?: number;
    atmosphereKr?: number;
    atmosphereAltitudeOfAverageDensity: number;
    bumpMap?: Texture;
    cityMap: Texture;
    cityMask: Texture;
    cityScale?: number;
    citiesColor?: Color | string | number;
    cloudAltitude?: number;
    cloudMap: Texture;
    cloudsCastShadows: boolean;
    color?: Color | string | number;
    emissive?: Color | string | number;
    emissiveMap: Texture;
    heightSegments?: number;
    /**
     * Used to scale the bump map. Use scene units.
     */
    maxGroundAltitude?: number;
    nightContrast?: number;
    planetRadius: number;
    /**
     * Defines the specular power of the planet. Defaults to `125`.
     */
    shininess?: number;
    specularMap: Texture;
    suburbsMask: Texture;
    /**
     * If a texture is defined in `suburbsMask`, this scales it. The higher the number, the more
     * repeated the texture is for the same surface, and the smaller the mask will get.
     */
    suburbsScale?: number;
    sun: Light;
    widthSegments?: number;
    wavelengths?: [number, number, number];
}

interface IPlanet {
    atmosphere: Mesh;
    atmosphereAltitudeOfAverageDensity: number;
    atmosphereG: number;
    atmosphereKm: number;
    atmosphereKr: number;
    cityScale: number;
    citiesColor: Color;
    cloudAltitude: number;
    cloudsCastShadows: boolean;
    color: Color;
    emissive: Color;
    maxGroundAltitude: number;
    nightContrast: number;
    shininess: number;
    suburbsScale: number;
    sun: Light;
    wavelengths: [number, number, number];
}

/**
 * The `Planet` class is a mesh that is the actual planet mesh. The atmosphere
 * is created internally and handled as a child mesh of this class.
 */
export class Planet extends Mesh implements IPlanet {
    atmosphere: Mesh;
    atmosphereAltitudeOfAverageDensity: number;
    atmosphereG: number;
    atmosphereKm: number;
    atmosphereKr: number;
    cityScale: number;
    citiesColor: Color;
    cloudAltitude: number;
    cloudsCastShadows: boolean;
    color: Color;
    emissive: Color;
    maxGroundAltitude: number;
    nightContrast: number;
    shininess: number;
    suburbsScale: number;
    sun: Light;
    wavelengths: [number, number, number];

    constructor(options: PlanetOptions) {
        super(
            new SphereBufferGeometry(
                options.planetRadius,
                options.widthSegments !== undefined
                    ? options.widthSegments
                    : DEFAULT_WIDTH_SEGMENTS,
                options.heightSegments !== undefined
                    ? options.heightSegments
                    : DEFAULT_HEIGHT_SEGMENTS
            ),
            new PlanetMaterial(options)
        );

        (this.geometry as SphereBufferGeometry).deleteAttribute("normal");

        this.atmosphereAltitudeOfAverageDensity =
            options.atmosphereAltitudeOfAverageDensity;
        this.atmosphereG =
            options.atmosphereG !== undefined
                ? options.atmosphereG
                : DEFAULT_ATMOSPHERE_G;
        this.atmosphereKr =
            options.atmosphereKr !== undefined
                ? options.atmosphereKr
                : DEFAULT_KR;
        this.atmosphereKm =
            options.atmosphereKm !== undefined
                ? options.atmosphereKm
                : DEFAULT_KM;
        this.citiesColor = new Color(
            options.citiesColor !== undefined ? options.citiesColor : 0xffa54c
        );
        this.cityScale =
            options.cityScale !== undefined
                ? options.cityScale
                : DEFAULT_CITIES_SCALE;
        this.cloudAltitude =
            (options.cloudAltitude !== undefined
                ? options.cloudAltitude
                : DEFAULT_CLOUD_ALTITUDE * options.planetRadius) -
            options.planetRadius;
        this.cloudsCastShadows = options.cloudsCastShadows;
        this.color = new Color(
            options.color !== undefined ? options.color : 0xffffff
        );
        this.emissive = new Color(
            options.emissive !== undefined ? options.emissive : 0xffffff
        );
        this.maxGroundAltitude =
            options.maxGroundAltitude !== undefined
                ? options.maxGroundAltitude
                : DEFAULT_MAX_GROUND_ALTITUDE;
        this.nightContrast =
            options.nightContrast !== undefined
                ? options.nightContrast
                : DEFAULT_NIGHT_CONTRAST;
        this.shininess =
            options.shininess !== undefined
                ? options.shininess
                : DEFAULT_SHININESS;
        this.suburbsScale =
            options.suburbsScale !== undefined
                ? options.suburbsScale
                : DEFAULT_SUBURBS_SCALE;
        this.sun = options.sun;
        this.wavelengths =
            options.wavelengths !== undefined
                ? options.wavelengths
                : DEFAULT_WAVELENGTHS;

        this.atmosphere = new Mesh(
            new SphereBufferGeometry(
                options.planetRadius * ATMOSPHERE_RADIUS,
                options.widthSegments !== undefined
                    ? options.widthSegments
                    : DEFAULT_WIDTH_SEGMENTS,
                options.heightSegments !== undefined
                    ? options.heightSegments
                    : DEFAULT_HEIGHT_SEGMENTS
            ),
            new AtmosphereMaterial({
                atmosphereRadius: options.planetRadius * ATMOSPHERE_RADIUS,
                planetRadius: options.planetRadius,
            })
        );
        (this.atmosphere.geometry as SphereBufferGeometry).deleteAttribute(
            "normal"
        );
        (this.atmosphere.geometry as SphereBufferGeometry).deleteAttribute(
            "uv"
        );
        this.atmosphere.matrixAutoUpdate = false;
        this.add(this.atmosphere);

        const surfaceMaterial = this.material as ShaderMaterial;

        surfaceMaterial.uniforms.albedoMap.value = options.albedoMap;
        surfaceMaterial.uniforms.emissiveMap.value = options.emissiveMap;
        surfaceMaterial.uniforms.specularMap.value = options.specularMap;
        surfaceMaterial.uniforms.cloudMap.value = options.cloudMap;
        surfaceMaterial.uniforms.cityMap.value = options.cityMap;
        surfaceMaterial.uniforms.cityMask.value = options.cityMask;
        surfaceMaterial.uniforms.suburbsMask.value = options.suburbsMask;
        surfaceMaterial.uniforms.bumpMap.value = options.bumpMap;

        this.onBeforeRender = (renderer, scene, camera) => {
            const atmosphereMaterial = this.atmosphere
                .material as ShaderMaterial;

            // Sun.
            surfaceMaterial.uniforms.sunDirection.value
                .copy(this.sun.position)
                .sub(this.position)
                .normalize();
            atmosphereMaterial.uniforms.sunDirection.value.copy(
                surfaceMaterial.uniforms.sunDirection.value
            );
            surfaceMaterial.uniforms.sunIntensity.value = this.sun.intensity;
            atmosphereMaterial.uniforms.sunIntensity.value = this.sun.intensity;

            // Camera.
            atmosphereMaterial.uniforms.eyeHeight.value = this.position
                .clone()
                .sub(camera.position)
                .length();
            surfaceMaterial.uniforms.eyeHeight.value =
                atmosphereMaterial.uniforms.eyeHeight.value;

            // Uniforms.
            surfaceMaterial.uniforms.citiesColor.value = this.citiesColor;
            surfaceMaterial.uniforms.cityScale.value = this.cityScale;
            surfaceMaterial.uniforms.cloudAltitude.value = this.cloudAltitude;
            surfaceMaterial.uniforms.emissive.value = this.emissive;
            surfaceMaterial.uniforms.Kr.value = this.atmosphereKr;
            atmosphereMaterial.uniforms.Kr.value = this.atmosphereKr;
            surfaceMaterial.uniforms.Km.value = this.atmosphereKm;
            atmosphereMaterial.uniforms.Km.value = this.atmosphereKm;
            surfaceMaterial.uniforms.maxGroundAltitude.value = this.maxGroundAltitude;
            surfaceMaterial.uniforms.nightContrast.value = this.nightContrast;
            surfaceMaterial.uniforms.shininess.value = this.shininess;
            surfaceMaterial.uniforms.suburbsScale.value = this.suburbsScale;

            atmosphereMaterial.uniforms.g.value = this.atmosphereG;

            // tslint:disable-next-line:max-line-length
            atmosphereMaterial.uniforms.averageDensityAltitude.value = this.atmosphereAltitudeOfAverageDensity;

            surfaceMaterial.uniforms.invWavelengths.value.copy(
                (atmosphereMaterial.uniforms.invWavelengths
                    .value as Vector3).set(
                    1 / Math.pow(this.wavelengths[0], 4),
                    1 / Math.pow(this.wavelengths[1], 4),
                    1 / Math.pow(this.wavelengths[2], 4)
                )
            );

            surfaceMaterial.uniforms.modelMatrixInverse.value.getInverse(
                this.matrixWorld
            );
        };
    }
}
