precision mediump float;

varying vec2 vUv;

uniform float uTime;




void main()
{



    float noise = (fract(sin(dot(vUv, vec2(12.9898,78.233)*2.0)) * 43758.5453));


    gl_FragColor = vec4(0.6, 0.6, 0.6, 1.0) - noise * 0.8;
}