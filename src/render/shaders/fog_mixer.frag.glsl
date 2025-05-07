precision mediump float;
		
// Varying values passed from the vertex shader
varying vec4 canvas_pos;

// Global variables specified in "uniforms" entry of the pipeline
uniform sampler2D distances;
uniform sampler2D blinn_phong;

void main()
{
    float fog_max_distance = 5.0; // @todo find correct value

    vec3 fog_factor_color = vec3(0., 0.102, 0.2); // @todo tweak this

    // get uv coordinates in the canvas 
    vec2 uv = (canvas_pos.xy / canvas_pos.w) * 0.5 + 0.5;

    float distance_to_uv = texture2D(distances, uv).x;

    float fog_f = distance_to_uv / fog_max_distance;
    fog_f *= fog_f;
    float fog_factor = min(fog_f, 1.0);
    
    vec3 phong_color = texture2D(blinn_phong, uv).rgb;

    vec3 fog_color = fog_factor * fog_factor_color + (1.0 - fog_factor) * phong_color;

    vec3 color = phong_color;
    // darken the area where there is shadows
    if (fog_factor > 0.0){
        color = fog_color;
    }

    gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range
}