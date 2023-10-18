uniform sampler2D uImage;
uniform float uTime;
uniform vec2 uSize;
uniform vec2 uMousePos;
varying vec2 vUv;

#define PI 3.14159

/* HELPERS */

float clampedSine (float t, float m) {
    return ( sin(t)+1.0)*0.5*m;
}

float random (vec2 st) {
    return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
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

void applyFold (inout vec2 uv, float s) {
    uv -= 0.5;
    uv.y += abs(uv.x)*s;
    uv += 0.5;
}

void applyClamp (inout vec2 uv, float a, float b) {
 uv = vec2(uv.x,clamp(uv.y, a, b));
}

void applyPixelate (inout vec2 uv, float s) {
    // 0 int qui correspond au level of detail
    vec2 pix = vec2(s)/vec2(textureSize(uImage, 0));
    uv = floor(uv/pix)*pix;
}

void applySpiral (inout vec2 uv, float s) {
    // meme principe que rotation ou la force n'est pas apply également selon la length
    uv -= 0.5;
    float l= length(uv) -1.0;
    float a = atan(uv.y, uv.x);
    a += l*s;
    uv = vec2(cos(a), sin(a))*length(uv);

    // replacer le center
    uv+= 0.5;
}

void applyRandom (inout vec2 uv, float p, float s) {
    vec2 pix = vec2(s)/vec2(textureSize(uImage, 0));
    uv+= vec2(-1.0 + random(floor(uv/pix)*pix)*2.0, 0.0)*s ;
}



void main() {
    vec2 uv= vUv;
    // applyMirror(uv);
    // applyVerticalSymmetry(uv);
    // applyRotation(uv, 90.0);
    // applyZoom(uv, 2.0);
    // applyFisheye(uv, 1.0 + sin(uTime));
    // applyGrid(uv, 3.0);
    // applyFold(uv, clampedSine(uTime, 0.5));
    // applyClamp(uv, 0.25, clampedSine(uTime, 0.75));
    // applyPixelate(uv, 50.0);
    applySpiral(uv, clampedSine(uTime, 0.75));
    // applyRandom(uv, 2.0 + clampedSine(uTime + PI, 6.0), clampedSine(uTime, 0.2));
    vec4 col = texture2D(uImage, uv);
	gl_FragColor = col;
    // gl_FragColor = vec4(vUv.x, vUv.y, 0.0, 1.0);
}