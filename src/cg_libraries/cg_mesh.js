import {load_text} from "./cg_web.js"
import {Mesh} from "../../lib/webgl-obj-loader_2.0.8/webgl-obj-loader.module.js"
import { vec3 } from "../../lib/gl-matrix_3.3.0/esm/index.js";

/*---------------------------------------------------------------
	Mesh construction and loading
---------------------------------------------------------------*/

/**
 * Create a sphere mesh
 * @param {*} divisions is the resolution of the sphere the bigger divisions is the more face the sphere has 
 * @param {*} inverted if true the normals will be facing inward of the sphere
 * @returns 
 */
export function cg_mesh_make_uv_sphere(divisions, inverted) {
	const {sin, cos, PI} = Math;

	const v_resolution = divisions | 0; // tell optimizer this is an int
	const u_resolution = 2*divisions;
	const n_vertices = v_resolution * u_resolution;
	const n_triangles = 2 * (v_resolution-1) * (u_resolution - 1);

	const vertex_positions = [];
	const tex_coords = [];

	for(let iv = 0; iv < v_resolution; iv++) {
		const v = iv / (v_resolution-1);
		const phi = v * PI;
		const sin_phi = sin(phi);
		const cos_phi = cos(phi);

		for(let iu = 0; iu < u_resolution; iu++) {
			const u = iu / (u_resolution-1);

			const theta = 2*u*PI;


			vertex_positions.push([
				cos(theta) * sin_phi,
				sin(theta) * sin_phi,
				cos_phi, 
			]);

			tex_coords.push([
				u,
				v,
			]);
		}
	}

	const faces = [];

	for(let iv = 0; iv < v_resolution-1; iv++) {
		for(let iu = 0; iu < u_resolution-1; iu++) {
			const i0 = iu + iv * u_resolution;
			const i1 = iu + 1 + iv * u_resolution;
			const i2 = iu + 1 + (iv+1) * u_resolution;
			const i3 = iu + (iv+1) * u_resolution;

			if (!inverted) {
				faces.push([i0, i1, i2]);
				faces.push([i0, i2, i3]);
			} else {
				faces.push([i0, i2, i1]);
				faces.push([i0, i3, i2]);
			}
		}
	}

	const normals = inverted ? vertex_positions.map((pos) => vec3.negate(vec3.create(), pos)) : vertex_positions;

	return {
		name: `UvSphere(${divisions})`,
		vertex_positions: vertex_positions,
		vertex_normals: normals, // on a unit sphere, position is equivalent to normal
		vertex_tex_coords: tex_coords,
		faces: faces,
	};
}

/**
 * Create a simple plane mesh with unitary length
 * @returns 
 */
export function cg_mesh_make_plane(){
	return {
		// Corners of the floor
		vertex_positions: [
		[-1, -1, 0],
		[1, -1, 0],
		[1, 1, 0],
		[-1, 1, 0],
		],
		// The normals point up
		vertex_normals: [
		[0, 0, 1],
		[0, 0, 1],
		[0, 0, 1],
		[0, 0, 1],
		],
		vertex_tex_coords: [
		[0, 0], //top left
		[1, 0],
		[1, 1],
		[0, 1], //top right
		],
		faces: [
		[0, 1, 2],
		[0, 2, 3],
		],
	};
}

/**
 * Creates a flat square mesh centered at origin with custom orientation
 * @param {number} size - Side length of the square
 * @param {number} divisions - Number of divisions (grid cells) per side
 * @param {Array<number>} normal - Normal vector for the plane [x,y,z]
 * @param {number} rotation - Rotation angle in radians around the normal
 * @returns {Object} Mesh object with vertex positions, normals, texture coordinates and faces
 */
