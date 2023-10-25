import * as THREE from 'three'
import { getRandomInt, getRandomFloat, clamp, mapRange} from './Utils/Math.js'
import toonFragment from './shaders/toon.frag?raw' 
import toonVertex from './shaders/toon.vert?raw'
import animatedToonFrag from './shaders/animatedToon.frag?raw' 
import animatedToonVert from './shaders/animatedToon.vert?raw'
import buildingVert from './shaders/building.vert?raw'
import buildingFrag from './shaders/building.frag?raw'


export default class GenerativeTerrain {
    constructor(camera, gui, resources) {
        this.width = 1;
        this.resources = resources
        this.mapSize = 32;
        this.count = this.mapSize*this.mapSize;
        this.heightMax = 10
        this.color= '#f2f8c9'
        this.gui = gui;
        this.matcap = resources.matcap
        this.planeOffset = 7
        this.positionRange = 5.0
        this.flowerHeightMax =  8
        this.buildingDensity = 0.1;
        this.flowerDensity = 0.2;
        this.emptyDensity = 0.7;
        this.animDuration = 10;
        this.flowerMeshPositions = []
        
        this.camera = camera
        
        this.guiParams = {
            width : this.width,
            count: this.count,
            heightMax : this.heightMax,
            grainAmount : 1.0, 
            positionRange : 5.0, 
            planeOffset : this.planeOffset,
            flowerHeightMax : this.flowerHeightMax,
            colorFormats : {
                string: '#f2f8c9',
                int: 0xffffff,
                object: { r: 1, g: 1, b: 1 },
                array: [ 1, 1, 1 ]
            }, 
            buildingDensity: 0.25, 
            flowerDensity : 0.25, 
            emptyDensity : 0.5
        }
        this.flowersInScene = []
        this.weightedStates = []

        this.box = new THREE.BoxBufferGeometry(1,1,1)
        this.scene = new THREE.Group()
        this.map = []

        this.init()
    }

    initWeightedStates () {
        
        const weighted = [{
            type: 'building', 
            weight: this.buildingDensity
        }, {
            type: 'flower', 
            weight: this.flowerDensity
            
        }, {
            type: 'empty', 
            weight: this.emptyDensity
            
        }]

        weighted.forEach((e) => {
            for(let i = 0; i < e.weight*100; i++) {
                this.weightedStates.push(e.type)
            }
        })
    
    }

    getRandCellState () {
        const stateIndex = getRandomInt(0, this.weightedStates.length)
        return this.weightedStates[stateIndex]
    }

    guiSetup () {

        
        this.gui.addColor( this.guiParams.colorFormats, 'string' ).onChange(v => {
            this.color = v
            this.updateOnGuiCHange()
        })

        this.gui.add(this.guiParams, 'buildingDensity', 0.0, 1.0).onChange(v=> {
            this.buildingDensity = v
            this.updateOnGuiCHange()
        })

        this.gui.add(this.guiParams, 'flowerDensity', 0.0, 1.0).onChange(v=> {
            this.flowerDensity = v
            this.updateOnGuiCHange()
        })

        this.gui.add(this.guiParams, 'emptyDensity', 0.0, 1.0).onChange(v=> {
            this.emptyDensity = v
            this.updateOnGuiCHange()
        })

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
        this.gui.add(this.guiParams, 'positionRange', 1.0, 30.0).onChange(v => {
            this.positionRange = v
            this.updateOnGuiCHange()
        })

    }

