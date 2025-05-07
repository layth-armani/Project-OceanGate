// Vertex attributes
attribute vec3 vertex_positions;
attribute vec3 vertex_normal;
attribute vec2 vertex_tex_coords;

// Varying values passed to fragment shader
varying vec2 v2f_uv;
varying vec3 v2f_frag_pos;
varying vec3 v2f_normal;
varying vec3 v2f_tangent;
varying vec3 v2f_binormal;

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
        vec3 tangent_os;

        vec3 helper = abs(vertex_normal.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);

        tangent_os = normalize(cross(helper, vertex_normal));
        tangent_os = normalize(tangent_os - vertex_normal * dot(vertex_normal, tangent_os));

        vec3 binormal_os = cross(vertex_normal, tangent_os);

        v2f_tangent = normalize(mat_normals_model_view * tangent_os);
        v2f_binormal = normalize(mat_normals_model_view * binormal_os);
    }

    gl_Position = mat_model_view_projection * position_v4;
}
