precision mediump float;
		
// Varying values passed from the vertex shader
varying vec4 canvas_pos;

// Global variables specified in "uniforms" entry of the pipeline
uniform sampler2D base_shadows;
uniform sampler2D bloom;

void main()
{
    float bloom_strength = 1.0;

    // get uv coordinates in the canvas 
    vec2 uv = (canvas_pos.xy / canvas_pos.w) * 0.5 + 0.5;

    vec3 base_shadows_color = texture2D(base_shadows, uv).rgb;
    vec3 bloom_color =  texture2D(bloom, uv).rgb;

    vec3 color = base_color + bloom_color * bloom_strength;
  

	gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range
}