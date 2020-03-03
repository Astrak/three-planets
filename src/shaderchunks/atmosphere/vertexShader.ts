export const vertexShader = `
    uniform float Km;
    uniform float Kr;
    uniform float averageDensityAltitude;
    uniform float eyeHeight;                                            // eyeHeight is the camera distance to the planet position.
    uniform vec3 sunDirection;
    uniform float sunIntensity;
    uniform vec3 invWavelengths;

    const int samples = 3;

    const float atmThickness = (OUTER_RADIUS - INNER_RADIUS);

    varying vec3 ray;
    varying vec3 attenuationCoeff;
    varying vec3 c1;
    varying float vAngle;

    float scale( float cosine ) {
        float x = 1.0 - cosine;
        return averageDensityAltitude * exp( -0.00287 + x * ( 0.459 + x * ( 3.83 + x * ( -6.80 + x * 5.25 ) ) ) );
    }

    void main() {

        vec3 mPosition = ( modelMatrix * vec4( position, 1.0 ) ).xyz;

        ray = cameraPosition - mPosition;

        vec3 eye = mPosition - cameraPosition;                          // eye is the unit vector camera to vertex.
        float far = length( eye );                              // eyeDistance is the distance between the camera and the vertex.
        eye /= far;

        float B = 2.0 * dot( cameraPosition, eye );
        float tangentDistance = eyeHeight * eyeHeight - OUTER_RADIUS * OUTER_RADIUS;
        float det = max( 0.0, B * B - 4.0 * tangentDistance );
        float near = 0.5 * ( - B - sqrt( det ) );

        vec3 start = cameraPosition + eye * near;
        far -= near;
        float startAngle = dot( eye, start ) / OUTER_RADIUS;
        float startDepth = exp( -1.0 / averageDensityAltitude );
        float startOffset = startDepth * scale( startAngle );

        float sampleLength = far / float( samples );
        float scaledLength = sampleLength / ( OUTER_RADIUS - INNER_RADIUS );
        vec3 sampleRay = eye * sampleLength;
        vec3 samplePoint = start + sampleRay * 0.5;

        vec3 frontColor = vec3( 0.0 );

        for ( int i = 0; i < samples; i++ ) {

            float height = length( samplePoint );
            float depth = exp( ( INNER_RADIUS - height ) / ( atmThickness * averageDensityAltitude ) );
            float lightAngle = dot( sunDirection, samplePoint ) / height;
            float cameraAngle = dot( eye, samplePoint ) / height;
            float scatter = ( startOffset + depth * ( scale( lightAngle ) - scale( cameraAngle ) ) );
            vec3 attenuation = exp( - scatter * 4.0 * PI * ( invWavelengths * Kr + Km ) );

            frontColor += attenuation * depth * scaledLength;
            samplePoint += sampleRay;

        }

        attenuationCoeff = frontColor * invWavelengths * Kr * sunIntensity;
        c1 = frontColor * sunIntensity * Km;
        vAngle = 1.0 - dot( normalize(mPosition), eye );

        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    }
`;
