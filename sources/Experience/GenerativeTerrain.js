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
                    'outgoingLight.g = 0.8;',
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
        this.mesh = new THREE.InstancedMesh(box, this.mat2, count)
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
            } else if (child.children.length > 0) {}
        })
        toBeRemoved.forEach(child => this.scene.remove(child))
     
  
    }

    drawFlowerMesh (height, r, posX, posZ) {

        let tigeSubdivisionsAmount = 12;
        let tigeCutsSubdivisions = 24;
        
        const curve = new THREE.CatmullRomCurve3( [
            new THREE.Vector3( posX, 0 ,posZ ),
            new THREE.Vector3( posX+Math.random()*0.3, height/5*1, posZ),
            new THREE.Vector3( posX, height/5*2, posZ+Math.random()*0.3 ),
            new THREE.Vector3( posX - Math.random()*1, height/5*3, posZ ),
            new THREE.Vector3( posX, height, posZ )
        ] );
        
        const tigeGeometry = new THREE.TubeGeometry(curve,tigeSubdivisionsAmount,r,tigeCutsSubdivisions)
        const tigeMaterial = new THREE.MeshBasicMaterial({color:0xff0000, wireframe:true})
        // const epineMaterial = new THREE.MeshBasicMaterial({color:0xffd500, wireframe:true})
        // const mat = new THREE.MeshBasicMaterial({color: 0xffffff})
        const tige = new THREE.Mesh(tigeGeometry, this.mat)
        const topPlaceholder = new THREE.SphereGeometry( 1.5, 32,12 ); 
        const topMesh = new THREE.Mesh(topPlaceholder, this.mat)
        topMesh.position.set(posX, height, posZ);
        // tige.scale.set(0.1, 1, 0.1)
        const flowerGroup = new THREE.Group()
        const subTop = new THREE.Mesh(new THREE.SphereGeometry( 1, 12, 6 ), this.mat); 
        subTop.position.set(posX+Math.random()*0.3, height+1.4, posZ+Math.random()*0.3);
        flowerGroup.add(tige,topMesh, subTop )
        return flowerGroup

        // this.scene.add(tige)

        // if(flowerType === 1){

        //     let epinesCenterPoints = curve.getPoints(tigeSubdivisionsAmount)

        //     for(let i = 0; i<epinesCenterPoints.length-1; i++){
        //         const epineGeometry = new THREE.ConeGeometry( tigeWidth*0.5, tigeWidth*3, 16 );
        //         epineGeometry.translate(0,tigeWidth*1.5,0)
        //         const epineMesh = new THREE.Mesh(epineGeometry,epineMaterial) 
               
        //         epineMesh.position.set(epinesCenterPoints[i].x,epinesCenterPoints[i].y ,epinesCenterPoints[i].z)
                
        //         const tigeVector = new THREE.Vector3()
        //         const tigeNormal = tigeVector.subVectors(epinesCenterPoints[i+1],epinesCenterPoints[i]).normalize()

        //         const arbitraryVector = new THREE.Vector3(1, 0, 0);

        //         const perpendicularVector = new THREE.Vector3().crossVectors(tigeNormal,arbitraryVector)

        //         const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),perpendicularVector)
        //         epineMesh.applyQuaternion(quaternion)
        //         this.scene.add(epineMesh)
        //     }
        // }

    }

    drawFlowers () {
        const obj = new THREE.Object3D()
        const flowerGeo= new THREE.CylinderGeometry(1, 1, 1, 16 ); 
        const flowerMat = new THREE.MeshBasicMaterial({color : 0xffffff})
       
        
        this.flowerMesh = new THREE.InstancedMesh(flowerGeo, flowerMat, this.count)
        for(let i = 0; i < this.map.length; i++){
            
            if(this.map[i].state === "flower") {
                const currCell = this.map[i]
                const height = getRandomFloat(1, this.heightMax+2)
                const r = getRandomFloat(0.2, 0.75)
                const flower = this.drawFlowerMesh(height, r, currCell.position.x, currCell.position.z)
                this.scene.add(flower)
                // const height = this.heightMax*Math.random()
                // const r = 0.1

        //    obj.scale.set(r, height, r) // generate random height
        //    obj.position.set(currCell.position.x, height/2, currCell.position.z)
            }
            // obj.updateMatrix()
            // this.flowerMesh.setMatrixAt(i, obj.matrix)
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

        this.mat2 = new THREE.MeshMatcapMaterial()
        this.mat2.matcap = this.matcap
        
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
