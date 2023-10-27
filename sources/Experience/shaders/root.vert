varying vec3 vNormal;
varying vec3 vViewDir;

uniform float uWindForce;


attribute float delay;

float clampedSine(float t, float m){
    return (sin(t) + 1.0) * .5 * m;
}

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 clipPosition = projectionMatrix * viewPosition;

  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-viewPosition.xyz);

clipPosition.x += clampedSine(uWindForce+delay,1.0) * (1.0-uv.x) * delay ;


  gl_Position = clipPosition;
}