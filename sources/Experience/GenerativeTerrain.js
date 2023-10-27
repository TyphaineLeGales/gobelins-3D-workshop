import * as THREE from 'three'
import { 
    getRandomInt, 
    getRandomFloat, 
    clamp, 
    mapRange, 
    easeOutQuart, 
    HSLToHex
} from './Utils/Math.js'
import Alea from 'alea'
import toonFragment from './shaders/toon.frag?raw' 
import toonVertex from './shaders/toon.vert?raw'
import animatedToonFrag from './shaders/animatedToon.frag?raw' 
import animatedToonVert from './shaders/animatedToon.vert?raw'

import clearColorVert from './shaders/clearColor.vert?raw'
import clearColorFrag from './shaders/clearColor.frag?raw'


export default class GenerativeTerrain {
    constructor(camera, gui, resources) {
        this.width = 1;
        this.resources = resources
        this.mapSize = 64;
        this.count = this.mapSize*this.mapSize;
        this.heightMax = 10
        this.gui = gui;
        this.matcap = resources.matcap
        this.planeOffset = 7
        this.positionRange = 5.0
        this.shouldSetToVisible = true;
        this.buildingDensity = 0.5;
        this.flowerDensity = 0.15;
        this.emptyDensity = 0.8;
        this.animDuration = 3;
        this.flowerMeshPositions = []
        this.flowerAmplitude = 1.5
        this.flowerMaterials = {}
        this.delayMax = 6
        this.camera = camera
        
        this.animationIsDone = false
        this.statAnimationDelay = 3;
        this.animationTime = 0;
        
        this.guiParams = {
            width : this.width,
            count: this.count,
            heightMax : this.heightMax,
            grainAmount : 1.0, 
            positionRange : 5.0, 
            planeOffset : this.planeOffset,
            flowerHeightMax : this.flowerHeightMax,
            buildingDensity: 0.25, 
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

    setClearColorCube(){
        const cccGeo = new THREE.BoxGeometry(700,700,700)
        this.cccMat = new THREE.ShaderMaterial({
            vertexShader:clearColorVert,
            fragmentShader:clearColorFrag,
            side:THREE.DoubleSide,
            uniforms:{
                uTime:{
                    value:0
                }
            }
        })

        const clearColorCube = new THREE.Mesh(cccGeo,this.cccMat)
        clearColorCube.name = 'clearcolorcube'
        this.scene.add(clearColorCube)
    }

    

    getRandCellState () {
        const stateIndex = Math.round(this.prng()*this.weightedStates.length)
        return this.weightedStates[stateIndex]
    }

    guiSetup () {

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



    generateColorPalette(){
        let colorPalette = []

        let tigeColorHSL = Math.round(this.prng()*359) % 359
        let roseTopColorHSL = Math.round(tigeColorHSL + 90 + ((this.prng() - 0.5)*40)) % 359
        let paqueretteBoutonColorHSL = Math.round(tigeColorHSL + 144 + ((this.prng() - 0.5)*40)) % 359
        let fleurBoutonColorHSL = Math.round(tigeColorHSL + 180 + ((this.prng() - 0.5)*40)) % 359
        let fleurTopColorHSL = Math.round(tigeColorHSL + 216 + ((this.prng() - 0.5)*40)) % 359
        let paqueretteTopColorHSL = Math.round(tigeColorHSL + 270 + ((this.prng() - 0.5)*40)) % 359

        colorPalette.push(HSLToHex(tigeColorHSL,(this.prng()*40)+60,(this.prng()*45)+45))
        colorPalette.push(HSLToHex(roseTopColorHSL,(this.prng()*40)+60,(this.prng()*45)+45))
        colorPalette.push(HSLToHex(paqueretteBoutonColorHSL,100,(this.prng()*45)+45))
        colorPalette.push(HSLToHex(fleurBoutonColorHSL,(this.prng()*40)+60,(this.prng()*45)+45))
        colorPalette.push(HSLToHex(fleurTopColorHSL,(this.prng()*40)+60,(this.prng()*45)+45))
        colorPalette.push(HSLToHex(paqueretteTopColorHSL,(this.prng()*40)+60,(this.prng()*45)+45))

        return colorPalette
    }


    flowerMaterial () {
        this.mat = new THREE.ShaderMaterial({
            vertexShader : toonVertex, 
            fragmentShader : toonFragment, 
            uniforms : {
                uColor:{
                    value: new THREE.Color('#3b82f6')
                },
                ...THREE.UniformsLib.lights,
            },
            lights:true

        })
        
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

    initFlowerMaterials () {
        this.flowerMaterials.roseTop = new THREE.ShaderMaterial({
            vertexShader : toonVertex, 
            fragmentShader : toonFragment, 
            side:THREE.DoubleSide,
            uniforms:{
                uColor:{
                    value: new THREE.Color(this.colors[1])
                },
                ...THREE.UniformsLib.lights,
            },
            lights:true
        })

        this.flowerMaterials.paquerettePetale = new THREE.ShaderMaterial({
            vertexShader : toonVertex, 
            fragmentShader : toonFragment, 
            side:THREE.DoubleSide,
            uniforms:{
                uColor:{
                    value: new THREE.Color(this.colors[5])
                },
                ...THREE.UniformsLib.lights,
            },
            lights:true
        })

        this.flowerMaterials.paqueretteBouton = new THREE.ShaderMaterial({
            vertexShader : toonVertex, 
            fragmentShader : toonFragment, 
            side:THREE.DoubleSide,
            uniforms:{
                uColor:{
                    value: new THREE.Color(this.colors[2])
                },
                ...THREE.UniformsLib.lights,
            },
            lights:true
        })

        this.flowerMaterials.fleurPetale = new THREE.ShaderMaterial({
            vertexShader : toonVertex, 
            fragmentShader : toonFragment, 
            side:THREE.DoubleSide,
            uniforms:{
                uColor:{
                    value: new THREE.Color(this.colors[4])
                },
                ...THREE.UniformsLib.lights,
            },
            lights:true
        })

        this.flowerMaterials.fleurBouton = new THREE.ShaderMaterial({
            vertexShader : toonVertex, 
            fragmentShader : toonFragment, 
            side:THREE.DoubleSide,
            uniforms:{
                uColor:{
                    value: new THREE.Color(this.colors[3])
                },
                ...THREE.UniformsLib.lights,
            },
            lights:true
        })



    }

    computeCellStates () {
        this.initWeightedStates()
        this.initMap()
        
    }

    patchTopBuildingMaterial() {
        this.topBuildingMat.onBeforeCompile = function(shader) {
            shader.vertexShader = shader.vertexShader.replace('void main() {', [
                'varying vec2 vUv;',
                'varying float vPosition;',
                'void main() {',
                'vPosition = position.y;',
                'vUv = uv;'
                ].join('\n'));

            shader.fragmentShader = shader.fragmentShader.replace('void main() {', [
            'varying vec2 vUv;',
            'varying float vPosition;',
            'void main() {',
            ].join('\n'));

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <output_fragment>',
                [
                    'outgoingLight = vec3(vPosition+0.3);',
                    'outgoingLight = vec3(1.0 - outgoingLight)  ;',
                    '#include <output_fragment>', 
                ].join( '\n' )
            );
            this.userData.shader = shader;
        }
    }



    patchBottomBuildingMaterial() {
        this.bottomBuildingMat.onBeforeCompile = function(shader) {
            shader.vertexShader = shader.vertexShader.replace('void main() {', [
                'varying vec2 vUv;',
                'varying float vPosition;',
                'void main() {',
                'vPosition = position.y;',
                'vUv = uv;'
                ].join('\n'));

            shader.fragmentShader = shader.fragmentShader.replace('void main() {', [
            'varying vec2 vUv;',
            'varying float vPosition;',
            'void main() {',
            ].join('\n'));

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <output_fragment>',
                [
                    'outgoingLight = vec3(vPosition+0.7);',
                    '#include <output_fragment>', 
                ].join( '\n' )
            );
            this.userData.shader = shader;
        }
    }



    drawInstancedMesh (count, heightMax) {
        const obj = new THREE.Object3D()
        const box = new THREE.BoxGeometry()
        this.bottomBuildingMat = new THREE.MeshMatcapMaterial()
        this.bottomBuildingMat.matcap = this.matcap
        this.topBuildingMat = new THREE.MeshMatcapMaterial()
        this.topBuildingMat.matcap = this.matcap
        this.patchTopBuildingMaterial()
        this.patchBottomBuildingMaterial()
        

        let tempMap = [...this.map]

        this.topMesh = new THREE.InstancedMesh(box,this.topBuildingMat,count)
        this.topMesh.instanceMatrix.setUsage( THREE.DynamicDrawUsage )

        for(let i = 0; i < this.map.length; i++){
            if(tempMap[i].state === "building") {

                const positions = tempMap[i].position

                // get info from map
                const height = this.prng()*this.heightMax
                obj.position.set(positions.x, height/2, positions.z)

                const scaleX = this.prng()*1.9+0.1
                const scaleZ = this.prng()*1.9+0.1
                obj.scale.set(scaleX, height, scaleZ)
            } 

            obj.updateMatrix()
            this.topMesh.setMatrixAt(i, obj.matrix)
        }

        this.topMesh.instanceMatrix.needsUpdate = true
        this.scene.add(this.topMesh)


        // bottom
        this.mesh = new THREE.InstancedMesh(box, this.bottomBuildingMat, count*2)
        this.mesh.instanceMatrix.setUsage( THREE.DynamicDrawUsage ) // will be updated every frame
        for(let i = 0; i < this.map.length; i++){

            const positions = tempMap[i].position
            
            const height = (((Math.abs(positions.x-this.mapSize*0.5)*-1)/(this.mapSize*0.5)+1)*this.prng()*this.heightMax*5 + ((Math.abs(positions.z-this.mapSize*0.5)*-1)/(this.mapSize*0.5)+1)*this.prng()*this.heightMax*5)*0.5
            obj.position.set(positions.x, -height/2, positions.z)
            const scaleX = this.prng()*2.9+0.1
            const scaleZ = this.prng()*2.9+0.1
            obj.scale.set(scaleX, height, scaleZ)

            obj.updateMatrix()
            this.mesh.setMatrixAt(i, obj.matrix)
        }
        
        this.mesh.instanceMatrix.needsUpdate = true
        this.scene.add(this.mesh)
        this.map = tempMap
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

    createFlowers() {
        for(let i =0; i<this.map.length; i++){
            if(this.map[i].state === "flower"){
                const currCell = this.map[i]
                const radius = (this.prng()*0.3)+0.1
                const flowerType = Math.floor((this.prng()*3)+1)
                const flowerHeight = (this.prng()*this.heightMax)+3
                const fAmplitude = this.prng()*this.flowerAmplitude
                this.createFlower(radius,currCell.position.x,currCell.position.z,flowerType, flowerHeight,fAmplitude)
            }
        }
    }

    createLeaf (currPoint,nextPoint, tigeRadius, model, height) {
       
        const leafClone = model.clone()
        leafClone.name = 'leaf'
        leafClone.userData = {
            vitesseMontee:this.prng()*5, 
            hauteurMax:this.prng()*15,
            vitesseRotation:this.prng()*0.1,
            sensRotation: this.prng() < 0.5 ? -1 : 1
        }
        currPoint && leafClone.position.set(0,currPoint.y, 0) 
        const scale = tigeRadius*(3+this.prng()*2)
        leafClone.scale.set(scale,scale,scale)
        let leafVector = new THREE.Vector3()
        let leafNormal = nextPoint ? leafVector.subVectors(currPoint,nextPoint).normalize() : leafVector
        const leafArbitraryVector = new THREE.Vector3(leafNormal.x-(this.prng()-0.5)*Math.PI*0.5, leafNormal.y-(this.prng()-0.5)*Math.PI*0.5, leafNormal.z-(this.prng()-0.5)*Math.PI*0.5);
        const leafPerpendicularVector = new THREE.Vector3().crossVectors(leafNormal,leafArbitraryVector)
        const leafQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),leafPerpendicularVector)
        leafClone.applyQuaternion(leafQuaternion)
        const randMat = Math.round(this.prng()*2)
        leafClone.material = randMat > 1 ?  this.flowerMaterials.roseTop : this.flowerMaterials.paquerettePetale
        // leafClone.visible = false // init invisible waiting for the anim to start
        return leafClone
    }

    getFlowerQuaternion (lastPoint, beforeLastPoint) {
        const normal = new THREE.Vector3().subVectors(lastPoint,beforeLastPoint).normalize()
        return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal)
    }

