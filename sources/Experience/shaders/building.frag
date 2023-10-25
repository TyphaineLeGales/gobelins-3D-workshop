precision mediump float;

uniform sampler2D uImage;

varying vec2 vUv;

void main()
{

    float noise = (fract(sin(dot(vUv, vec2(12.9898,78.233)*2.0)) * 43758.5453));

    float borderX = (smoothstep(0.0,0.05,vUv.x)+smoothstep(1.0,0.95,vUv.x))-1.0;
    float borderY = (smoothstep(0.0,0.05,vUv.y)+smoothstep(1.0,0.95,vUv.y))-1.0;

    vec4 col = texture2D(uImage, vUv);

    vec4 test = mix(vec4(141.0/255.0,149.0/255.0,143.0/255.0,1.0),col,0.2);

    gl_FragColor = test - noise * 0.6;


    //gl_FragColor = vec4(1.0* borderX * borderY, 1.0* borderX * borderY, 1.0* borderX * borderY, 1.0) * borderX * borderY - noise * 0.4;
}