export function cg_mesh_make_square(size = 1.0, divisions = 1, normal = [0, 0, 1], rotation = 0) {
    const vertices = [];
    const normals = [];
    const tex_coords = [];
    const faces = [];
    const tangents = [];    
    const binormals = [];  
    
    const half_size = size / 2;
    const step = size / divisions;
    
    const norm = Math.sqrt(normal[0]*normal[0] + normal[1]*normal[1] + normal[2]*normal[2]);
    const n = [normal[0]/norm, normal[1]/norm, normal[2]/norm];
    
    let u, v;
    
    if (Math.abs(n[0]) < 0.8) {
        u = vec3.cross(vec3.create(), n, [1, 0, 0]);
    } else {
        u = vec3.cross(vec3.create(), n, [0, 1, 0]);
    }
    
    vec3.normalize(u, u);
    
    v = vec3.cross(vec3.create(), n, u);
    
    if (rotation !== 0) {
        const cos_r = Math.cos(rotation);
        const sin_r = Math.sin(rotation);
        
        const u_rotated = [
            u[0] * cos_r + v[0] * sin_r,
            u[1] * cos_r + v[1] * sin_r,
            u[2] * cos_r + v[2] * sin_r
        ];
        
        const v_rotated = [
            -u[0] * sin_r + v[0] * cos_r,
            -u[1] * sin_r + v[1] * cos_r,
            -u[2] * sin_r + v[2] * cos_r
        ];
        
        u = u_rotated;
        v = v_rotated;
    }
    
    for (let i = 0; i <= divisions; i++) {
        for (let j = 0; j <= divisions; j++) {
            const s = -half_size + j * step;
            const t = -half_size + i * step;
            
            const x = s * u[0] + t * v[0];
            const y = s * u[1] + t * v[1];
            const z = s * u[2] + t * v[2];
            
            vertices.push([x, y, z]);
            
            normals.push(n);
            
            // Add tangent (u vector) for this vertex
            tangents.push(u);
            
            // Add bitangent (v vector) for this vertex
            binormals.push(v);
            
            tex_coords.push([j / divisions, i / divisions]);
        }
    }
    
    for (let i = 0; i < divisions; i++) {
        for (let j = 0; j < divisions; j++) {
            const idx = i * (divisions + 1) + j;
            
            faces.push([
                idx,
                idx + 1,
                idx + divisions + 1
            ]);
            
            faces.push([
                idx + 1,
                idx + divisions + 2,
                idx + divisions + 1
            ]);
        }
    }
    
    return {
        vertex_positions: vertices,
        vertex_normals: normals,
        faces: faces,
        vertex_tex_coords: tex_coords,
    };
}

/**
 * 
 * @param {*} url 
 * @param {*} material_colors_by_name 
 * @returns 
 */
export async function cg_mesh_load_obj(url, material_colors_by_name) {
	const obj_data = await load_text(url);
	const mesh_loaded_obj = new Mesh(obj_data);

	const faces_from_materials = [].concat(...mesh_loaded_obj.indicesPerMaterial);
	
	let vertex_colors = null;

	if(material_colors_by_name) {
		const material_colors_by_index = mesh_loaded_obj.materialNames.map((name) => {
			let color = material_colors_by_name[name];
			if (color === undefined) {
				console.warn(`Missing color for material ${name} in mesh ${url}`);
				color = [1., 0., 1.];
			}
			return color;
		})

		vertex_colors = [].concat(mesh_loaded_obj.vertexMaterialIndices.map((mat_idx) => material_colors_by_index[mat_idx]));
		// vertex_colors = regl_instance.buffer(vertex_colors)
	}
	
	return  {
		name: url.split('/').pop(),
		vertex_positions: mesh_loaded_obj.vertices,
		vertex_tex_coords: mesh_loaded_obj.textures,
		vertex_normals: mesh_loaded_obj.vertexNormals,
		vertex_colors: vertex_colors,
		
		// https://github.com/regl-project/regl/blob/master/API.md#elements
		faces: faces_from_materials,
		
		lib_obj: mesh_loaded_obj,
	};
}

/**
 * Put mesh data into a GPU buffer
 * 
 * It is not necessary to do so (regl can deal with normal arrays),
 * but this way we make sure its transferred only once and not on every pipeline construction.
 * @param {*} regl 
 * @param {*} mesh 
 * @returns 
 */
export function mesh_upload_to_buffer(regl, mesh) {
	
	const mesh_buffers = {
		name: mesh.name,
		faces: regl.elements({data: mesh.faces, type: 'uint16'}),
	};

	
	// Some of these fields may be null or undefined
	for(const name of ['vertex_positions', 'vertex_normals', 'vertex_tex_coords', 'vertex_colors', 'vertex_tangents', 'vertex_binormals' ]) {
		const vertex_data = mesh[name];
		if(vertex_data) {
			mesh_buffers[name] = regl.buffer(vertex_data);
		}
	}

	return mesh_buffers;
}

/**
 * 
 * @param {*} regl_instance 
 * @param {*} url 
 * @param {*} material_colors_by_name 
 * @returns 
 */
export async function cg_mesh_load_obj_into_regl(regl_instance, url, material_colors_by_name) {
	const mesh_cpu = await cg_mesh_load_obj(url, material_colors_by_name);
	const mesh_gpu = mesh_upload_to_buffer(regl_instance, mesh_cpu);
	return mesh_gpu;
}

