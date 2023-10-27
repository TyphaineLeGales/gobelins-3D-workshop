import * as THREE from 'three'
import Experience from './Experience.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Time from './Utils/Time.js'

export default class Camera
{
    constructor(_options)
    {
        // Options
        this.experience = new Experience()
        this.config = this.experience.config
        this.debug = this.experience.debug
        this.time = this.experience.time
        this.sizes = this.experience.sizes
        this.targetElement = this.experience.targetElement
        this.scene = this.experience.scene
        this.time = new Time()

        this.cameraPositionValue = Math.PI*0.75
        this.hasCameraPassedFirstRotaion = false
        this.hasCameraPassedSecond = false
        this.cameraPositionZoomValue = 70
        this.cameraPositionValueThird =Math.PI*1.49


        // Set up
        this.mode = 'debug' // defaultCamera \ debugCamera

        this.setInstance()
        this.setModes()
    }

    setInstance()
    {
        // Set up
        this.instance = new THREE.PerspectiveCamera(90, this.config.width / this.config.height, 0.1, 2500)
        this.instance.position.set(-100,10,-100)
        this.instance.lookAt(32,0,32)
        this.instance.rotation.reorder('YXZ')

        this.scene.add(this.instance)
    }

    setModes()
    {
        this.modes = {}

        // Default
        this.modes.default = {}
        this.modes.default.instance = this.instance.clone()
        this.modes.default.instance.rotation.reorder('YXZ')

        // Debug
        this.modes.debug = {}
        this.modes.debug.instance = this.instance.clone()
        this.modes.debug.instance.rotation.reorder('YXZ')
        this.modes.debug.instance.position.set(Math.sin(this.cameraPositionValue)*this.cameraPositionZoomValue+32, 20, Math.cos(this.cameraPositionValue)*this.cameraPositionZoomValue+32)
        this.modes.debug.instance.lookAt(32,0,32)
        
        //this.modes.debug.orbitControls = new OrbitControls(this.modes.debug.instance, this.targetElement)
        //this.modes.debug.orbitControls.target = new THREE.Vector3(32,0,32)
        //this.modes.debug.orbitControls.minAzimuthAngle = -Math.PI*0.25 + Math.PI*0.25
        //this.modes.debug.orbitControls.maxAzimuthAngle = Math.PI*0.25+ Math.PI*0.25
        //this.modes.debug.orbitControls.minPolarAngle = -Math.PI * 0.35
        //this.modes.debug.orbitControls.maxPolarAngle = Math.PI* 0.85 
        //this.modes.debug.orbitControls.enabled = this.modes.debug.active
        //this.modes.debug.orbitControls.screenSpacePanning = true
        //this.modes.debug.orbitControls.enableKeys = false
        //this.modes.debug.orbitControls.zoomSpeed = 0.25
        //this.modes.debug.orbitControls.enableDamping = true
        //this.modes.debug.orbitControls.maxDistance = 300
        //this.modes.debug.orbitControls.update()

      
    }


    resize()
    {
        this.instance.aspect = this.config.width / this.config.height
        this.instance.updateProjectionMatrix()

        this.modes.default.instance.aspect = this.config.width / this.config.height
        this.modes.default.instance.updateProjectionMatrix()

        this.modes.debug.instance.aspect = this.config.width / this.config.height
        this.modes.debug.instance.updateProjectionMatrix()
    }

    update()
    {
        if(this.cameraPositionValue<Math.PI*1.49 && !this.hasCameraPassedFirstRotaion){
            this.cameraPositionValue += 0.005
            this.modes.debug.instance.position.set(Math.sin(this.cameraPositionValue)*this.cameraPositionZoomValue+32, 20, Math.cos(this.cameraPositionValue)*this.cameraPositionZoomValue+32)
            this.modes.debug.instance.lookAt(32,0,32)
        }else{
            this.hasCameraPassedFirstRotaion = true
        }

        if(this.cameraPositionZoomValue > 5 && !this.hasCameraPassedSecond && this.hasCameraPassedFirstRotaion){
            this.cameraPositionZoomValue -= 0.2
            //console.log(this.cameraPositionZoomValue)
            this.modes.debug.instance.position.set(Math.sin(this.cameraPositionValue)*this.cameraPositionZoomValue+32, 20, Math.cos(this.cameraPositionValue)*this.cameraPositionZoomValue+32)
            //this.modes.debug.instance.lookAt(32,0,32)
        }

        

        if(this.hasCameraPassedFirstRotaion && this.cameraPositionZoomValue<7){
            this.hasCameraPassedSecond = true
        }

        if(this.hasCameraPassedSecond && this.cameraPositionZoomValue< 80){
            this.cameraPositionZoomValue += 0.1
            //console.log(this.cameraPositionZoomValue)
            this.modes.debug.instance.position.set(Math.sin(this.cameraPositionValue)*this.cameraPositionZoomValue+32, 20, Math.cos(this.cameraPositionValue)*this.cameraPositionZoomValue+32)
            this.modes.debug.instance.lookAt(32,(this.cameraPositionZoomValue-5)/4.33,32)
        }

        if(this.hasCameraPassedSecond && this.cameraPositionValue < Math.PI * 3){
            this.cameraPositionValue += 0.02
        }

        //console.log(this.time)
        
        
        // Update debug orbit controls
        //this.modes.debug.orbitControls.update()

        // Apply coordinates
        this.instance.position.copy(this.modes[this.mode].instance.position)
        this.instance.quaternion.copy(this.modes[this.mode].instance.quaternion)
        this.instance.updateMatrixWorld() // To be used in projection


    }

    destroy()
    {
        this.modes.debug.orbitControls.destroy()
    }
}
