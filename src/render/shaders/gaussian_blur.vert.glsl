attribute vec3 vertex_positions;
attribute vec2 vertex_tex_coords;

varying vec2 TexCoords;

uniform mat4 mat_model_view_projection;

void main(){
    TexCoords = vertex_tex_coords;
    vec4 position_v4 = vec4(vertex_positions, 1);
    gl_Position = mat_model_view_projection * position_v4;
}