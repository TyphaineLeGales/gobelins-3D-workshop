varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPosition;
varying float vAnimOffset;
varying float vTargetPos;
varying float vGrowDir;
varying vec2 vUv;
varying vec3 vNormal2;

attribute float targetPos;
attribute float delay;
attribute float growDirection;

uniform float uSpeed;

float clampedSine(float t, float m){
    return (sin(t) + 1.0) * .5 * m;
}

void main() {
  vec3 pos = position;
  pos.xyz -= normal * uv.x * 0.2 *growDirection;
  pos.x += clampedSine(uSpeed+delay,1.0) * (uv.x) * delay ;

  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 clipPosition = projectionMatrix * viewPosition;
  
  vPosition = pos.xyz;
  vAnimOffset = delay;
  vTargetPos = targetPos;
  vGrowDir = growDirection;
  vUv = uv;

  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-viewPosition.xyz);
  vNormal2 = normal;


  
  gl_Position = clipPosition;
}