    createFlower(tigeRadius, posX, posZ, flowerType, flowerHeight, fAmplitude){
        const tigeDecalageX = this.prng() - 0.5 < 0 ? -1 : 1
        const tigeDecalageZ = this.prng() - 0.5 < 0 ? -1 : 1
        const tigeCurve = new THREE.CatmullRomCurve3(
            [
                new THREE.Vector3(posX,0,posZ),
                new THREE.Vector3(posX + this.prng() * tigeDecalageX * fAmplitude,flowerHeight*0.25,posZ + this.prng() * tigeDecalageZ * fAmplitude),
                new THREE.Vector3(posX + this.prng() * tigeDecalageX * fAmplitude,flowerHeight*0.5,posZ +this.prng() * tigeDecalageZ * fAmplitude),
                new THREE.Vector3(posX + this.prng() * tigeDecalageX * fAmplitude,flowerHeight*0.75,posZ +this.prng() * tigeDecalageZ * fAmplitude),
                new THREE.Vector3(posX + this.prng() * tigeDecalageX * fAmplitude,flowerHeight,posZ +this.prng() * tigeDecalageZ * fAmplitude)
            ]
        )
        const tigeGeometry = new THREE.TubeGeometry(tigeCurve,12,tigeRadius,24)
        const delay = this.prng()*this.delayMax
        const delayAttribute = new Float32Array( tigeGeometry.attributes.position.count );

        const targetPos = flowerHeight;
        const targetPosAttribute = new Float32Array(tigeGeometry.attributes.position.count);
		const growDirectionAttribute = new Float32Array(tigeGeometry.attributes.position.count)		
        for ( let i = 0; i < delayAttribute.length; i ++ ) {
            delayAttribute[ i ] = delay;
            targetPosAttribute[i] = targetPos;
            growDirectionAttribute[i] = 1;

        }

		tigeGeometry.setAttribute( 'delay', new THREE.BufferAttribute( delayAttribute, 1 ) );
        tigeGeometry.setAttribute( 'targetPos', new THREE.BufferAttribute( targetPosAttribute, 1 ) );
        tigeGeometry.setAttribute( 'growDirection', new THREE.BufferAttribute( growDirectionAttribute, 1 ) );
        
        const splinePoints = tigeCurve.getPoints(flowerHeight * 1.5)
        const lastSplinePoint = splinePoints[splinePoints.length-1]
        const beforeLastSplinePoint = splinePoints[splinePoints.length-2]
        const scale = tigeRadius * 5
        const flowerGroup = new THREE.Group()
        const animationGroup = new THREE.Group()
        const leafModel = this.resources.items.leaf.scene.children[0].children[0].children[0].children[0]
        
        const tigeMesh = new THREE.Mesh(tigeGeometry,this.tigeMat)
        flowerGroup.add(tigeMesh)

        if(flowerType === 1){
            // rose top
           const roseTopClone = this.resources.items.fleur_3.scene.children[0].clone()
           roseTopClone.applyQuaternion(this.getFlowerQuaternion(lastSplinePoint,beforeLastSplinePoint))

           roseTopClone.children[0].material = this.flowerMaterials.roseTop
            roseTopClone.children[1].material = this.flowerMaterials.roseTop
            animationGroup.add(roseTopClone)

           //leaves 
           let leafCenterPoints = []
           leafCenterPoints.push(splinePoints[2], splinePoints[8])
           for(let i = 0; i<leafCenterPoints.length; i++){
                animationGroup.add(this.createLeaf(leafCenterPoints[i], leafCenterPoints[i+1], tigeRadius, leafModel,flowerHeight))
            }
        }

        if(flowerType === 2) {
            for(let i = 0; i<splinePoints.length-1; i++){
                animationGroup.add(this.createLeaf(splinePoints[i], splinePoints[i+1], tigeRadius, leafModel,flowerHeight))
           }
            const paqueretteClone = this.resources.items.fleur_2.scene.children[0].clone()
            paqueretteClone.applyQuaternion(this.getFlowerQuaternion(lastSplinePoint,beforeLastSplinePoint))
            paqueretteClone.children[0].material = this.flowerMaterials.paquerettePetale
            paqueretteClone.children[1].material = this.flowerMaterials.paqueretteBouton
            paqueretteClone.children[2].material = this.flowerMaterials.paquerettePetale
            animationGroup.add(paqueretteClone)
        }

        if(flowerType === 3) {
            const fleurClone = this.resources.items.fleur_1.scene.children[0].clone()
            fleurClone.applyQuaternion(this.getFlowerQuaternion(lastSplinePoint,beforeLastSplinePoint))
            fleurClone.children[0].material =  this.flowerMaterials.fleurPetale
            fleurClone.children[1].material =  this.flowerMaterials.fleurBouton
            fleurClone.children[2].material = this.flowerMaterials.fleurPetale
            animationGroup.add(fleurClone)
        }

        animationGroup.position.set(lastSplinePoint.x,0,lastSplinePoint.z)
        animationGroup.scale.set(0, 0, 0)

         // set target values for animation
        animationGroup.userData.targetPosY = lastSplinePoint.y;
        animationGroup.userData.targetScale = scale
    
        animationGroup.userData.animationOffset = delay

        flowerGroup.add(animationGroup)
        this.scene.add(flowerGroup)
        this.flowersInScene.push(flowerGroup)

    }

