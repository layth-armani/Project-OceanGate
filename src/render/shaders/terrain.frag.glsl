precision mediump float;

// Varyings aus Vertex‑Shader
varying vec3 frag_position;
varying vec3 frag_normal;
varying vec2 frag_tex_coords;
varying vec3 frag_tangent;
varying vec3 frag_binormal;

// Uniforms
uniform sampler2D material_texture;
uniform sampler2D material_normal_map;
uniform bool is_textured;
uniform bool is_translucent;
uniform vec3 material_color;
uniform float material_shininess;
uniform vec3 light_color;
uniform vec3 light_position;
uniform vec3 ambient_factor;

void main()
{
    vec3 base_color = material_color;
    float alpha = 1.0;
    if(is_textured) {
        vec4 col = texture2D(material_texture, frag_tex_coords);
        base_color = col.xyz;
        alpha = col.a;
    }
    if(is_translucent && alpha <= 0.1) discard;

    vec3 n_tangent = normalize(texture2D(material_normal_map, frag_tex_coords).rgb * 2.0 - 1.0);  // :contentReference[oaicite:3]{index=3}
    mat3 TBN = mat3(
        normalize(frag_tangent),
        normalize(frag_binormal),
        normalize(frag_normal)
    ); 
    vec3 n = normalize(TBN * n_tangent);

    vec3 v = normalize(-frag_position);
    vec3 l = normalize(light_position - frag_position);
    vec3 h = normalize(l + v);

    float diff = max(dot(n, l), 0.0);
    float spec = (diff > 0.0) ? pow(max(dot(n, h), 1e-4), material_shininess) : 0.0;
    vec3 ambient = ambient_factor * base_color * 0.6;

    float dist = length(light_position - frag_position);
    float atten = 1.0 / pow(dist, 0.25);

    vec3 color = ambient + atten * light_color * base_color * (diff + spec);
    gl_FragColor = vec4(color, alpha);
}
