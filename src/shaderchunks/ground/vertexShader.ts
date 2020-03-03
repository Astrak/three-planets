export const vertexShader = `
        uniform float cloudAltitude;
        uniform float eyeHeight;
        uniform float sunIntensity;
        uniform float Km;
        uniform float Kr;

        uniform vec3 sunDirection;
        uniform vec3 invWavelengths;

        uniform mat4 modelMatrixInverse;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 mPosition;
        varying vec3 worldEye;
        varying vec3 renamed43847;
        varying vec3 attenuationCoeff;

        const int samples = 3;

        const float averageDensityAltitude = 1.0;

        const float atmThickness = OUTER_RADIUS - INNER_RADIUS;

        float scale ( float cosine ) {
            float x = 1.0 - cosine;
            return averageDensityAltitude * exp( -0.00287 + x * ( 0.459 + x * ( 3.83 + x * ( -6.80 + x * 5.25 ) ) ) );
        }

        #ifdef CLOUDS_CAST_SHADOWS
            varying vec3 cloudShadowPos;
        #endif

        varying vec3 cloudPos;

        vec3 getCloudProjectionFrom ( vec3 proj, vec3 mPos ) {
            float cs = max( 0.0, dot( mPos, proj ) );
            float bigR = INNER_RADIUS + cloudAltitude;
            float projLength = sqrt( INNER_RADIUS - ( INNER_RADIUS - cs * cs ) * INNER_RADIUS * INNER_RADIUS / ( bigR * bigR ) ) * bigR - cs * INNER_RADIUS;
            return mPos + proj * projLength;
        }

        void main() {

            mPosition = ( modelMatrix * vec4( position, 1.0 ) ).xyz;

            vUv = uv;
            vNormal = normalize( mPosition );
            worldEye = normalize( cameraPosition - mPosition );

            vec3 ray = mPosition - cameraPosition;
            float far = length( ray );
            ray /= far;

            // Get near, the nearest intersection point of this ray with the outer atmosphere.
            float B = 2.0 * dot( cameraPosition, ray );
            float C = eyeHeight * eyeHeight - OUTER_RADIUS * OUTER_RADIUS;
            float det = max( 0.0, B * B - 4.0 * C );
            float near = 0.5 * ( - B - sqrt( det ) );

            vec3 start = cameraPosition + ray * near;
            far -= near;
            float depth = exp( - atmThickness / averageDensityAltitude );
            float eyeAngle = dot( -ray, vNormal );
            float lightAngle = dot( sunDirection, vNormal );
            float cameraScale = scale( eyeAngle );
            float lightScale = scale( lightAngle );
            float cameraOffset = depth * cameraScale;
            float temp = lightScale + cameraScale;

            float sampleLength = far / float( samples );
            float scaledLength = sampleLength / atmThickness;
            vec3 sampleRay = ray * sampleLength;
            vec3 samplePoint = start + sampleRay * 0.5;

            vec3 frontColor = vec3( 0.0 );
            vec3 attenuation = vec3( 0.0 );

            for ( int i = 0; i < samples; i++ ) {
                float height = length( samplePoint );
                float depth = exp( ( INNER_RADIUS - height ) / ( atmThickness * averageDensityAltitude ) );
                float scatter = depth * temp - cameraOffset;
                attenuation = exp( - scatter * 4.0 * PI * ( invWavelengths * Kr + Km ) );
                frontColor += attenuation * depth * scaledLength;
                samplePoint += sampleRay;
            }

            attenuationCoeff = attenuation;
            renamed43847 = frontColor * sunIntensity * ( invWavelengths * Kr + Km );

            #ifdef CLOUDS_CAST_SHADOWS
                cloudShadowPos = normalize( getCloudProjectionFrom( sunDirection, mPosition ) );
            #endif

            cloudPos = normalize( getCloudProjectionFrom( worldEye, mPosition ) );

            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

        }
`;
