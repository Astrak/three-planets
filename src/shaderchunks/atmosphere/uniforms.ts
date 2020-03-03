import { UniformsUtils, Vector3 } from "three";
import { IAtmosphereMaterialOptions } from "./IAtmosphereMaterialOptions";

export const getUniforms = (options: IAtmosphereMaterialOptions) =>
    UniformsUtils.merge([
        {
            Km: { value: 0 },
            Kr: { value: 0 },
            averageDensityAltitude: { value: 0 },
            eyeHeight: { value: 0 },
            g: { value: 0 },
            invWavelengths: {
                value: new Vector3(),
            },
            sunDirection: { value: new Vector3() },
            sunIntensity: { value: 0 },
        },
    ]);
