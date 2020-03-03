import { Color, Matrix4, UniformsUtils, Vector3 } from "three";
import { IPlanetMaterialOptions } from "./IPlanetMaterialOptions";

export const getUniforms = (options: IPlanetMaterialOptions) =>
    UniformsUtils.merge([
        {
            Km: { value: 0 },
            Kr: { value: 0 },
            albedoMap: { value: options.albedoMap },
            bumpMap: { value: options.bumpMap },
            citiesColor: { value: new Color() },
            cityMap: { value: options.cityMap },
            cityMask: { value: options.cityMask },
            cityScale: { value: 0 },
            cloudAltitude: { value: 0 },
            cloudMap: { value: options.cloudMap },
            color: { value: new Color() },
            emissive: { value: new Color() },
            emissiveMap: { value: options.emissiveMap },
            emissiveMapIntensity: { value: 1.0 },
            eyeHeight: { value: 0 },
            invWavelengths: {
                value: new Vector3(),
            },
            maxGroundAltitude: { value: 0 },
            modelMatrixInverse: { value: new Matrix4() },
            nightContrast: { value: 0 },
            shininess: { value: 0 },
            specularMap: { value: options.specularMap },
            suburbsMask: { value: options.cityMask },
            suburbsScale: { value: 0 },
            sunDirection: { value: new Vector3(1, 0, 0) },
            sunIntensity: { value: 0 },
        },
    ]);