    drawRoots () {

        const fAmplitude = this.prng()*this.flowerAmplitude
        const tigeDecalage = this.prng() - 0.5 < 0 ? -1 : 1
        
        for(let i = 0; i < this.map.length; i++){
            if(this.map[i].state === "flower") {
                const height = -(this.prng()*this.heightMax*3)
                const positions = this.map[i].position
                const posX = positions.x
                const posZ = positions.z
                const radius = (this.prng()*0.3)+0.1
                const randOffset = () => this.prng() * tigeDecalage * fAmplitude
                const rootCurve = new THREE.CatmullRomCurve3(
                    [
                        new THREE.Vector3(posX,0,posZ),
                        new THREE.Vector3(posX - randOffset(),height*0.25,posZ + randOffset()),
                        new THREE.Vector3(posX - randOffset(),height*0.5,posZ +randOffset()),
                        new THREE.Vector3(posX - randOffset(),height*0.75,posZ +randOffset()),
                        new THREE.Vector3(posX - randOffset(),height,posZ +randOffset())
                    ]
                )
             
                const rootGeo = new THREE.TubeGeometry(rootCurve,12,radius,24)

                
                // set attributes
                const delay = getRandomFloat(0, this.delayMax)
                const delayAttribute = new Float32Array( rootGeo.attributes.position.count );
                
                const targetPos = height;
                const targetPosAttribute = new Float32Array(rootGeo.attributes.position.count);
                const growDirectionAttribute = new Float32Array(rootGeo.attributes.position.count)		
                for ( let i = 0; i < delayAttribute.length; i ++ ) {
                    delayAttribute[ i ] = delay;
                    targetPosAttribute[i] = targetPos;
                    growDirectionAttribute[i] = -1;
                }
                
                rootGeo.setAttribute( 'delay', new THREE.BufferAttribute( delayAttribute, 1 ) );
                rootGeo.setAttribute( 'targetPos', new THREE.BufferAttribute( targetPosAttribute, 1 ) );
                rootGeo.setAttribute( 'growDirection', new THREE.BufferAttribute( growDirectionAttribute, 1 ) );
                const mesh = new THREE.Mesh(rootGeo,this.tigeMat)
                
                // mesh.position.y -= height

                this.scene.add(mesh)
            }
        }

    }

    
    
