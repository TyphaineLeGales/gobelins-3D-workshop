varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPosition;
varying float vAnimOffset;
varying float vTargetPos;

attribute float targetPos;
attribute float delay;

uniform float uWindForce;

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 clipPosition = projectionMatrix * viewPosition;
  
  vPosition = position.xyz;
  vAnimOffset = delay;
  vTargetPos = targetPos;

  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-viewPosition.xyz);

  //clipPosition.x += uWindForce * smoothstep(0.2,1.0,uv.x);

  // clipPosition.xyz -= normalize(vNormal)*position.y*0.07;
  gl_Position = clipPosition;
}