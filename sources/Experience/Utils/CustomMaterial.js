import { MeshBasicMaterial} from "three";


export default class CustomMaterial extends MeshBasicMaterial {
    constructor(params) {
        super({
            ...params
        })
    }

    onBeforeCompile(shader, renderer) {
        super.onBeforeCompile();
        console.log(shader.vertexShader)
        console.log(shader.fragmentShader)
        shader.uniforms.uTime = { value:0 }

        shader.vertexShader = shader.vertexShader.replace('void main() {', [
            'uniform float uTime;',
            'float clampedSine(float t) {',
            'return sin((t)+1.0)*0.5;',
            '}',
            'float random(vec2 st){',
            'return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);',
            '}',
            'void main() {',
        ].join('\n'));

        // shader patching
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', [
            'transformed.x += sin(transformed.y*2.0+uTime)*0.5;',
            "#include <project_vertex>",
        ].join('\n'));

        this.userData.shader = shader
    }

    update(time) {
        if(this.userData && this.userData.shader) {
            this.userData.shader.uniforms.uTime.value = time
        }
    }

}

