import * as THREE from 'three'
import Experience from './Experience.js'
import frag2D from './shaders/2D.frag'
import vert2D from './shaders/2D.vert'

export default class World
{
    constructor(_options)
    {
        this.experience = new Experience()
        this.config = this.experience.config
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = window.performance.now()
   
        
        this.resources.on('groupEnd', (_group) =>
        {
            if(_group.name === 'base')
            {
                // this.setDummy()
                this.setup()
            }
        })
    }

    setDummy()
    {
        this.resources.items.lennaTexture.encoding = THREE.sRGBEncoding
        
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ map: this.resources.items.lennaTexture })
        )
        this.scene.add(cube)        
    }

    addRock() {
        const rock = this.resources.items.rock;
        this.scene.add(rock.scene)
    }

    addAnimatedCharacter () {
        const perso = this.resources.items.character
        const matcapMat = new THREE.MeshMatcapMaterial({
            matcap: this.resources.items.matcap
        })
        const mesh = perso.scene
        mesh.traverse(o => {
            if(o.isMesh) {
                o.material = matcapMat
                o.position.x = 0.1
                o.position.y -= 0.1
            }
        })
        this.mixer = new THREE.AnimationMixer(mesh)
        const animation = perso.animations[0]
        const action = this.mixer.clipAction(animation);
        action.play()
        this.scene.add(mesh)
    }

    setup2D () {
        const img = this.resources.items.lennaTexture
       

        const mat = new THREE.ShaderMaterial({
            fragmentShader:frag2D, 
            vertexShader:vert2D, 
            uniforms: {
                uImage: {value:img},
                uTime: {value: this.elapsedTime},
                uSize: {
                    value: new THREE.Vector2(window.innerWidth, window.innerHeight)
                }
            }
        })
        this.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
        this.scene.add(this.plane)

    }

    setup () {
        const hemi = new THREE.HemisphereLight(0xffffff)
        this.scene.add(hemi)
        this.setup2D()
        // this.addAnimatedCharacter()
      
    }

    resize()
    {
    }

    update()
    {
        if(this.mixer) {
            const deltaTime = window.performance.now() - this.time
            this.mixer.update(deltaTime*0.001)
            this.time = window.performance.now()
            // console.log(deltaTime)
        }

        if(this.plane) {
            this.plane.material.uniforms.uTime.value = this.elapsedTime;
        }
    }

    destroy()
    {
    }
}