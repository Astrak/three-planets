export const fragmentShader = `
    uniform float g;
    uniform vec3 sunDirection;

    varying vec3 ray;
    varying vec3 attenuationCoeff;
    varying vec3 c1;
    varying float vAngle;

    float getMiePhase( float c, float g ) {
        return 1.5 * ( ( 1.0 - g * g ) / ( 2.0 + g * g ) ) * ( 1.0 + c * c ) / pow( 1.0 + g * g - 2.0 * g * c, 1.5 );
    }

    float getRayleighPhase( float c ) {
        return 0.75 * ( 1.0 + c * c );
    }

    void main() {

        // 0.8 below: arbitrary. Helps to avoid re-render all the background atmosphere.
        // Doesnt seem to match inner/outer radius if we pass them instead of that value ?
        if ( vAngle < .8 ) discard;

        float cosine = dot( sunDirection, ray ) / length( ray );

        vec3 color = getRayleighPhase( cosine ) * attenuationCoeff + getMiePhase( cosine, g ) * c1;

        gl_FragColor = vec4( color, color.b );

    }
`;
