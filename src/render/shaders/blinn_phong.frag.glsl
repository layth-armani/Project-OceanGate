precision mediump float;

// Varying values passed from the vertex shader
varying vec3 v2f_frag_pos;
varying vec3 v2f_normal;
varying vec2 v2f_uv;
varying vec3 v2f_tangent;
varying vec3 v2f_binormal;
varying float flip;

// Global variables specified in "uniforms" entry of the pipeline
uniform sampler2D material_texture;
uniform bool is_textured;
uniform bool is_translucent;
uniform vec3 material_base_color;
uniform float material_shininess;
uniform vec3 light_color;
uniform vec3 light_position;
uniform float ambient_factor;

uniform bool apply_normal_map;
uniform sampler2D normal_map;

void main()
{
    vec3 material_color = material_base_color;
    float alpha = 1.;
    if (is_textured){
        vec4 frag_color_from_texture = texture2D(material_texture, v2f_uv);
        material_color = frag_color_from_texture.xyz;
        alpha = frag_color_from_texture.a;
    }
    if(is_translucent && alpha <= 0.1) {
        discard;
    }

    float material_ambient = 0.6;

    vec3 n;
    
    if (apply_normal_map) {
        vec3 n_tangent =  normalize(texture2D(normal_map, v2f_uv).rgb * 2.0 - 1.0);
        float PI = acos(-1.0);

        mat3 TBN = mat3(
            normalize(v2f_tangent),
            normalize(v2f_binormal),
            normalize(v2f_normal)
        );
        if (gl_FrontFacing) {
            n_tangent = - n_tangent;    
        }

        
        n = normalize(TBN * n_tangent);
    } 
    else {
        n = normalize(v2f_normal);
    }

    // Blinn-Phong lighting model 
    vec3 v = normalize(-v2f_frag_pos);
    vec3 l = normalize(light_position - v2f_frag_pos);
    vec3 h = normalize(l + v);

    float h_dot_n = clamp(dot(h, n), 1e-12, 1.);

    // Compute diffuse
    float diffuse = max(0.0, dot(n, l));

    // Compute specular
    float specular = (diffuse > 0.0) ? pow(h_dot_n, material_shininess) : 0.0;

    // Compute ambient
    vec3 ambient = ambient_factor * material_color * material_ambient;

    float light_distance = length(light_position - v2f_frag_pos);
    float attenuation = 1.0 / pow(light_distance, 0.25);

    //try attenuation as fixed for more realistic deep water scene
    attenuation = 0.3;

    // Compute pixel color
    vec3 color = ambient + (attenuation * light_color * material_color * (diffuse + specular));

    gl_FragColor = vec4(color, 1.);
}
