import * as THREE from 'three'
import { getRandomInt, getRandomFloat} from './Utils/Math.js'


export default class GenerativeTerrain {
    constructor(gui, matcap) {
        this.width = 1;
        this.mapSize = 16;
        this.count = this.mapSize*this.mapSize;
        this.heightMax = 10
        this.colors = [];
        this.gui = gui;
        this.matcap = matcap
        this.planeOffset = 7
        this.positionRange = 5.0
        this.flowerHeightMax =  8
        this.guiParams = {
            width : this.width,
            count: this.count,
            heightMax : this.heightMax,
            grainAmount : 1.0, 
            positionRange : 5.0, 
            planeOffset : this.planeOffset,
            flowerHeightMax : this.flowerHeightMax
        }

        this.box = new THREE.BoxBufferGeometry(1,1,1)
        this.scene = new THREE.Group()
        this.map = []

        this.guiSetup()
        this.initMap()
        this.init()

    }

    getRandCellState () {
        const stateIndex = getRandomInt(0, 2)
        const states = ['building', 'flower', 'empty']
        return states[stateIndex]
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
        // this.gui.add(this.guiParams, 'count', 0, 500).onChange(v => { 
        //     this.count = v
        //     this.updateOnGuiCHange()
        // });
        this.gui.add(this.guiParams, 'positionRange', 1.0, 30.0).onChange(v => {
            this.positionRange = v
            this.updateOnGuiCHange()
        })

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

    initMap () {
        let cellArray = []
        for(let i= 0 ; i < this.mapSize; i++) {
            for(let j=0; j< this.mapSize; j++) {
       
                const cell = {
                    position: {x: i, z: j}, 
                    state : this.getRandCellState()
                }
                console.log(cell.state)
                cellArray.push(cell)
            }
        }
        this.map = cellArray

    }

    drawInstancedMesh (count, maxHeight) {
        const obj = new THREE.Object3D()
        const box = new THREE.BoxGeometry()

        let tempMap = [...this.map]
        // compute count depending on map size 
        this.mesh = new THREE.InstancedMesh(box, this.mat, count)
        this.mesh.instanceMatrix.setUsage( THREE.DynamicDrawUsage ) // will be updated every frame
        for(let i = 0; i < this.map.length; i++){
           
            if(tempMap[i].state === "building") {

                const positions = tempMap[i].position
  
                // get info from map
                const height = Math.random()*this.heightMax
                obj.position.set(positions.x, height/2, positions.z)
                
                const scaleX = getRandomFloat(0.1, 2)
                const scaleZ = getRandomFloat(0.1, 2)
                obj.scale.set(scaleX, height, scaleZ)
            } 
            
            obj.updateMatrix()
            this.mesh.setMatrixAt(i, obj.matrix)
        }
        
        this.mesh.instanceMatrix.needsUpdate = true
        this.scene.add(this.mesh)
        this.map = tempMap
        console.log(this.scene)
    }

    drawPlane () {
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(this.positionRange+this.planeOffset, this.positionRange+this.planeOffset), this.planeMat);
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

    drawFlowers () {
        const obj = new THREE.Object3D()
        const flowerGeo= new THREE.CylinderGeometry(1, 1, 1, 16 ); 
        const flowerMat = new THREE.MeshBasicMaterial({color : 0xffffff})
       
        // const freeSpacesCount = this.map.filter(e => !e.isOccupied).length
        this.flowerMesh = new THREE.InstancedMesh(flowerGeo, flowerMat, this.count)
        for(let i = 0; i < this.map.length; i++){
            if(this.map[i].state === "flower") {
                const currCell = this.map[i]
                const height = this.heightMax*Math.random()
                const r = Math.random()*0.5

                obj.scale.set(r, height, r) // generate random height
                obj.position.set(currCell.position.x, height/2, currCell.position.z)
            } else {
                obj.scale.set(0, 0, 0) // generate random height
            }
            obj.updateMatrix()
            this.flowerMesh.setMatrixAt(i, obj.matrix)
        }

        this.flowerMesh.instanceMatrix.needsUpdate = true
        this.scene.add(this.flowerMesh)
    }
    
    init () {
        const axesHelper = new THREE.AxesHelper( 5 );
        this.scene.add( axesHelper );
        const gridHelper = new THREE.GridHelper( this.mapSize*2, this.mapSize*2 );
        this.scene.add( gridHelper );

        this.initMap()

        this.mat = new THREE.MeshMatcapMaterial()
        this.mat.matcap = this.matcap
        
        // this.planeMat = new THREE.MeshBasicMaterial({color: '#2c2b2b'})
        // this.planeMat.side = THREE.DoubleSide;
        // this.drawPlane()

        this.drawInstancedMesh(this.count,  this.guiParams.heightMax)
        this.scene.add(this.mesh)
        this.addGrain()

       

        // compute map 
        this.drawFlowers()
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
        this.drawFlowers()
    }



}
