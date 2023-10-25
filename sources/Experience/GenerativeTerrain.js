import * as THREE from 'three'
import { getRandomInt, getRandomFloat, clamp, mapRange} from './Utils/Math.js'
import toonFragment from './shaders/toon.frag?raw' 
import toonVertex from './shaders/toon.vert?raw'
import animatedToonFrag from './shaders/animatedToon.frag?raw' 
import animatedToonVert from './shaders/animatedToon.vert?raw'
import buildingVert from './shaders/building.vert?raw'
import buildingFrag from './shaders/building.frag?raw'

import Alea from 'alea'


export default class GenerativeTerrain {
    constructor(camera, gui, resources) {
        this.width = 1;
        this.resources = resources
        this.mapSize = 16;
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
        this.flowerAmplitude = 1.5
        
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
            flowerAmplitude:1.5,
            flowerDensity : 0.25, 
            emptyDensity : 0.5
        }
        this.flowersInScene = []
        this.weightedStates = []

        this.box = new THREE.BoxBufferGeometry(1,1,1)
        this.scene = new THREE.Group()
        this.map = []

        this.prng;

        if(window.location.hash){
            this.prng = new Alea(window.location.hash)
        }else{
            this.prng = new Alea(150)
        }

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

        this.gui.add(this.guiParams, 'flowerAmplitude', 0.0, 3.0).onChange(v=> {
            this.flowerAmplitude = v
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
        
        this.gui.add(this.guiParams, 'heightMax', 3, 10).onChange(v => { 
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

    HSLToHex(h,s,l) {
        s /= 100;
        l /= 100;
      
        let c = (1 - Math.abs(2 * l - 1)) * s,
            x = c * (1 - Math.abs((h / 60) % 2 - 1)),
            m = l - c/2,
            r = 0,
            g = 0, 
            b = 0; 
      
        if (0 <= h && h < 60) {
          r = c; g = x; b = 0;
        } else if (60 <= h && h < 120) {
          r = x; g = c; b = 0;
        } else if (120 <= h && h < 180) {
          r = 0; g = c; b = x;
        } else if (180 <= h && h < 240) {
          r = 0; g = x; b = c;
        } else if (240 <= h && h < 300) {
          r = x; g = 0; b = c;
        } else if (300 <= h && h < 360) {
          r = c; g = 0; b = x;
        }
        // Having obtained RGB, convert channels to hex
        r = Math.round((r + m) * 255).toString(16);
        g = Math.round((g + m) * 255).toString(16);
        b = Math.round((b + m) * 255).toString(16);
      
        // Prepend 0s, if necessary
        if (r.length == 1)
          r = "0" + r;
        if (g.length == 1)
          g = "0" + g;
        if (b.length == 1)
          b = "0" + b;
      
        return "#" + r + g + b;
      }

    generateColorPalette(){
        let colorPalette = []

        let tigeColorHSL = Math.round(this.prng()*359) % 359
        let roseTopColorHSL = Math.round(tigeColorHSL + 90 + ((this.prng() - 0.5)*40)) % 359
        let paqueretteBoutonColorHSL = Math.round(tigeColorHSL + 144 + ((this.prng() - 0.5)*40)) % 359
        let fleurBoutonColorHSL = Math.round(tigeColorHSL + 180 + ((this.prng() - 0.5)*40)) % 359
        let fleurTopColorHSL = Math.round(tigeColorHSL + 216 + ((this.prng() - 0.5)*40)) % 359
        let paqueretteTopColorHSL = Math.round(tigeColorHSL + 270 + ((this.prng() - 0.5)*40)) % 359

        colorPalette.push(this.HSLToHex(tigeColorHSL,(this.prng()*40)+60,(this.prng()*45)+45))
        colorPalette.push(this.HSLToHex(roseTopColorHSL,(this.prng()*40)+60,(this.prng()*45)+45))
        colorPalette.push(this.HSLToHex(paqueretteBoutonColorHSL,100,(this.prng()*45)+45))
        colorPalette.push(this.HSLToHex(fleurBoutonColorHSL,(this.prng()*40)+60,(this.prng()*45)+45))
        colorPalette.push(this.HSLToHex(fleurTopColorHSL,(this.prng()*40)+60,(this.prng()*45)+45))
        colorPalette.push(this.HSLToHex(paqueretteTopColorHSL,(this.prng()*40)+60,(this.prng()*45)+45))

        return colorPalette
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

    createFlowers(){
        for(let i =0; i<this.map.length; i++){
            if(this.map[i].state === "flower"){
                const currCell = this.map[i]
                const radius = (this.prng()*0.3)+0.1
                const flowerType = Math.floor((this.prng()*3)+1)
                const flowerHeight = (this.prng()*7)+3
                const fAmplitude = this.prng()*this.flowerAmplitude
                this.createFlower(radius,currCell.position.x,currCell.position.z,flowerType, flowerHeight,fAmplitude)
            }
        }
    }

    createFlower(tigeRadius, posX, posZ, flowerType, flowerHeight, fAmplitude){
        const tigeDecalageX = this.prng() - 0.5 < 0 ? -1 : 1
        const tigeDecalageZ = this.prng() - 0.5 < 0 ? -1 : 1

        const tigeCurve = new THREE.CatmullRomCurve3(
            [
                new THREE.Vector3(posX,0,posZ),
                new THREE.Vector3(posX + this.prng() * tigeDecalageX * fAmplitude,flowerHeight*0.25,posZ + this.prng() * tigeDecalageZ * fAmplitude),
                new THREE.Vector3(posX + this.prng() * tigeDecalageX * fAmplitude,flowerHeight*0.5,posZ + this.prng() * tigeDecalageZ * fAmplitude),
                new THREE.Vector3(posX + this.prng() * tigeDecalageX * fAmplitude,flowerHeight*0.75,posZ + this.prng() * tigeDecalageZ * fAmplitude),
                new THREE.Vector3(posX + this.prng() * tigeDecalageX * fAmplitude,flowerHeight,posZ + this.prng() * tigeDecalageZ * fAmplitude)
            ]
        )

        const tigeGeometry = new THREE.TubeGeometry(tigeCurve,12,tigeRadius,24)
        const tigeMesh = new THREE.Mesh(tigeGeometry,this.tigeMat)
        this.scene.add(tigeMesh)

        if(flowerType === 1){
            let epinesCenterPoints = tigeCurve.getPoints(flowerHeight*1.5)

            for(let i = 0; i<epinesCenterPoints.length-1; i++){
                const epineGeometry = new THREE.ConeGeometry( tigeRadius*0.5, tigeRadius*3, 16 );
                epineGeometry.translate(0,tigeRadius*1.5,0)
                const epineMesh = new THREE.Mesh(epineGeometry,this.tigeMat) 
               
                epineMesh.position.set(epinesCenterPoints[i].x,epinesCenterPoints[i].y ,epinesCenterPoints[i].z)
                
                const tigeVector = new THREE.Vector3()
                const tigeNormal = tigeVector.subVectors(epinesCenterPoints[i+1],epinesCenterPoints[i]).normalize()

                const epineArbitraryVector = new THREE.Vector3(tigeNormal.x-(this.prng()-0.5)*Math.PI*0.5, tigeNormal.y-(this.prng()-0.5)*Math.PI*0.5, tigeNormal.z-(this.prng()-0.5)*Math.PI*0.5);

                const epinePerpendicularVector = new THREE.Vector3().crossVectors(tigeNormal,epineArbitraryVector)

                const epineQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),epinePerpendicularVector)
                epineMesh.applyQuaternion(epineQuaternion)
                
                this.scene.add(epineMesh)
            }

            const roseTopClone = this.resources.items.fleur_3.scene.children[0].clone()

            roseTopClone.position.set(epinesCenterPoints[epinesCenterPoints.length-1].x,epinesCenterPoints[epinesCenterPoints.length-1].y,epinesCenterPoints[epinesCenterPoints.length-1].z)

           const roseTopVector = new THREE.Vector3()
           const roseTopNormal = roseTopVector.subVectors(epinesCenterPoints[epinesCenterPoints.length-1],epinesCenterPoints[epinesCenterPoints.length-2]).normalize()

           const roseTopQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),roseTopNormal)
           roseTopClone.applyQuaternion(roseTopQuaternion)

           roseTopClone.scale.set(tigeRadius*5,tigeRadius*5,tigeRadius*5)

           roseTopClone.children[0].material = this.tigeMat
           roseTopClone.children[1].material = this.roseTopMaterial

           this.scene.add(roseTopClone)

           let leafCenterPoints = []

           for(let i=0; i<epinesCenterPoints.length/5; i++){
               leafCenterPoints.push(epinesCenterPoints[i*4])
           }

           for(let i = 0; i<leafCenterPoints.length; i++){
                const leafClone = this.resources.items.leaf.scene.children[0].children[0].children[0].children[0].clone()
                leafClone.position.set(leafCenterPoints[i].x,leafCenterPoints[i].y,leafCenterPoints[i].z)

                leafClone.scale.set(tigeRadius*(5+this.prng()*5),tigeRadius*(5+this.prng()*5),tigeRadius*(5+this.prng()*5))

                let leafVector = new THREE.Vector3()
                let leafNormal = leafVector.subVectors(epinesCenterPoints[i*4+1],epinesCenterPoints[i*4]).normalize()

                const leafArbitraryVector = new THREE.Vector3(leafNormal.x-(this.prng()-0.5)*Math.PI*0.5, leafNormal.y-(this.prng()-0.5)*Math.PI*0.5, leafNormal.z-(this.prng()-0.5)*Math.PI*0.5);

                const leafPerpendicularVector = new THREE.Vector3().crossVectors(leafNormal,leafArbitraryVector)

                const leafQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),leafPerpendicularVector)
                leafClone.applyQuaternion(leafQuaternion)

                leafClone.material = this.tigeMat
                

                this.scene.add(leafClone)
           }


        }

