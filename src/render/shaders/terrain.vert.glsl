precision mediump float;

attribute vec3 vertex_positions;
attribute vec3 vertex_normal;
attribute vec3 vertex_tex_coords;
attribute vec3 vertex_tangent;
attribute vec3 vertex_binormal;

uniform mat4 mat_model_view_projection;
uniform mat4 mat_model_view;
uniform mat3 mat_normals_model_view;

varying vec3 frag_position;
varying vec3 frag_normal;
varying vec2 frag_tex_coords;
varying vec3 frag_tangent;
varying vec3 frag_binormal;

void main() {
    gl_Position = mat_model_view_projection * vec4(vertex_positions, 1.0);

    frag_position = (mat_model_view * vec4(vertex_positions, 1.0)).xyz;

    frag_normal = normalize(mat_normals_model_view * vertex_normal);

    frag_tangent = normalize(mat_normals_model_view * vertex_tangent);

    frag_binormal = normalize(mat_normals_model_view * vertex_binormal);

}