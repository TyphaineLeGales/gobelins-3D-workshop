import * as THREE from 'three'


export default class GenerativeTerrain {
    constructor(gui, matcap) {
        this.size = 1;
        this.density = 100;
        this.heightRange = [0.0, 1.0];
        this.colors = [];
        this.gui = gui;
        this.matcap = matcap
        
        this.guiParams = {
            size : this.size,
            density: this.density,
            heightMin : this.heightRange[0],
            heightMax : this.heightRange[1],
         
        }

        this.scene = new THREE.Group()
        this.guiSetup()
        this.init()

        this.box = new THREE.BoxBufferGeometry(1,1,1)
        
      
    }

    guiSetup () {
        this.gui.add( this.guiParams, 'heightMin', -10, 0 ).onChange(v => { this.update()});
        this.gui.add(this.guiParams, 'heightMax', 0, 10).onChange(v => { this.update()});
        this.gui.add(this.guiParams, 'size', 0, 10).onChange(v => { this.update()});
        this.gui.add(this.guiParams, 'density', 0, 10).onChange(v => { this.update()});

    }

    drawInstancedMesh (count, maxHeight) {
        const obj = new THREE.Object3D()
        const box = new THREE.BoxGeometry()
        this.mesh = new THREE.InstancedMesh()
        this.mesh.name = "grid"
        this.mesh = new THREE.InstancedMesh(box, this.mat, count)
        this.mesh.instanceMatrix.setUsage( THREE.DynamicDrawUsage ) // will be updated every frame
        for(let i = 0; i < this.density; i++){
            
            obj.position.set(Math.random()*2, 0, Math.random()*2)
            obj.scale.set(Math.random()*maxHeight, Math.random()*2, 1)
            obj.updateMatrix()
            this.mesh.setMatrixAt(i, obj.matrix)
        }
        this.mesh.instanceMatrix.needsUpdate = true
        this.scene.add(this.mesh)
    }

    remove (name) {
      
        this.scene.traverse(child => {
        
            if(child.isInstancedMesh) {
                console.log(child)
                child.geometry.dispose();
                this.scene.remove( child );
            }
        })
  
    }
    
    init () {
        const axesHelper = new THREE.AxesHelper( 5 );
        this.scene.add( axesHelper );

        this.mat = new THREE.MeshMatcapMaterial()
        this.mat.matcap = this.matcap

        this.drawInstancedMesh(this.density,  this.guiParams.heightMax)
        this.scene.add(this.mesh)

    }

    update() {
        // delete prev 

        this.remove('grid')
        this.drawInstancedMesh(this.density, this.guiParams.heightMax)
    }



}
