export default [
    {
        name: 'base',
        data: {},
        items:
        [
            { name: 'lennaTexture', source: '/assets/lenna.png', type: 'texture' },
            { name: 'image', source: '/assets/image4Shader.jpg', type: 'texture' },
            { name: 'alien', source: 'assets/alien.glb'}, 
            { name: 'diffuse', source: '/assets/colorMapAlien.png', type:'texture'},
            { name: 'matcap', source: '/assets/matcap.jpg',  type:'texture'}
            // { name: 'rock', source: 'assets/Rock.glb'}, 
            // { name: 'character', source: 'assets/mixamoAnimatedChar.glb'},
            // {name: 'matcap', source: 'assets/matcap.jpg', type:'texture'}, 
            // {name: 'env', source: 'assets/envMap.hdr', type: 'texture'}
        ]
    }
]