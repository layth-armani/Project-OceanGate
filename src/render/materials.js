const default_texture = null; 
const default_base_color = [1.0, 0.0, 1.0];  // magenta, used when no texture is provided
const default_shininess = 0.1;


/*---------------------------------------------------------------
	Materials
---------------------------------------------------------------*/
/**
 * Materials are defined by parameters that describe how 
 * different objects interact with light.
 * 
 * The `properties` array can be used to indicate by 
 * which shaders will process this material. 
 * ShaderRenderer classes have an `exclude()` function whose
 * behavior can be customized to adapt to different material properties.
 */

class Material {

    constructor(){
        this.texture = default_texture;
        this.color = default_base_color;
        this.shininess = default_shininess;
        this.properties = [];
    }

}

class BackgroundMaterial extends Material {

    constructor({texture = default_texture}){
        super()
        this.texture = texture;
        this.properties.push("environment");
        this.properties.push("no_blinn_phong");
    }
}

class DiffuseMaterial extends Material {

    constructor({
        texture = null, 
        color = default_base_color, 
        shininess = default_shininess,
    }){
        super()
        this.texture = texture;
        this.color = color;
        this.shininess = shininess;
    }
}

class ReflectiveMaterial extends Material {
    constructor(){
        super()
        this.properties.push("reflective");
    }
}

class TerrainMaterial extends Material {
    constructor({
        texture = null, 
        color = default_base_color, 
        shininess = default_shininess,
        normal_map = null
    }){
        super()
        this.texture = texture;
        this.color = color;
        this.shininess = shininess;
        this.normal_map = normal_map;

        this.properties.push("terrain");
        this.properties.push("no_blinn_phong");
    }
}


/*---------------------------------------------------------------
	Material Instantiation
---------------------------------------------------------------*/
/**
 * Here materials are defined to later be assigned to objects.
 * Choose the material class, and specify its customizable parameters.
 */
export const sunset_sky = new BackgroundMaterial({
    texture: 'kloppenheim_07_puresky_blur.jpg'
});

export const gray = new DiffuseMaterial({
    color: [0.4, 0.4, 0.4],
    shininess: 0.5
});

export const ochre = new DiffuseMaterial({
    color:[0.95, 0.85, 0.5],
    shininess: 0.8
});

export const gold = new DiffuseMaterial({
    texture: 'tex_gold',
    shininess: 14.0
});

export const pine = new DiffuseMaterial({
    texture: 'pine.png',
    shininess: 0.5
});


export function normal_map(texture = default_texture, normal_map = null) {
    return new TerrainMaterial({
        texture: texture,
        normal_map: normal_map
    });
}

export function diffuse(texture = default_texture) {
    return new DiffuseMaterial({
        texture: texture,
    });
}