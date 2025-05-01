import {vec2, vec3, vec4, mat2, mat3, mat4} from "../../lib/gl-matrix_3.3.0/esm/index.js"
import { DendryNoise } from "./dendry_noise.js";

/**
 * Generate procedurally a terrain mesh using some procedural noise
 * @param {*} height_map a buffer texture that contains heigth values 
 * @param {*} WATER_LEVEL 
 * @returns 
 */
export function terrain_build_mesh(height_map, WATER_LEVEL) {

	const grid_width = height_map.width;
	const grid_height = height_map.height;

	const controlFunc = (x,y) => {
		return height_map.get(x|0,y|0);
	};

	const dendry_noise = new DendryNoise(grid_width, grid_height, {
		levels: 5,     	        
		epsilon: 0.,          
		delta: 0.001,           
		gridSize: 1,           
		controlFunc: () => 0.1, 
		beta: 100
	});

	const vertices = [];
	const normals = [];
	const tangents = []; 
	const binormals = []; 
	const tex_coords = [];
	const faces = [];

	// Map a 2D grid index (x, y) into a 1D index into the output vertex array.
	function xy_to_v_index(x, y) {
		return x + y*grid_width;
	}

	for(let y = 0; y < grid_height; y++) {
		for(let x = 0; x < grid_width; x++) {
			const idx = xy_to_v_index(x, y);

			let h0 = height_map.get(x,y) - 0.5;
			let d = dendry_noise.eval(x,y) / Math.max(grid_width, grid_height);
			let elevation = (h0 + 0.5*(1-d));			
			

			/*
			Generate the displaced terrain vertex corresponding to integer grid location (gx, gy). 
			The height (Z coordinate) of this vertex is determined by height_map.
			If the point falls below WATER_LEVEL:
			* it should be clamped back to WATER_LEVEL.
			* the normal should be [0, 0, 1]
	
			The XY coordinates are calculated so that the full grid covers the square [-0.5, 0.5]^2 in the XY plane.
			*/
			const hx = ((() => {
				let h1 = height_map.get(x+1,y)-0.5;
				let d1 = dendry_noise.eval(x+1,y)/Math.max(grid_width,grid_height);
				let h2 = height_map.get(x-1,y)-0.5;
				let d2 = dendry_noise.eval(x-1,y)/Math.max(grid_width,grid_height)
				// Approximate derivative dE/dx scaled by grid_width
				return ((h1 + 0.5*(1-d1)) - (h2 + 0.5*(1-d2))) / (2/grid_width);
			})());
			const hy = ((() => {
				let h1 = height_map.get(x,y+1)-0.5;
				let d1 = dendry_noise.eval(x,y+1)/Math.max(grid_width,grid_height);
				let h2 = height_map.get(x,y-1)-0.5;
				let d2 = dendry_noise.eval(x,y-1)/Math.max(grid_width,grid_height);
				// Approximate derivative dE/dy scaled by grid_height
				return ((h1 + 0.5*(1-d1)) - (h2 + 0.5*(1-d2))) / (2/grid_height);
			})());

			// Calculate tangent, binormal, and normal
			let tangent = vec3.normalize([0,0,0], [1, 0, hx]);
			let binormal = vec3.normalize([0,0,0], [0, 1, hy]);
			let normal = vec3.normalize([0,0,0], [-hx, -hy, 1]); // Consistent with cross(tangent, binormal)

			if (elevation < WATER_LEVEL) {
				elevation = WATER_LEVEL;
				normal = [0, 0, 1]; // Water surface normal
				tangent = [1, 0, 0]; // Water surface tangent
				binormal = [0, 1, 0]; // Water surface binormal
			}

			normals[idx] = normal;
			tangents[idx] = tangent;
			binormals[idx] = binormal;
			
			const vx = x/grid_width - 0.5;
			const vy = y/grid_height - 0.5;

			vertices[idx] = [vx, vy, elevation];

			const u = x / (grid_width - 1);
            const v = y / (grid_height - 1);
            tex_coords[idx] = [u, v];
		}
	}

	for(let gy = 0; gy < grid_height - 1; gy++) {
		for(let gx = 0; gx < grid_width - 1; gx++) {
	
			const va = xy_to_v_index(gx, gy);
			const vb = xy_to_v_index(gx+1, gy);
			const vc = xy_to_v_index(gx, gy+1);
			const vd = xy_to_v_index(gx+1, gy+1);

			faces.push([va, vb, vc]);
			faces.push([vb, vd, vc]);
		}
	}

	return {
		vertex_positions: vertices,
		vertex_normals: normals,
		vertex_tangents: tangents,
		vertex_binormals: binormals,
		faces: faces,
	}
}