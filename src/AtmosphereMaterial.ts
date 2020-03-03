import { BackSide, ShaderMaterial } from "three";
import {
    fragmentShader,
    getUniforms,
    IAtmosphereMaterialOptions,
    vertexShader,
} from "./shaderchunks/atmosphere";

const defines = {
    PI: "3.14159265359",
};

export class AtmosphereMaterial extends ShaderMaterial {
    constructor(options: IAtmosphereMaterialOptions) {
        super({ vertexShader, fragmentShader, uniforms: getUniforms(options), defines });
        this.side = BackSide;
        this.transparent = true;

        // tslint:disable: no-string-literal
        this.defines["INNER_RADIUS"] = options.planetRadius.toFixed(1);
        this.defines["OUTER_RADIUS"] = (options.planetRadius * 1.015).toFixed(1);
    }
}
