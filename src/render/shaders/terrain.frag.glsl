precision mediump float;

varying vec3 frag_position;
varying vec3 frag_normal;
varying vec2 frag_tex_coords;
varying vec3 frag_tangent;
varying vec3 frag_binormal;

uniform sampler2D material_texture;
uniform sampler2D material_normal_map; 
uniform vec3 light_position;
uniform vec3 light_color;
uniform vec3 ambient_factor;
uniform vec3 material_color;
uniform float material_shininess;

void main() {
    vec3 normal_map = texture2D(material_normal_map, frag_tex_coords).rgb;
    normal_map = normalize(normal_map * 2.0 - 1.0); 

    vec3 T = normalize(frag_tangent);
    vec3 B = normalize(frag_binormal);
    vec3 N = normalize(frag_normal);
    mat3 TBN = mat3(T, B, N);

    vec3 normal = normalize(TBN * normal_map);

    vec3 light_dir = normalize(light_position - frag_position);
    float diff = max(dot(normal, light_dir), 0.0);

    vec3 diffuse = diff * light_color;
    vec3 ambient = ambient_factor * light_color;
    
    vec4 tex_color = texture2D(material_texture, frag_tex_coords);
    vec3 color = tex_color.rgb;
    float alpha = tex_color.a;
    
    vec3 lighting = ambient + diffuse;
    
    gl_FragColor = vec4(color * lighting, alpha);
}