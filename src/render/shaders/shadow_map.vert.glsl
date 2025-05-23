precision mediump float;

attribute vec3 vertex_positions;
attribute vec2 vertex_tex_coords;

uniform mat4 mat_model_view;
uniform mat4 mat_model_view_projection;

varying vec3 v2f_frag_pos;
varying vec2 v2f_uv;

void main() {
    gl_Position = mat_model_view_projection * vec4(vertex_positions, 1.0);
    v2f_frag_pos = (mat_model_view * vec4(vertex_positions, 1.0)).xyz;
    v2f_uv = vertex_tex_coords;
}
