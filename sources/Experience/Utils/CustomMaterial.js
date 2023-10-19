import { MeshBasicMaterial} from "three";
// import glsl from 'glslify'

export default class CustomMaterial extends MeshBasicMaterial {
    constructor(params) {
        super({
            ...params
        })
    }

    addUtils (shader) {
        const snoise4 = glsl`#pragma glslify: snoise4 = require(glsl-noise/simplex/4d)`;

        shader.vertexShader = shader.vertexShader.replace('void main() {', [
            'uniform float uTime;',
            'float clampedSine(float t) {',
            'return sin((t)+1.0)*0.5;',
            '}',
            'float random(vec2 st){',
            'return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);',
            '}',
            snoise4,
            'void main() {',
        ].join('\n'));
    }
    
    applyEffect (shader, effectName) {
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
        // re-insert the include after the patch
        patch.push("#include <project_vertex>")
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', patch.join('\n'));
    }

    onBeforeCompile(shader, renderer) {
        super.onBeforeCompile();
        // console.log(shader.vertexShader)
        // console.log(shader.fragmentShader)
        shader.uniforms.uTime = { value:0 }

        

        this.addUtils(shader)
        // this.applyEffect(shader, 'wavy')
        // this.applyEffect(shader, 'blowUp')
        // this.applyEffect(shader, 'twist')
        this.applyEffect(shader, 'noise')

        this.userData.shader = shader
    }


    update(time) {
        if(this.userData && this.userData.shader) {
            this.userData.shader.uniforms.uTime.value = time
        }
    }

}

