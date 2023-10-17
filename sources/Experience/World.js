import * as THREE from 'three'
import Experience from './Experience.js'

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

    setup () {
        const hemi = new THREE.HemisphereLight(0xffffff)
        this.scene.add(hemi)
        const rock = this.resources.items.rock;
        this.scene.add(rock.scene)
        this.scene.environment = this.resources.items.env
        const perso = this.resources.items.character
        const matcapMat = new THREE.MeshMatcapMaterial({
            matcap: this.resources.items.matcap
        })
        
        const normalMat= new THREE.MeshNormalMaterial
        const mesh = perso.scene
        mesh.traverse(o => {
            if(o.isMesh) {
                o.material = matcapMat
                o.position.x = 0.1
                o.position.y -= 0.1
            }
        })
        // console.log(mesh)
        // this.mesh.children[0].scale(0.5)
        this.mixer = new THREE.AnimationMixer(mesh)
        const animation = perso.animations[0]
        
        const action = this.mixer.clipAction(animation);
        action.loop = THREE.LoopRepeat
        action.enabled = true
        action.setEffectiveWeight(1)
        action.play()
        console.log(action.isRunning())
        this.scene.add(mesh)
        
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
    }

    destroy()
    {
    }
}