    flowerMaterial () {
        // this.mat.onBeforeCompile = function ( shader ) {
        //     // add custom uniforms
        //     shader.uniforms.uTime = { value:0 }
        //     shader.uniforms.uRColor = {value : 0.9}
        //     shader.uniforms.uLightDir = 

        //     shader.vertexShader = shader.vertexShader.replace('void main() {', [
        //         'uniform float uTime;',
        //         'varying vec3 vViewDir;',
        //         // 'varying vec3 vNormal;',
        //         'varying vec3 vPosition;',
        //         'void main() {',
        //         'vPosition = position;',
        //         'vViewDir = normalize(-vViewPosition.xyz);',
            
               
        //     ].join('\n'));

        //     console.log(shader.vertexShader)

        //     const snoise4 = glsl`#pragma glslify: snoise3 = require(glsl-noise/simplex/3d)`;
       
        //     shader.fragmentShader = snoise4 + shader.fragmentShader;

        //     shader.fragmentShader = shader.fragmentShader.replace('void main() {', [
        //         'uniform float uTime;',
        //         'varying vec3 vViewDir;',
        //         'uniform float uRColor;',
        //         'varying vec3 vPosition;',
        //         'float clampedSine(float t) {',
        //         'return sin((t)+1.0)*0.5;',
        //         '}',
        //         'float random(vec2 st){',
        //         'return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);',
        //         '}',
   
        //         'void main() {',
        
        //     ].join('\n'));

        //     shader.fragmentShader = shader.fragmentShader.replace(
        //         '#include <output_fragment>',
        //         [
        //             // 'outgoingLight.r = 0.7;',
        //             'float NdotL = dot(vNormal, directionalLights[0].direction);',
        //             'float lightIntensity = (smoothstep(0.0, 0.01, NdotL) + smoothstep(0.8,0.81,NdotL)) * 0.5;',
        //             // 'vec3 directionalLight = directionalLights[0].color * lightIntensity;',
        //             'float rimDot = step(0.5,dot(vViewDir, vNormal));',
        //             'outgoingLight.xyz *= rimDot;',
        //             'vec3 color = vec3(0.5, 0.5, 0.5);',
        //             'gl_FragColor = vec4(color * (directionalLights[0].rgb + ambientLightColor.rgb) * rimDot , 1.0);',
        //             // 'outgoingLight.r = snoise(vec3(vPosition.yz,sin(uTime)))*5.0;',
                   
        //             '#include <output_fragment>', 
                    
        //         ].join( '\n' )
        //     );

        //     this.userData.shader = shader;
        // };
        this.mat = new THREE.ShaderMaterial({
            vertexShader : toonVertex, 
            fragmentShader : toonFragment, 
            uniforms : {
                uColor:{
                    value: new THREE.Color('#cc1919')
                },
                ...THREE.UniformsLib.lights,
            },
            lights:true

        })
        
    }

    taperTige () {
        // this.tigeMat.onBeforeCompile = function ( shader ) {
        //     shader.uniforms.uSpeed = { value:0 }
        //      let patch = [
        //         'transformed -= normalize(normal)*abs(position.y)*0.05;'
        //     ]
        //     patch.push("#include <project_vertex>")
        //     shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', patch.join('\n'))
        //     shader.vertexShader = shader.vertexShader.replace('void main() {', [
        //         'varying vec3 vPosition;',
        //         'void main() {',
        //         'vPosition = position;'
        //     ].join('\n'));



        //     // step discard 
        //     shader.fragmentShader = shader.fragmentShader.replace('void main() {', [
        //         'uniform float uSpeed;', 
        //         'varying vec3 vPosition;',
        //         'void main() {',
        //         'if ( vPosition.y > uSpeed ) discard;'
               
        //     ].join('\n'));

        //     // step to discard according to uSpeed

        //     shader.fragmentShader = shader.fragmentShader.replace(
        //         '#include <output_fragment>',
        //         [
        //             'outgoingLight.g = 0.7;',
        //             '#include <output_fragment>', 
                    
        //         ].join( '\n' )
        //     );
        //     this.userData.shader = shader;
        // }
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

    computeCellStates () {
        this.initWeightedStates()
        this.initMap()
    }

    drawInstancedMesh (count, heightMax) {
        const obj = new THREE.Object3D()
        const box = new THREE.BoxGeometry()

        const buildingTexture = this.resources.items.buildingTexture

        var buildingMaterial = new THREE.ShaderMaterial({
            vertexShader:buildingVert,
            fragmentShader:buildingFrag,
            uniforms:{
                uImage:{
                    value:buildingTexture
                }
            }
        })



        let tempMap = [...this.map]
        // compute count depending on map size 
        //console.log(this.gui)
        //this.mesh = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({color: this.color}), count)
        //this.mesh.instanceMatrix.setUsage( THREE.DynamicDrawUsage ) // will be updated every frame
        //for(let i = 0; i < this.map.length; i++){
        //   
        //    if(tempMap[i].state === "building") {
//
        //        const positions = tempMap[i].position
  //
        //        // get info from map
        //        const height = Math.random()*this.heightMax
        //        obj.position.set(positions.x, height/2, positions.z)
        //        
        //        const scaleX = getRandomFloat(0.1, 3)
        //        const scaleZ = getRandomFloat(0.1, 3)
        //        obj.scale.set(scaleX, height, scaleZ)
        //    } 
        //    
        //    obj.updateMatrix()
        //    this.mesh.setMatrixAt(i, obj.matrix)
        //}
        //
        //this.mesh.instanceMatrix.needsUpdate = true
        //this.scene.add(this.mesh)
   
        this.mesh = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({color: this.color}), count)
        this.mesh.instanceMatrix.setUsage( THREE.DynamicDrawUsage ) // will be updated every frame
        for(let i = 0; i < this.map.length; i++){
           
            if(tempMap[i].state === "building") {

                const positions = tempMap[i].position
  
                // get info from map
                const height = Math.random()*this.heightMax
                obj.position.set(positions.x, height/2, positions.z)
                
                const scaleX = getRandomFloat(0.1, 3)
                const scaleZ = getRandomFloat(0.1, 3)
                obj.scale.set(scaleX, height, scaleZ)
            } 
            
            obj.updateMatrix()
            this.mesh.setMatrixAt(i, obj.matrix)
        }
        
        this.mesh.instanceMatrix.needsUpdate = true
        this.scene.add(this.mesh)
        this.map = tempMap

        ///////

        const buildingGeometry = new THREE.BoxGeometry()


        for(let i = 0; i<this.map.length; i++){
            if(tempMap[i].state === "building"){
                const buildingClone = buildingGeometry.clone()

                const position = tempMap[i].position


                const height = Math.random()*heightMax
                const scaleX = Math.random()*3
                const scaleZ = Math.random()*3

                const buildingMesh = new THREE.Mesh(buildingClone, buildingMaterial)

                buildingMesh.position.set(position.x, height/2, position.z)
                buildingMesh.scale.set(scaleX,height,scaleZ)

                this.scene.add(buildingMesh)
            }
        }
    }

