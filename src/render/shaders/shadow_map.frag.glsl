precision highp float;

varying vec3 v2f_frag_pos;
varying vec2 v2f_uv;

uniform sampler2D material_texture;
uniform bool is_textured;
uniform bool is_translucent;
uniform vec3 material_base_color;

void main () {
    if (is_textured && is_translucent) {
        vec4 texColor = texture2D(material_texture, v2f_uv);
        if (texColor.a < 0.1) {
            discard; 
        }
    }

    float depth = length(v2f_frag_pos); 
    gl_FragColor = vec4(depth, depth, depth, 1.);
}