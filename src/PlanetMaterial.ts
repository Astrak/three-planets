import { ShaderMaterial } from "three";
import {
    fragmentShader,
    getUniforms,
    IPlanetMaterialOptions,
    vertexShader,
} from "./shaderchunks/ground";

const defines = {
    PI: "3.14159265359",
};

export class PlanetMaterial extends ShaderMaterial {
    constructor(options: IPlanetMaterialOptions) {
        super({
            defines,
            fragmentShader,
            uniforms: getUniforms(options),
            vertexShader,
        });

        this.extensions.derivatives = true;

        // tslint:disable: no-string-literal
        this.defines["INNER_RADIUS"] = options.planetRadius.toFixed(5);
        this.defines["OUTER_RADIUS"] = (options.planetRadius * 1.015).toFixed(5);

        if (options.cloudsCastShadows) {
            this.defines["CLOUDS_CAST_SHADOWS"] = "";
        }

        if (options.bumpMap) {
            this.defines["USE_BUMPMAP"] = "";
        }

        this.transparent = true;
    }
}
