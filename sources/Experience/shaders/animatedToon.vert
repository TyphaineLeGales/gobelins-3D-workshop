varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPosition;

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 clipPosition = projectionMatrix * viewPosition;
  vPosition = position.xyz;

  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-viewPosition.xyz);

  gl_Position = clipPosition;
}