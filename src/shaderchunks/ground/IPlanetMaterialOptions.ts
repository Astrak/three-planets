import { Texture } from "three";

export interface IPlanetMaterialOptions {
    albedoMap: Texture;
    bumpMap?: Texture;
    cityMap: Texture;
    cityMask: Texture;
    cloudMap: Texture;
    cloudsCastShadows: boolean;
    emissiveMap: Texture;
    planetRadius: number;
    specularMap: Texture;
    suburbsMask: Texture;
}