        if(flowerType === 2){
            const leafCenterPoints = tigeCurve.getPoints(flowerHeight * 1.5)
            
            for(let i = 0; i<leafCenterPoints.length-1; i++){
                const leafClone = this.resources.items.leaf.scene.children[0].children[0].children[0].children[0].clone()
                leafClone.position.set(leafCenterPoints[i].x,leafCenterPoints[i].y,leafCenterPoints[i].z)

                leafClone.scale.set(tigeRadius*(5+this.prng()*5),tigeRadius*(5+this.prng()*5),tigeRadius*(5+this.prng()*5))

                let leafVector = new THREE.Vector3()
                let leafNormal = leafVector.subVectors(leafCenterPoints[i+1],leafCenterPoints[i]).normalize()

                const leafArbitraryVector = new THREE.Vector3(leafNormal.x-(this.prng()-0.5)*Math.PI*0.5, leafNormal.y-(this.prng()-0.5)*Math.PI*0.5, leafNormal.z-(this.prng()-0.5)*Math.PI*0.5);

                const leafPerpendicularVector = new THREE.Vector3().crossVectors(leafNormal,leafArbitraryVector)

                const leafQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),leafPerpendicularVector)
                leafClone.applyQuaternion(leafQuaternion)

                leafClone.material = this.tigeMat
                

