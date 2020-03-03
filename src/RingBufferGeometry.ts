import { BufferGeometry, Float32BufferAttribute } from "three";

/**
 * A ring BufferGeometry with better UVs.
 */
export class RingBufferGeometry extends BufferGeometry {
    parameters: {
        innerRadius: number;
        outerRadius: number;
        thetaSegments: number;
    };

    type = "RingBufferGeometry";

    constructor(
        innerRadius: number,
        outerRadius: number,
        thetaSegments: number = 400
    ) {
        super();

        this.parameters = {
            innerRadius,
            outerRadius,
            thetaSegments: Math.max(3, thetaSegments),
        };

        const pos = [];
        const uv = [];
        const index = [];
        const normal = [];

        const angle = (Math.PI * 2) / this.parameters.thetaSegments;

        pos[0] = Math.cos(0) * outerRadius;
        pos[1] = Math.sin(0) * outerRadius;
        pos[3] = Math.cos(0) * innerRadius;
        pos[4] = Math.sin(0) * innerRadius;
        pos[2] = pos[5] = 0;

        uv[0] = 1;
        uv[1] = 0;
        uv[2] = 0;
        uv[3] = 0;

        normal[0] = normal[1] = normal[3] = normal[4] = 0;
        normal[2] = normal[5] = 1;

        for (let i = 1; i < this.parameters.thetaSegments + 1; i++) {
            pos[i * 6 + 0] = Math.cos(angle * i) * outerRadius;
            pos[i * 6 + 1] = Math.sin(angle * i) * outerRadius;
            pos[i * 6 + 3] = Math.cos(angle * i) * innerRadius;
            pos[i * 6 + 4] = Math.sin(angle * i) * innerRadius;
            pos[i * 6 + 2] = pos[i * 6 + 5] = 0;

            uv[i * 4 + 0] = 1;
            uv[i * 4 + 1] = uv[i * 4 + 3] = i / this.parameters.thetaSegments;
            uv[i * 4 + 2] = 0;

            normal[i * 6 + 0] = normal[i * 6 + 1] = normal[i * 6 + 3] = normal[
                i * 6 + 4
            ] = 0;
            normal[i * 6 + 2] = normal[i * 6 + 5] = 1;

            index[i * 6 + 0] = (i - 1) * 2;
            index[i * 6 + 1] = index[i * 6 + 4] =
                (i * 2) % (this.parameters.thetaSegments * 2);
            index[i * 6 + 2] = index[i * 6 + 3] = (i - 1) * 2 + 1;
            index[i * 6 + 5] =
                ((i * 2) % (this.parameters.thetaSegments * 2)) + 1;
        }

        this.setIndex(index);
        this.setAttribute("position", new Float32BufferAttribute(pos, 3));
        this.setAttribute("normal", new Float32BufferAttribute(normal, 3));
        this.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    }
}
