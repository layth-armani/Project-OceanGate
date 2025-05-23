// Vertex attributes
attribute vec3 vertex_positions;
attribute vec3 vertex_normal;
attribute vec3 vertex_tangent;
attribute vec3 vertex_binormal;
attribute vec2 vertex_tex_coords;

// Varying values passed to fragment shader
varying vec2 v2f_uv;
varying vec3 v2f_frag_pos;
varying vec3 v2f_normal;
varying vec3 v2f_tangent;
varying vec3 v2f_binormal;
varying float flip;

// Global uniforms
uniform mat4 mat_model_view;
uniform mat4 mat_model_view_projection;
uniform mat3 mat_normals_model_view;

uniform bool apply_normal_map;

void main() {
    v2f_uv = vertex_tex_coords;

    vec4 position_v4 = vec4(vertex_positions, 1.0);
    v2f_frag_pos = (mat_model_view * position_v4).xyz;

    vec3 normal_vs = normalize(mat_normals_model_view * vertex_normal);
    v2f_normal = normal_vs;
    
    if (apply_normal_map) {
        v2f_tangent = normalize( mat_normals_model_view * vertex_tangent);
        v2f_binormal = normalize(mat_normals_model_view * vertex_binormal);
    }

    gl_Position = mat_model_view_projection * position_v4;
}
