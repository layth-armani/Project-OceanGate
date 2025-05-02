import {vec2, vec3, vec4, mat2, mat3, mat4} from "../../lib/gl-matrix_3.3.0/esm/index.js"
import { DendryNoise } from "./dendry_noise.js";

/**
 * Generate procedurally a terrain mesh using some procedural noise
 * @param {*} height_map a buffer texture that contains heigth values 
 * @returns 
 */
export function terrain_build_mesh(perlin_height_map, dendry_height_map) {

	const grid_width = perlin_height_map.width;
	const grid_height = perlin_height_map.height;

	const vertices = [];
	const normals = [];

	const tex_coords = [];
	const faces = [];

	// Map a 2D grid index (x, y) into a 1D index into the output vertex array.
	function xy_to_v_index(x, y) {
		return x + y*grid_width;
	}

	for(let y = 0; y < grid_height; y++) {
		for(let x = 0; x < grid_width; x++) {
			const idx = xy_to_v_index(x, y);

			let h0 = perlin_height_map.get(x,y) - 0.5;
			let d = dendry_height_map.get(x,y) / Math.max(grid_width, grid_height);
			let elevation = (h0 + 0.5*(1-d));			
			

			/*
			Generate the displaced terrain vertex corresponding to integer grid location (gx, gy). 
			The height (Z coordinate) of this vertex is determined by height_map.
			
			The XY coordinates are calculated so that the full grid covers the square [-0.5, 0.5]^2 in the XY plane.
			*/
			const hx = ((() => {
				let h1 = perlin_height_map.get(x+1,y)-0.5;
				let d1 = dendry_height_map.get(x+1,y) / Math.max(grid_width, grid_height);;
				let h2 = perlin_height_map.get(x-1,y)-0.5;
				let d2 = dendry_height_map.get(x-1,y) / Math.max(grid_width, grid_height);;
				return ((h1 + 0.5*(1-d1)) - (h2 + 0.5*(1-d2))) / (2/grid_width);
			})());
			const hy = ((() => {
				let h1 = perlin_height_map.get(x,y+1)-0.5;
				let d1 = dendry_height_map.get(x,y+1) / Math.max(grid_width, grid_height);;
				let h2 = perlin_height_map.get(x,y-1)-0.5;
				let d2 = dendry_height_map.get(x,y-1) / Math.max(grid_width, grid_height);;
				return ((h1 + 0.5*(1-d1)) - (h2 + 0.5*(1-d2))) / (2/grid_height);
			})());			
			
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
		faces: faces,
		vertex_tex_coords: [],
	}
}