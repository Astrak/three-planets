export const fragmentShader = `
    uniform mat4 modelMatrixInverse;

    uniform sampler2D albedoMap;
    uniform sampler2D cloudMap;
    uniform sampler2D cityMap;
    uniform sampler2D cityMask;
    uniform sampler2D emissiveMap;
    uniform sampler2D specularMap;
    uniform sampler2D suburbsMask;

    uniform float cityScale;
    uniform float cloudAltitude;
    uniform float emissiveMapIntensity;
    uniform float nightContrast;
    uniform float shininess;
    uniform float suburbsScale;
    uniform float sunIntensity;

    uniform vec3 citiesColor;
    uniform vec3 color;
    uniform vec3 emissive;
    uniform vec3 sunDirection;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 mPosition;
    varying vec3 worldEye;
    varying vec3 renamed43847;
    varying vec3 attenuationCoeff;

    #ifdef USE_BUMPMAP //Three s bumpmap_pars_fragment a bit tweeked

        uniform sampler2D bumpMap;
        uniform float maxGroundAltitude;

        // Derivative maps - bump mapping unparametrized surfaces by Morten Mikkelsen
        // http://mmikkelsen3d.blogspot.sk/2011/07/derivative-maps.html

        // Evaluate the derivative of the height w.r.t. screen-space using forward differencing (listing 2)

        vec2 dHdxy_fwd() {

            vec2 dSTdx = dFdx( vUv );
            vec2 dSTdy = dFdy( vUv );

            float Hll = texture2D( bumpMap, vUv ).x;
            float dBx = texture2D( bumpMap, vUv + dSTdx ).x - Hll;
            float dBy = texture2D( bumpMap, vUv + dSTdy ).x - Hll;

            return vec2( dBx, dBy );

        }

        vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy ) {

            // Workaround for Adreno 3XX dFd*( vec3 ) bug. See #9988

            vec3 vSigmaX = vec3( dFdx( surf_pos.x ), dFdx( surf_pos.y ), dFdx( surf_pos.z ) );
            vec3 vSigmaY = vec3( dFdy( surf_pos.x ), dFdy( surf_pos.y ), dFdy( surf_pos.z ) );
            vec3 vN = surf_norm;// normalized

            vec3 R1 = cross( vSigmaY, vN );
            vec3 R2 = cross( vN, vSigmaX );

            float fDet = dot( vSigmaX, R1 );

            vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
            return normalize( abs( fDet ) * surf_norm - vGrad );

        }

    #endif


    #ifdef CLOUDS_CAST_SHADOWS
        varying vec3 cloudShadowPos;
    #endif

    varying vec3 cloudPos;

    vec3 getCloudProjectionFrom ( vec3 proj, vec3 mPos, float height ) {
        float cs = max( 0.0, dot( mPos, proj ) );
        float r = INNER_RADIUS + height;
        float R = INNER_RADIUS + cloudAltitude;
        float projLength = sqrt( 1.0 - ( 1.0 - cs * cs ) * r * r / ( R * R ) ) * R - cs * r;
        return mPos + proj * projLength;
    }

    vec2 getUv ( vec3 pos ) {
        vec2 uv;
        vec3 pos0 = normalize( ( modelMatrixInverse * vec4( pos, 1.0 ) ).xyz );
        uv.y = asin( pos0.y ) / PI + 0.5;
        uv.x = - acos( pos0.x / sqrt( 1.0 - pos0.y * pos0.y ) ) / PI / 2.0 * pos0.z / abs( pos0.z ) + 0.5;
        return uv;
    }

    void main() {

        vec3 normal = vNormal;
        float height = 0.0;
        float cloudShadow = 0.0;

        /* CLOUDS */
        vec2 cloudUv = getUv( cloudPos );
        #ifdef CLOUDS_CAST_SHADOWS
            vec2 cloudShadowUv = getUv( getCloudProjectionFrom( sunDirection, mPosition, height ) );
        #endif

        float clouds = texture2D( cloudMap, cloudUv ).r;

        #ifdef CLOUDS_CAST_SHADOWS
            cloudShadow = texture2D( cloudMap, cloudShadowUv ).r;
        #endif

        /* SPECULARITY */
        vec3 halfVector = normalize( sunDirection + worldEye );
        float specularMask = texture2D( specularMap, vUv + vec2( 0.0, 0.0002 ) ).r; //The map i have is not perfectly aligned with the albedo map.
        float specular = 0.6 * pow( max( 0.0, dot( normal, halfVector ) ), shininess ) * specularMask * ( 1.0 - clouds );

        /* BUMPMAP*/
        #ifdef USE_BUMPMAP
            normal = perturbNormalArb( mPosition, normal, dHdxy_fwd() );
            normal = mix( normal, vNormal, specularMask ); //Hack : the bumpmap has some diffs at sea level, this removes them.
            height = texture2D( bumpMap, vUv ).r; //todo : perf : identical sampling in three s perturbnormalarb
            // clouds *= max( 0.0, min( 1.0, ( cloudAltitude - height * maxGroundAltitude ) / 0.00005 ) );
            // cloudShadow *= max( 0.0, min( 1.0, ( cloudAltitude - height * maxGroundAltitude ) / 0.00005 ) );
        #endif

        /* ALBEDO */
        vec4 albedo = texture2D( albedoMap, vUv ) * vec4( color, 1.0 );
        #ifdef USE_BUMPMAP //very hacky bump shading... since the main shading is given by the attenuationCoeff
            albedo *= 0.8 + dot( normal, sunDirection ) * maxGroundAltitude / 0.001 * ( 1.0 - dot( vNormal, normal ) ) * height * height; //Idea : use another parameter... since actually bumpScale is yet used to deform the normal.
        #endif
            albedo += specular; //todo : handle intensity + color, then handle threejs lights.. big stuff. Maybe rather handle a custom array of stars ?
        #ifdef CLOUDS_CAST_SHADOWS
            albedo *= 1.0 - smoothstep( 0.0, 1.0, max( 0.0, dot( vNormal, sunDirection ) * 20.0 ) ) * cloudShadow; // 20.0  gives good results.
        #endif
        albedo += clouds; //todo : clouds color
        albedo *= min( 1.0, sunIntensity );

        /* NIGHT ALBEDO */
         vec4 nightGroundEmission = texture2D( emissiveMap, vUv );
         vec2 recVec = vec2( 2.0, 1.0 ) * vUv;

        /* NIGHT CITIES */
        vec4 cities = vec4( citiesColor, 1.0 ) * ( 1.0 - specularMask );
        cities *= texture2D( cityMap, vUv * cityScale );
        cities *= texture2D( suburbsMask, recVec * suburbsScale ).r + 0.3;
        cities *= texture2D( cityMask, vUv ).r * 4.0;

        /* TOTAL EMISSION (with clouds)*/
        vec4 emi = ( nightGroundEmission + cities ) * ( 1.0 - clouds );
        emi += 0.3 * clouds * vec4( 0.7, 0.7, 1.0, 1.0 );
        emi = vec4( pow( emi.r, nightContrast ), pow( emi.g, nightContrast ), pow( emi.b, nightContrast ), emi.a );
        vec4 emission = emissiveMapIntensity * emi * dot( vNormal, worldEye );

        vec4 outgoingLight = mix( emission, albedo, vec4(attenuationCoeff,1.0) );

        gl_FragColor = vec4(renamed43847,1.0) + outgoingLight;

        // #include <tonemapping_fragment> //not working as expected... will need a proper implementation of light energy in the shader

    }

`;
