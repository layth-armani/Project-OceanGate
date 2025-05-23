// Vertex attributes, specified in the "attributes" entry of the pipeline
attribute vec3 vertex_positions;
attribute vec3 vertex_normal;
attribute vec2 vertex_tex_coords;

// Varying values passed to fragment shader
varying vec3 v2f_frag_pos;
varying vec2 v2f_uv;


// Global variables specified in "uniforms" entry of the pipeline
uniform mat4 mat_model_view;
uniform mat4 mat_model_view_projection;


void main() {
	
	// vertex position in camera view
	vec4 position_v4 = vec4(vertex_positions, 1);
	v2f_frag_pos = (mat_model_view * vec4(position_v4)).xyz;
	v2f_uv = vertex_tex_coords;

	// vertex position on canvas
	gl_Position = mat_model_view_projection * vec4(vertex_positions, 1);
}