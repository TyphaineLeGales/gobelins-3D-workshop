uniform sampler2D uImage;
uniform float uTime;
uniform vec2 uSize;
varying vec2 vUv;

#define PI 3.14159

/* HELPERS */

float clampedSine (float t, float m) {
    return ( sin(t)+1.0)*0.5*m;
}

void applyMirror(inout vec2 uv) {
    uv.y = 1.0 - uv.y;
}

void applyVerticalSymmetry (inout vec2 uv) {
    uv.x = abs(uv.x-0.5)+0.5 ;
}

void applyRotation(inout vec2 uv, float r) {
    // déplacer le centre au milieu
    uv -= 0.5;

    float a = atan(uv.y, uv.x);
    a -=r;
    
    // principe du cercle trigonométrique x se trouve par le cosinus et le y par le sinus
    uv = vec2(cos(a), sin(a))*length(uv);

    // replacer le center
    uv+= 0.5;
}

void applyZoom( inout vec2 uv, float z) {
    uv -=0.5;
    uv = uv* (1.0/z);
    uv += 0.5;
}

void applyFisheye (inout vec2 uv, float s) {
    uv -= 0.5;
    float l = length(uv);
    //length longeur du veucteur entre le centre et la position du pixel
    uv *= smoothstep(0.0, s*0.5, l);
    uv += 0.5;
}

void applyGrid (inout vec2 uv, float gridSize) {
    uv = uv*gridSize;
    uv = fract(uv);
    
}

void main() {
    vec2 uv= vUv;
    // applyMirror(uv);
    // applyVerticalSymmetry(uv);
    // applyRotation(uv, 90.0);
    // applyZoom(uv, 2.0);
    // applyFisheye(uv, 1.0 + sin(uTime));
    applyGrid(uv, 3.0);
    vec4 col = texture2D(uImage, uv);
	gl_FragColor = col;
    // gl_FragColor = vec4(vUv.x, vUv.y, 0.0, 1.0);
}