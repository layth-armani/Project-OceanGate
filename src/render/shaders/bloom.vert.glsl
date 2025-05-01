// Vertex attributes
attribute vec3 vertex_positions;
uniform mat4 mat_model_view_projection;

void main(){
    vec4 position_v4 = vec4(vertex_positions, 1);
    gl_Position = mat_model_view_projection * position_v4;
}