    init () {
        const ambient = new THREE.AmbientLight(0xffffff, 0.4)
        const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
        directionalLight.position.set(3, 5, 5)
        directionalLight.lookAt(0, 0, 0)
        this.scene.add(directionalLight, ambient );

    
        
        //this.guiSetup()
        this.computeCellStates()

        this.setClearColorCube()

        // set base cube 
        // let baseCube = new THREE.Mesh(new THREE.BoxGeometry(this.mapSize+1, 0.5, this.mapSize+1), new THREE.MeshStandardMaterial({color:new THREE.Color('#CACBCD')}))
        // baseCube.position.x += this.mapSize/2
        // baseCube.position.z += this.mapSize/2
        // this.scene.add(baseCube)


        this.colors = this.generateColorPalette()

        this.tigeMat = new THREE.ShaderMaterial({
            vertexShader : animatedToonVert, 
            fragmentShader: animatedToonFrag, 
            uniforms: {
                uColor:{
                    value: new THREE.Color(this.colors[0])
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
        this.initFlowerMaterials()
        this.createFlowers()
        this.drawRoots()
        // this.patchRootMat()
    }

    animateFlower (flowerPart,time) {
        flowerPart.position.y = mapRange(time -flowerPart.userData.animationOffset, 0, this.animDuration, 0, flowerPart.userData.targetPosY)
      
        const currScale = clamp(mapRange(time - flowerPart.userData.animationOffset, 0, this.animDuration, 0, flowerPart.userData.targetScale), 0, flowerPart.userData.targetScale)
        flowerPart.scale.set(currScale, currScale, currScale)
    }

    update(time) {

        

        
        if(time > this.animDuration + this.delayMax) {
            this.animationIsDone = true
        }
        
        if(time > this.statAnimationDelay ) {
               
                this.animationTime = time - this.statAnimationDelay
                
                if(this.flowersInScene.length > 0 && !this.animationIsDone ) {
                    this.flowersInScene.forEach(flower => {
                        const toAnimate =  flower.children[1]
                        if(this.animationTime < toAnimate.userData.animationOffset + this.animDuration )this.animateFlower(toAnimate,  this.animationTime)
                    });
            }
            
            
            this.scene.traverse(o=>{
                if(o.isMesh){
                    if(o.name === 'leaf'){
                        o.position.y = ((this.animationTime)*o.userData.vitesseMontee)%o.userData.hauteurMax
                        o.rotation.y += o.userData.vitesseRotation * o.userData.sensRotation
                    }
                }
                if(o.name ==="clearcolorcube"){
                    o.rotation.y += 0.01
                }
            })
        }
        if(this.tigeMat) {
            this.tigeMat.uniforms.uSpeed.value = this.animationTime // calc speed based on time
        
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
