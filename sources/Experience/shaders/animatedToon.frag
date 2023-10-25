#include <common>
#include <lights_pars_begin>

uniform vec3 uColor;
uniform float uGlossiness;
uniform float uSpeed;
uniform float uAnimationDuration;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPosition;
varying float vAnimOffset;
varying float vTargetPos;

float mapRange (float value, float low1, float high1, float low2, float high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
} 

void main() {
  float NdotL = dot(vNormal, directionalLights[0].direction);
  float lightIntensity = (smoothstep(0.0, 0.01, NdotL) + smoothstep(0.8,0.81,NdotL)) * 0.5;
  vec3 directionalLight = directionalLights[0].color * lightIntensity;

  float rimDot = step(0.5,dot(vViewDir, vNormal));
  float currTime = mapRange((uSpeed-vAnimOffset), 0.0, uAnimationDuration, 0.0,vTargetPos);
  // mapRange(time - flower.userData.animationOffset, 0, this.animDuration, 0, flower.userData.targetPosY)
  if ( vPosition.y > currTime ) discard;

  gl_FragColor = vec4(uColor * (directionalLight + ambientLightColor) * rimDot , 1.0);
}