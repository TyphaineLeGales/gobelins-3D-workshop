uniform sampler2D uImage;
uniform float uTime;
uniform vec2 uSize;
uniform vec2 uMouse;
varying vec2 vUv;

#define PI 3.14159

/* HELPERS */

float clampedSine (float t, float m) {
    return ( sin(t)+1.0)*0.5*m;
}

float random (vec2 st) {
    return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
}

float luminance(vec3 rgb) {
    return dot(rgb, vec3(0.299, 0.587, 0.114));
}

/* UV manipulations */ 

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

void applyScan (inout vec2 uv) {

    // uv.x += random(vec2(uv.y)*2.0 - 1.0)*0.5; 
    uv.x += smoothstep(0.0, 1.0, sin(uv.y*1.0 + uTime*2.0));

}

void applySandedGlass (inout vec2 uv, float noiseFactor) {
    uv += random(uv*2.0 - 1.0)* noiseFactor;
    // can be used a postprocessing effect
}

/* Color manipulations */

void applyCathodicScreen (inout vec2 uv, float s, float dir) {
    //sign -> returns -1 for negative, 0 for 0 and 1 for a positive value
    // uv.x += sign(sin(abs(uv.y)*1000.0))+1.0;

    float crt = sin(abs(uv.y)+ dir*1000.0);
    uv.x += sign(crt)*s;
  
}

void applyBlackAndWhite (inout vec4 col) {
    // map rgb luminance between 0 and 1 
    col.rgb = vec3(luminance(col.rgb));
}

void applyThreshold (inout vec4 col, float t) {
    col.rgb = step(t, vec3(luminance(col.rgb)));
}

void applyColorThreshold (inout vec4 col, float s) {
    // find closest matching color
    col = ceil(col*s)/s;
}

void applySonar (inout vec4 col, vec2 uv) {
    uv -=0.5;
    float l = length(uv);
    l *= 100.0;
    l += uTime*10.0;
    l = sin(l);
    l = smoothstep(-1.0, -0.9, l);
    col *= 0.5 + 0.5*l;
}

void applyGrid (inout vec4 col, vec2 uv) {
    col *= 0.5 + 0.5*smoothstep(-1.0, -0.9,sin(uv.y*200.0));
    col *= 0.5 + 0.5*smoothstep(-1.0, -0.9, sin(uv.x*200.0));
}

void applyWaves (inout vec4 col, vec2 uv, float d) {
    col *= 0.5 + 0.5* smoothstep(-1.0, -0.9,sin(uv.y*d)+sin(uv.x*40.0)*2.0);
}

void applyInvertedCircle (inout vec4 col, vec2 uv, float r) {
    uv -= 0.5;
  
    float l = length(uv);
    col.rgb = mix(1.0 - col.rgb, col.rgb, step(l, r));
}

void applyCircleFollowsMouse (inout vec4 col, vec2 uv, float r, vec2 c) {
    uv -= 0.5;
    c -= 0.5;
    c.x = -c.x;
    float l = length(uv+c);
    col.rgb = mix(1.0 - col.rgb, col.rgb, step(l, r));
}

void applyChromaticAberration (inout vec4 col, vec2 uv, float r, float a) {

}

void main() {
    vec2 uv= vUv;
    vec2 mousePos = normalize(uMouse);
    // applyMirror(uv);
    // applyVerticalSymmetry(uv);
    // applyRotation(uv, 90.0);
    // applyZoom(uv, 2.0);
    // applyFisheye(uv, 1.0 + sin(uTime));
    // applyGrid(uv, 3.0);
    // applyFold(uv, clampedSine(uTime, 0.5));
    // applyClamp(uv, 0.25, clampedSine(uTime, 0.75));
    // applyPixelate(uv, 50.0);
    // applySpiral(uv, clampedSine(uTime, 0.75));
    // applyRandom(uv, 2.0 + clampedSine(uTime + PI, 6.0), clampedSine(uTime, 0.2));
    // applySandedGlass(uv, 0.02);
    //  applyCathodicScreen(uv, 0.001 + clampedSine(uTime, 0.01), uTime*0.01);
    vec4 col = texture2D(uImage, uv);
    // applyBlackAndWhite(col);
    // applyThreshold(col, 0.5);
    // applyColorThreshold(col, 3.0);
    // applySonar(col, uv );
    // applyGrid(col, uv);
    // applyWaves(col, uv, 200.0);
    // applyCircleFollowsMouse(col, uv, 0.2, uMouse/uSize);
    applyChromaticAberration(col, uv, 0.3, 90);

	gl_FragColor = col;
}