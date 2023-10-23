import * as THREE from 'three'
import { getRandomInt} from './Utils/Math.js'


export default class GenerativeTerrain {
    constructor(gui, matcap) {
        this.width = 3;
        this.count = 100;
        this.heightMax = 10
        this.colors = [];
        this.gui = gui;
        this.matcap = matcap
        this.planeOffset = 7
        this.positionRange = 5.0
        this.guiParams = {
            width : this.width,
            count: this.count,
            heightMax : this.heightMax,
            grainAmount : 1.0, 
            positionRange : 5.0, 
            planeOffset : this.planeOffset
        }

        this.scene = new THREE.Group()
        this.guiSetup()
        this.init()

        this.box = new THREE.BoxBufferGeometry(1,1,1)
        
      
    }

    guiSetup () {
        const colorFormats = {
            string: '#ffffff',
            int: 0xffffff,
            object: { r: 1, g: 1, b: 1 },
            array: [ 1, 1, 1 ]
        };
        
        this.gui.addColor( colorFormats, 'string' );

        this.gui.add(this.guiParams, 'planeOffset', 0, 10).onChange(v => {
            this.planeOffset = v
            this.updateOnGuiCHange()
        })
        
        this.gui.add(this.guiParams, 'heightMax', 0, 10).onChange(v => { 
            this.heightMax = v;
            this.updateOnGuiCHange()
        });
        this.gui.add(this.guiParams, 'width', 0, 10).onChange(v => { 
            this.width = v
            this.updateOnGuiCHange()}
            );
        this.gui.add(this.guiParams, 'count', 0, 500).onChange(v => { 
            this.count = v
            this.updateOnGuiCHange()
        });
        this.gui.add(this.guiParams, 'positionRange', 1.0, 30.0).onChange(v => {
            this.positionRange = v
            this.updateOnGuiCHange()
        })
        console.log(this.gui)

    }

    addGrain () {
        this.mat.onBeforeCompile = function ( shader ) {
            // add custom uniforms
            shader.uniforms.uTime = { value:0 }
            shader.uniforms.uRColor = {value : 0.9}

            shader.vertexShader = shader.vertexShader.replace('void main() {', [
                'uniform float uTime;',
                'varying vec3 vPosition;',
                'void main() {',
                'vPosition = position;',
            ].join('\n'));

            const snoise4 = glsl`#pragma glslify: snoise3 = require(glsl-noise/simplex/3d)`;
       
            shader.fragmentShader = snoise4 + shader.fragmentShader;

            shader.fragmentShader = shader.fragmentShader.replace('void main() {', [
                'uniform float uTime;',
                'uniform float uRColor;',
                'varying vec3 vPosition;',
                'float clampedSine(float t) {',
                'return sin((t)+1.0)*0.5;',
                '}',
                'float random(vec2 st){',
                'return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);',
                '}',
   
                'void main() {',
        
            ].join('\n'));



            console.log(shader.fragmentShader)
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <output_fragment>',
                [
                    // 'outgoingLight.r = sin(uTime);',
                    'outgoingLight.r = 1.0;',
                    // 'outgoingLight.r = snoise(vec3(vPosition.yz,sin(uTime)))*5.0;',
                   
                    '#include <output_fragment>', 
                    
                ].join( '\n' )
            );

            this.userData.shader = shader;

        };
    }

    drawInstancedMesh (count, maxHeight) {
        const obj = new THREE.Object3D()
        const box = new THREE.BoxGeometry()
        this.mesh = new THREE.InstancedMesh()
        this.mesh.name = "grid"
        this.mesh = new THREE.InstancedMesh(box, this.mat, count)
        this.mesh.instanceMatrix.setUsage( THREE.DynamicDrawUsage ) // will be updated every frame
        for(let i = 0; i < this.count; i++){
            const posX = getRandomInt(-this.positionRange, this.positionRange)
            const posY = getRandomInt(-this.positionRange, this.positionRange)
            const height = Math.random()*maxHeight
            const scaleX = Math.random()*this.width
            const scaleZ = Math.random()*this.width
            obj.position.set(posX, height/2, posY)
            // obj.position.set(posX, 0, posZ)
            obj.scale.set(scaleX, height, scaleZ)
            obj.updateMatrix()
            this.mesh.setMatrixAt(i, obj.matrix)
        }
        this.mesh.instanceMatrix.needsUpdate = true
        this.scene.add(this.mesh)
    }

    drawPlane () {
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(this.positionRange*2+this.planeOffset, this.positionRange*2+this.planeOffset), this.planeMat);
        plane.rotateY(Math.PI / 2);
        plane.rotateX(Math.PI / 2);
        this.scene.add(plane);
    }

    remove () {
        let toBeRemoved = []
        this.scene.traverse(child => {   
            if(child.isInstancedMesh) {
                child.geometry.dispose();
                toBeRemoved.push(child)
                
            } else if(child.isMesh) {
                child.geometry.dispose();
                toBeRemoved.push(child)
            }
        })
        toBeRemoved.forEach(child => this.scene.remove(child))
     

       
  
    }
    
    init () {
        const axesHelper = new THREE.AxesHelper( 5 );
        this.scene.add( axesHelper );

        
        this.mat = new THREE.MeshMatcapMaterial()
        this.mat.matcap = this.matcap
        
        
        this.planeMat = new THREE.MeshBasicMaterial({color: '#2c2b2b'})
        this.planeMat.side = THREE.DoubleSide;
        this.drawPlane()

        this.drawInstancedMesh(this.count,  this.guiParams.heightMax)
        this.scene.add(this.mesh)
        this.addGrain()

    }

    update(time) {
        
        if(this.mat.userData && this.mat.userData.shader) {
            this.mat.userData.shader.uniforms.uTime.value = time
        }
       
    }

    updateOnGuiCHange () {
        this.remove()
        this.drawPlane()
        this.drawInstancedMesh(this.count, this.guiParams.heightMax)
    }



}
