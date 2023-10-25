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
        this.flowerHeightMax =  8
        this.buildingDensity = 0.5;
        this.flowerDensity = 0.15;
        this.emptyDensity = 0.8;
        this.animDuration = 3;
        this.flowerMeshPositions = []
        this.animationIsDone = false
        this.flowerAmplitude = 1.5
        this.flowerMaterials = {}
        this.delayMax = 6
        this.camera = camera
        
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

    getRandCellState () {
        const stateIndex = getRandomInt(0, this.weightedStates.length)
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

    patchBuildingMaterial() {
       
        this.buildingMat.onBeforeCompile = function(shader) {
            // shader.uniforms.uPointTex = {value : tex}

            shader.fragmentShader = shader.fragmentShader.replace('void main() {', [
            // 'uniform sampler2D uPointTex;', 
            'void main() {',
            
            ].join('\n'));
            
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <output_fragment>',
                [
                    // 'vec4 col = texture2D(uPointTex, uv);',
                    // 'outgoingLight.r = mix(outgoingLight.r, col.r, 0.8);',
                    // 'outgoingLight.b = mix(outgoingLight.b, col.b, 0.3);',
                    // 'outgoingLight.g = 0.1;',
                    // 'outgoingLight.r = 0.1;',
                    // 'outgoingLight.rgb = mix(outgoingLight.rgb, col.rgb, vec3(0.5))',
                    
                    '#include <output_fragment>', 
                    
                ].join( '\n' )
            );
            this.userData.shader = shader;
        }
    }

    drawInstancedMesh (count, heightMax) {
        const obj = new THREE.Object3D()
        const box = new THREE.BoxGeometry()


        this.buildingMat = new THREE.MeshMatcapMaterial()
        this.buildingMat.matcap = this.matcap

        this.patchBuildingMaterial()

        let tempMap = [...this.map]

   
        this.mesh = new THREE.InstancedMesh(box, this.buildingMat, count*2)
        this.mesh.instanceMatrix.setUsage( THREE.DynamicDrawUsage ) // will be updated every frame
        for(let i = 0; i < this.map.length; i++){

            const positions = tempMap[i].position
  
            // get info from map
            const height = Math.random()*this.heightMax*3
            obj.position.set(positions.x, -height/2, positions.z)
            
            const scaleX = getRandomFloat(0.1, 3)
            const scaleZ = getRandomFloat(0.1, 3)
            obj.scale.set(scaleX, height, scaleZ)
            
            
            obj.updateMatrix()
            this.mesh.setMatrixAt(i, obj.matrix)
           
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

        ///////

        // const buildingGeometry = new THREE.BoxGeometry()


        // for(let i = 0; i<this.map.length; i++){
        //     if(tempMap[i].state === "building"){
        //         const buildingClone = buildingGeometry.clone()

        //         const position = tempMap[i].position


        //         const height = Math.random()*heightMax
        //         const scaleX = Math.random()*3
        //         const scaleZ = Math.random()*3

        //         const buildingMesh = new THREE.Mesh(buildingClone, buildingMaterial)

        //         buildingMesh.position.set(position.x, height/2, position.z)
        //         buildingMesh.scale.set(scaleX,height,scaleZ)

        //         this.scene.add(buildingMesh)
        //     }
        // }
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
                const flowerHeight = (this.prng()*7)+3
                const fAmplitude = this.prng()*this.flowerAmplitude
                this.createFlower(radius,currCell.position.x,currCell.position.z,flowerType, flowerHeight,fAmplitude)
            }
        }
    }

    createLeaves (currPoint,nextPoint, tigeRadius, flowerGroup) {
        const leafModel = this.resources.items.leaf.scene.children[0].children[0].children[0].children[0]
        const leafClone = leafModel.clone()
        leafClone.position.set(currPoint.position)
        const scale = tigeRadius*(5+this.prng()*5)
        leafClone.scale.set(scale,scale,scale)
        let leafVector = new THREE.Vector3()
        let leafNormal = nextPoint ? leafVector.subVectors(currPoint,nextPoint).normalize() : leafVector
        const leafArbitraryVector = new THREE.Vector3(leafNormal.x-(this.prng()-0.5)*Math.PI*0.5, leafNormal.y-(this.prng()-0.5)*Math.PI*0.5, leafNormal.z-(this.prng()-0.5)*Math.PI*0.5);
        const leafPerpendicularVector = new THREE.Vector3().crossVectors(leafNormal,leafArbitraryVector)
        const leafQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),leafPerpendicularVector)
        leafClone.applyQuaternion(leafQuaternion)
        leafClone.material = this.tigeMat
        flowerGroup.add(leafClone)
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
                new THREE.Vector3(posX + this.prng() * tigeDecalageX * fAmplitude,flowerHeight*0.5,posZ + this.prng() * tigeDecalageZ * fAmplitude),
                new THREE.Vector3(posX + this.prng() * tigeDecalageX * fAmplitude,flowerHeight*0.75,posZ + this.prng() * tigeDecalageZ * fAmplitude),
                new THREE.Vector3(posX + this.prng() * tigeDecalageX * fAmplitude,flowerHeight,posZ + this.prng() * tigeDecalageZ * fAmplitude)
            ]
        )
        const tigeGeometry = new THREE.TubeGeometry(tigeCurve,12,tigeRadius,24)
        const delay = getRandomFloat(0, this.delayMax)
        const delayAttribute = new Float32Array( tigeGeometry.attributes.position.count );

        const targetPos = flowerHeight;
        const targetPosAttribute = new Float32Array(tigeGeometry.attributes.position.count);
				
        for ( let i = 0; i < delayAttribute.length; i ++ ) {
            delayAttribute[ i ] = delay;
            targetPosAttribute[i] = targetPos;
        }

		tigeGeometry.setAttribute( 'delay', new THREE.BufferAttribute( delayAttribute, 1 ) );
        tigeGeometry.setAttribute( 'targetPos', new THREE.BufferAttribute( targetPosAttribute, 1 ) );
        
        const tigeMesh = new THREE.Mesh(tigeGeometry,this.tigeMat)
        this.scene.add(tigeMesh)
        
        const splinePoints = tigeCurve.getPoints(flowerHeight * 1.5)
        const lastSplinePoint = splinePoints[splinePoints.length-1]
        const beforeLastSplinePoint = splinePoints[splinePoints.length-2]
        const scale = tigeRadius * 5
        const flowerGroup = new THREE.Group()
        

        if(flowerType === 1){
            // creation des épines
    
            for(let i = 0; i<splinePoints.length-1; i++){
                const currPoint = splinePoints[i]
                const epineGeometry = new THREE.ConeGeometry( tigeRadius*0.5, tigeRadius*3, 16 );
                epineGeometry.translate(0,tigeRadius*1.5,0)
                const epineMesh = new THREE.Mesh(epineGeometry,this.tigeMat) 
                epineMesh.position.set(currPoint.x,0 ,currPoint.z)
                const tigeVector = new THREE.Vector3()
                const tigeNormal = tigeVector.subVectors(splinePoints[i+1],currPoint).normalize()
                const epineArbitraryVector = new THREE.Vector3(tigeNormal.x-(this.prng()-0.5)*Math.PI*0.5, tigeNormal.y-(this.prng()-0.5)*Math.PI*0.5, tigeNormal.z-(this.prng()-0.5)*Math.PI*0.5);
                const epinePerpendicularVector = new THREE.Vector3().crossVectors(tigeNormal,epineArbitraryVector)
                const epineQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),epinePerpendicularVector)
                epineMesh.applyQuaternion(epineQuaternion)
                flowerGroup.add(epineMesh)
            }

            // rose top
           const roseTopClone = this.resources.items.fleur_3.scene.children[0].clone()
           roseTopClone.applyQuaternion(this.getFlowerQuaternion(lastSplinePoint,beforeLastSplinePoint))

           roseTopClone.children[0].material = this.tigeMat
           roseTopClone.children[1].material = this.flowerMaterials.roseTop
           flowerGroup.add(roseTopClone)

           //leafes 
           let leafCenterPoints = []

           for(let i=0; i<splinePoints.length/5; i++){
               leafCenterPoints.push(splinePoints[i*4])
           }

           for(let i = 0; i<leafCenterPoints.length; i++){
                this.createLeaves(leafCenterPoints[i], leafCenterPoints[i+1], tigeRadius, flowerGroup)
            }

        }

        if(flowerType === 2) {
            
            for(let i = 0; i<splinePoints.length-1; i++){
                this.createLeaves(splinePoints[i], splinePoints[i+1], tigeRadius, flowerGroup)
           }

           // paquerette top 
           const paqueretteClone = this.resources.items.fleur_2.scene.children[0].clone()

           paqueretteClone.applyQuaternion(this.getFlowerQuaternion(lastSplinePoint,beforeLastSplinePoint))
           
           paqueretteClone.children[0].material = this.flowerMaterials.paquerettePetale
           paqueretteClone.children[1].material = this.flowerMaterials.paqueretteBouton
           paqueretteClone.children[2].material = this.tigeMat

           flowerGroup.add(paqueretteClone)
        }

        if(flowerType === 3) {
            
       
           const fleurClone = this.resources.items.fleur_1.scene.children[0].clone()
           fleurClone.applyQuaternion(this.getFlowerQuaternion(lastSplinePoint,beforeLastSplinePoint))

           fleurClone.children[0].material =  this.flowerMaterials.fleurPetale
           fleurClone.children[1].material =  this.flowerMaterials.fleurBouton

           fleurClone.children[2].material = this.tigeMat
           flowerGroup.add(fleurClone)
        }

        flowerGroup.position.set(lastSplinePoint.x,0,lastSplinePoint.z)
        flowerGroup.scale.set(scale, scale,scale)

        // pass data for animation
         // set target values for animation
        flowerGroup.userData.targetPosY = lastSplinePoint.y;
        flowerGroup.userData.targetScale = scale
    
        flowerGroup.userData.animationOffset = delay
        //init at zero
        // flowerTop.position.set(lastPoint.x,lastPoint.y,lastPoint.z);
        // flowerTop.scale.set(0, 0, 0);
        
        this.scene.add(flowerGroup)
        this.flowersInScene.push(flowerGroup)

    }
    
    init () {
        const ambient = new THREE.AmbientLight(0xffffff, 0.4)
        const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
        directionalLight.position.set(3, 5, 5)
        directionalLight.lookAt(0, 0, 0)
        this.scene.add( directionalLight, ambient );

        
        this.guiSetup()
        this.computeCellStates()

        this.colors = this.generateColorPalette()

        this.tigeMat = new THREE.ShaderMaterial({
            vertexShader : animatedToonVert, 
            fragmentShader: animatedToonFrag, 
            uniforms: {
                uColor:{
                    value: new THREE.Color('#3b82f6')
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
    }

    animateFlower (flower,time) {
        flower.position.y = mapRange(time - flower.userData.animationOffset, 0, this.animDuration, 0, flower.userData.targetPosY)
        // const currScale = mapRange(time - flower.userData.animationOffset, 0, this.animDuration, 0, flower.userData.targetScale)
        // flower.scale.set(currScale, currScale, currScale)
    }

    update(time) {

        if(time > this.animDuration + this.delayMax) {
            this.animationIsDone = true
        }
       
        if(this.tigeMat.uniforms ) {

            // easeOutQuart
            
            this.tigeMat.uniforms.uSpeed.value = time // calc speed based on time
        }
        
        if(this.flowersInScene.length > 0  && !this.animationIsDone ) {
            console.log("is animating")
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