    drawPlane () {
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(this.positionRange+this.planeOffset, this.positionRange+this.planeOffset), this.planeMat);
        plane.rotateY(Math.PI / 2);
        plane.rotateX(Math.PI / 2);
        this.scene.add(plane);
    }

    reset () {
        this.flowerMeshPositions = []
        this.weightedStates = []
        let toBeRemoved = this.flowersInScene
        this.scene.traverse(child => {   
            if(child.isMesh) {
                child.geometry.dispose();
                toBeRemoved.push(child)
            } 
        })

        this.flowersInScene = []
        toBeRemoved.forEach(child => this.scene.remove(child))
    }

    drawFlowerMesh ( r, posX, posZ, flowerTop) {
        const height = getRandomFloat(3, this.heightMax+3)
        const scale = r*2+1
        const curve = new THREE.CatmullRomCurve3( [
            new THREE.Vector3( posX, 0 ,posZ ),
            new THREE.Vector3( posX+Math.random()*0.3, height/5*1, posZ),
            new THREE.Vector3( posX, height/5*2, posZ+Math.random()*0.3 ),
            new THREE.Vector3( posX - Math.random()*1, height/5*3, posZ ),
            new THREE.Vector3( posX, height, posZ )
        ] );
        
        const tigeGeometry = new THREE.TubeGeometry(curve,12,r,24)


        const delay = getRandomFloat(0, 3)
        // const delay = 1
        const delayAttribute = new Float32Array( tigeGeometry.attributes.position.count );

        const targetPos = height;
        const targetPosAttribute = new Float32Array(tigeGeometry.attributes.position.count);
				
        for ( let i = 0; i < delayAttribute.length; i ++ ) {
            delayAttribute[ i ] = delay;
            targetPosAttribute[i] = targetPos;
        }

		tigeGeometry.setAttribute( 'delay', new THREE.BufferAttribute( delayAttribute, 1 ) );
        tigeGeometry.setAttribute( 'targetPos', new THREE.BufferAttribute( targetPosAttribute, 1 ) );

        const tige = new THREE.Mesh(tigeGeometry, this.tigeMat)

        flowerTop.traverse(o => {
            if(o.isMesh) {
                o.material = this.mat
            }
        })

        // flowerTop.lookAt( this.camera.position );

        // .setRotationFromEuler
        
        const flowerGroup = new THREE.Group()

        // set target values for animation
        flowerGroup.userData.targetPosY = height - scale/2;
        flowerGroup.userData.targetScale = scale
     
        flowerGroup.userData.animationOffset = delay
        //init at zero
        flowerTop.position.set(posX, 0, posZ);
        flowerTop.scale.set(0, 0, 0);
        
        flowerGroup.add(tige,flowerTop )
        this.scene.add(flowerGroup)
        this.flowersInScene.push(flowerGroup)

       
    }

    getFlower(type) {
        if(type === 0) {
            return this.resources.items.fleur_1.scene.clone()
        }

        if(type === 1) {
            return this.resources.items.fleur_2.scene.clone()
        }

        if(type === 2) {
            return this.resources.items.fleur_3.scene.clone()
        }
        else console.log("error returning flower geometry")
    }

    drawFlowers () {
        for(let i = 0; i < this.map.length; i++){
            if(this.map[i].state === "flower") {
                const currCell = this.map[i]
                const r = getRandomFloat(0.2, 0.5)
                const flowerTop = this.getFlower(getRandomInt(0, 2))
                this.drawFlowerMesh( r, currCell.position.x, currCell.position.z, flowerTop)
            }
        }
    }
    
    init () {
        const axesHelper = new THREE.AxesHelper( 5 );
        this.scene.add( axesHelper );
        const gridHelper = new THREE.GridHelper( this.mapSize*2, this.mapSize*2 );
        this.scene.add( gridHelper );
        gridHelper.position.x += this.mapSize/2
        gridHelper.position.z += this.mapSize/2

        const ambient = new THREE.AmbientLight(0xffffff, 0.4)
        const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
        directionalLight.position.set(3, 5, 5)
        directionalLight.lookAt(0, 0, 0)
        this.scene.add( directionalLight, ambient );
        // this.scene.add( directionalLight.target );
        
        this.guiSetup()
        this.computeCellStates()

        // this.mat = new THREE.MeshStandardMaterial()
        // this.mat.matcap = this.matcap

        // this.tigeMat = new THREE.MeshMatcapMaterial()
        // this.tigeMat.matcap = this.matcap
        // this.tigeMat.side = THREE.DoubleSide
        this.tigeMat = new THREE.ShaderMaterial({
            vertexShader : animatedToonVert, 
            fragmentShader: animatedToonFrag, 
            uniforms: {
                uColor:{
                    value: new THREE.Color('#cc1919')
                },
                uSpeed : {value : 0}, 
                uAnimationDuration : {value: this.animDuration},
                // uAnimationTime 
                ...THREE.UniformsLib.lights,
            
            }, 
            lights: true,
            side:THREE.DoubleSide
        })

        this.mat2 = new THREE.MeshMatcapMaterial()
        this.mat2.matcap = this.matcap

        this.drawInstancedMesh(this.count,  this.guiParams.heightMax)
        this.scene.add(this.mesh)
        this.flowerMaterial()

        this.drawFlowers()
        // this.taperTige()
    }

    animateFlower (flower,time) {

        flower.children[1].position.y = mapRange(time - flower.userData.animationOffset, 0, this.animDuration, 0, flower.userData.targetPosY)
        const currScale = mapRange(time - flower.userData.animationOffset, 0, this.animDuration, 0, flower.userData.targetScale)
        flower.children[1].scale.set(currScale, currScale, currScale)
    }

    update(time) {
       
        if(this.tigeMat.uniforms ) {
            // this.mat.uniforms.uTime.value = time
            // console.log(this.tigeMat.uniforms.uSpeed.value)
            
            this.tigeMat.uniforms.uSpeed.value = time // calc speed based on time
        }
        
        if(this.flowersInScene.length > 0 ) {
            this.flowersInScene.forEach(flower => {
                if(time < flower.userData.animationOffset + this.animDuration )this.animateFlower(flower,  time)
            });
        }
    }

    updateOnGuiCHange () {
        this.reset()
        this.computeCellStates()
        this.drawPlane()
        this.drawInstancedMesh(this.count, this.guiParams.heightMax)
        this.drawFlowers()
    }



}