                this.scene.add(leafClone)
           }

           const paqueretteClone = this.resources.items.fleur_2.scene.children[0].clone()
           paqueretteClone.position.set(leafCenterPoints[leafCenterPoints.length-1].x,leafCenterPoints[leafCenterPoints.length-1].y,leafCenterPoints[leafCenterPoints.length-1].z)
           paqueretteClone.scale.set(tigeRadius * 5,tigeRadius * 5,tigeRadius * 5)

           const paqueretteTopVector = new THREE.Vector3()
           const paqueretteTopNormal = paqueretteTopVector.subVectors(leafCenterPoints[leafCenterPoints.length-1],leafCenterPoints[leafCenterPoints.length-2]).normalize()

           const paqueretteTopQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),paqueretteTopNormal)
           paqueretteClone.applyQuaternion(paqueretteTopQuaternion)

           console.log(paqueretteClone)
           paqueretteClone.children[0].material = this.paquerettePetaleMaterial
           paqueretteClone.children[1].material = this.paqueretteBoutonMaterial
           paqueretteClone.children[2].material = this.tigeMat



           this.scene.add(paqueretteClone)
        }

        if(flowerType === 3){
            const leafCenterPoints = tigeCurve.getPoints(flowerHeight * 1.5)
            
            for(let i = 0; i<leafCenterPoints.length-1; i++){
                const leafClone = this.resources.items.leaf.scene.children[0].children[0].children[0].children[0].clone()
                leafClone.position.set(leafCenterPoints[i].x,leafCenterPoints[i].y,leafCenterPoints[i].z)

                leafClone.scale.set(tigeRadius*(5+this.prng()*5),tigeRadius*(5+this.prng()*5),tigeRadius*(5+this.prng()*5))

                let leafVector = new THREE.Vector3()
                let leafNormal = leafVector.subVectors(leafCenterPoints[i+1],leafCenterPoints[i]).normalize()

                const leafArbitraryVector = new THREE.Vector3(leafNormal.x-(this.prng()-0.5)*Math.PI*0.5, leafNormal.y-(this.prng()-0.5)*Math.PI*0.5, leafNormal.z-(this.prng()-0.5)*Math.PI*0.5);

                const leafPerpendicularVector = new THREE.Vector3().crossVectors(leafNormal,leafArbitraryVector)

                const leafQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),leafPerpendicularVector)
                leafClone.applyQuaternion(leafQuaternion)

                leafClone.material = this.tigeMat
                

                this.scene.add(leafClone)
           }

           const fleurClone = this.resources.items.fleur_1.scene.children[0].clone()
           fleurClone.position.set(leafCenterPoints[leafCenterPoints.length-1].x,leafCenterPoints[leafCenterPoints.length-1].y,leafCenterPoints[leafCenterPoints.length-1].z)
           fleurClone.scale.set(tigeRadius * 5,tigeRadius * 5,tigeRadius * 5)

           const fleurTopVector = new THREE.Vector3()
           const fleurTopNormal = fleurTopVector.subVectors(leafCenterPoints[leafCenterPoints.length-1],leafCenterPoints[leafCenterPoints.length-2]).normalize()

           const fleurTopQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),fleurTopNormal)
           fleurClone.applyQuaternion(fleurTopQuaternion)

           fleurClone.children[0].material = this.fleurPetaleMaterial
           fleurClone.children[1].material = this.FleurBoutonMaterial
           fleurClone.children[2].material = this.tigeMat


           this.scene.add(fleurClone)
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

        const colors = this.generateColorPalette()

        this.tigeMat = new THREE.ShaderMaterial({
            vertexShader : toonVertex, 
            fragmentShader : toonFragment, 
            side:THREE.DoubleSide,
            uniforms : {
                uColor:{
                    value: new THREE.Color(colors[0])
                },
                uSpeed:{
                    value:0
                },
                ...THREE.UniformsLib.lights,
            },
            lights:true
        })

        this.roseTopMaterial = new THREE.ShaderMaterial({
            vertexShader : toonVertex, 
            fragmentShader : toonFragment, 
            side:THREE.DoubleSide,
            uniforms:{
                uColor:{
                    value: new THREE.Color(colors[1])
                },
                ...THREE.UniformsLib.lights,
            },
            lights:true
        })

        this.paquerettePetaleMaterial = new THREE.ShaderMaterial({
            vertexShader : toonVertex, 
            fragmentShader : toonFragment, 
            side:THREE.DoubleSide,
            uniforms:{
                uColor:{
                    value: new THREE.Color(colors[5])
                },
                ...THREE.UniformsLib.lights,
            },
            lights:true
        })

        this.paqueretteBoutonMaterial = new THREE.ShaderMaterial({
            vertexShader : toonVertex, 
            fragmentShader : toonFragment, 
            side:THREE.DoubleSide,
            uniforms:{
                uColor:{
                    value: new THREE.Color(colors[2])
                },
                ...THREE.UniformsLib.lights,
            },
            lights:true
        })

        this.fleurPetaleMaterial = new THREE.ShaderMaterial({
            vertexShader : toonVertex, 
            fragmentShader : toonFragment, 
            side:THREE.DoubleSide,
            uniforms:{
                uColor:{
                    value: new THREE.Color(colors[4])
                },
                ...THREE.UniformsLib.lights,
            },
            lights:true
        })

        this.FleurBoutonMaterial = new THREE.ShaderMaterial({
            vertexShader : toonVertex, 
            fragmentShader : toonFragment, 
            side:THREE.DoubleSide,
            uniforms:{
                uColor:{
                    value: new THREE.Color(colors[3])
                },
                ...THREE.UniformsLib.lights,
            },
            lights:true
        })

        


        

        this.mat2 = new THREE.MeshMatcapMaterial()
        this.mat2.matcap = this.matcap

        this.drawInstancedMesh(this.count,  this.guiParams.heightMax)
        this.scene.add(this.mesh)

        
        this.flowerMaterial()

        //this.drawFlowers()
        this.createFlowers()
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
