import { MeshBasicMaterial} from "three";

export default class CustomMaterial extends MeshBasicMaterial {
    constructor(params) {
        super({
            ...params, 
            transparent :true
        })
    }

    addUtils (shader) {
        const snoise4 = glsl`#pragma glslify: snoise4 = require(glsl-noise/simplex/4d)`;

        shader.vertexShader = shader.vertexShader.replace('void main() {', [
            'uniform float uTime;',
            'varying vec3 vPosition;',
            'float clampedSine(float t) {',
            'return sin((t)+1.0)*0.5;',
            '}',
            'float random(vec2 st){',
            'return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);',
            '}',
            snoise4,
            'void main() {',
            'vPosition = position;',
        ].join('\n'));

        shader.fragmentShader = shader.fragmentShader.replace('void main() {', [
            'uniform float uTime;',
            'varying vec3 vPosition;', 
            'vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {',
            'return a + b*cos( 6.28318*(c*t+d) );',
            '}',
            snoise4,
            'void main() {',
        ].join('\n'));
    }
    
    patchVertex (shader, effectName) {
        let patch = []
        if(effectName === 'wavy') {
            patch =  [
                'transformed.x += sin(transformed.y*2.0+uTime)*0.5;'
            ]
        }
        if(effectName === 'blowUp') {
            patch = [
                'float s = 1.2;',
                'transformed += normalize(normal)*s*abs(sin(uTime));' 
            ]
        }

        if(effectName === 'twist') {
            patch = [
                'float a = atan(transformed.z, transformed.x);',
                'float s = 1.5;',
                'a += transformed.y * sin(uTime)*s ;',
                'transformed.xz += vec2(cos(a), sin(a))*length(transformed.xz);',
            ]
        }

        if(effectName === 'noise') {
            patch = [
                'float s = 0.1;',
                'transformed += normalize(normal)*s;',
                'transformed += snoise(vec4(transformed, uTime))*0.1;'
            ]
        }

        if(effectName === 'random') {
            patch = [
                'float s = 0.5;',
                'transformed += normalize(normal)*random(transformed.xy)*sin(uTime)*s;'
            ]
        }
        // re-insert the include after the patch
        patch.push("#include <project_vertex>")
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', patch.join('\n'));
    }

    patchFragment(shader, effectName) {
        let patch = []
        if(effectName === 'colorRadar') {
            patch = [
                'float speed = 0.2; ',
                'float sizeOfNoise = 2.0;',
                'vec3 col = pal( snoise(vec4(vPosition.xyz, uTime*speed)*sizeOfNoise), vec3(0.898, 0.018, 1.168),vec3(0.555, 0.555, 2.208),vec3(1.000, 1.000, 1.000),vec3(1.268, 0.333, 0.667) );',
                // 3.0 represents the number of steps taken -> *X /X maps it in the interval 0-1 Here === num of colors
                'col =  floor(col*6.0)/6.0;', 
                'diffuseColor=vec4(col, 1.0);'
                
            ]
        }
        
        if(effectName === 'noiseOnTexture') {
            console.log(shader.fragmentShader)
            patch = [
                'float speed = 0.2; ',
                'float sizeOfNoise = 20.0;',
                'diffuseColor.a = smoothstep(-0.1, 1.0, snoise(vec4(vPosition, uTime*speed)*sizeOfNoise));'         
            ]

        }

        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', patch.join('\n'));
        patch.push('#include <color_fragment>')

    }

    onBeforeCompile(shader, renderer) {
        super.onBeforeCompile();
        // console.log(shader.vertexShader)
       
        shader.uniforms.uTime = { value:0 }

        

        this.addUtils(shader)
        // this.patchVertex(shader, 'wavy')
        // this.patchVertex(shader, 'blowUp')
        // this.patchVertex(shader, 'twist')
        // this.patchVertex(shader, 'noise')
        // this.patchVertex(shader, 'random')
        this.patchFragment(shader, 'colorRadar')
        // this.patchFragment(shader, 'noiseOnTexture')

        this.userData.shader = shader
    }


    update(time) {
        if(this.userData && this.userData.shader) {
            this.userData.shader.uniforms.uTime.value = time
        }
    }

}

