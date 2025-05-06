precision mediump float;

varying vec4 canvas_pos;

uniform sampler2D image;
uniform bool horizontal; 

uniform vec2 texSize;


void main(){

    float weight[5];
    weight[0] = 0.227027;
    weight[1] = 0.1945946;
    weight[2] = 0.1216216;
    weight[3] = 0.054054;
    weight[4] = 0.016216;
    
    vec2 tex_offset = 1.0 / texSize;
    
    vec2 uv = (canvas_pos.xy / canvas_pos.w) * 0.5 + 0.5;
    vec3 result = texture2D(image, uv).rgb * weight[0]; 

    // Horizontal blur pass
    for(int i = 1; i < 5; ++i)
    {
        for(int j = 1; j < 5; ++j)
        { 
            float i_f = float(i);
            float j_f = float(j);

            float weight_i = weight[i];
            float weight_j = weight[j];
            float pix_w = weight_i * weight_j;

            result += texture2D(image, uv + vec2(tex_offset.x * i_f, tex_offset.y * j_f)).rgb * pix_w;
            result += texture2D(image, uv + vec2(tex_offset.x * i_f, -tex_offset.y * j_f)).rgb * pix_w;
            result += texture2D(image, uv + vec2(-tex_offset.x * i_f, tex_offset.y * j_f)).rgb * pix_w;
            result += texture2D(image, uv + vec2(-tex_offset.x * i_f, -tex_offset.y * j_f)).rgb * pix_w;
        }  
    }

    // Output the final color
    gl_FragColor = vec4(result, 1.0);
}

