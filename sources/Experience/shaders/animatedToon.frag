#include <common>
#include <lights_pars_begin>

uniform vec3 uColor;
uniform float uGlossiness;
uniform float uSpeed;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPosition;


void main() {
  float NdotL = dot(vNormal, directionalLights[0].direction);
  float lightIntensity = (smoothstep(0.0, 0.01, NdotL) + smoothstep(0.8,0.81,NdotL)) * 0.5;
  vec3 directionalLight = directionalLights[0].color * lightIntensity;

  float rimDot = step(0.5,dot(vViewDir, vNormal));
    if ( vPosition.y > uSpeed ) discard;

//   gl_FragColor = vec4(vPosition.y, 0.0, 0,1.0)
  gl_FragColor = vec4(uColor * (directionalLight + ambientLightColor) * rimDot , 1.0);
}