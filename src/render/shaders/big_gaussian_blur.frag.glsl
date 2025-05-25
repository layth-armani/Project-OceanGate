precision mediump float;

varying vec4 canvas_pos;

uniform sampler2D image;
uniform bool horizontal; 

uniform vec2 texSize;




void main(){
    vec2 uv = (canvas_pos.xy / canvas_pos.w) * 0.5 + 0.5;
    vec3 initial_pix = texture2D(image, uv).rgb; 

    float weight[15];
    weight[0] = 0.0741784005;
    weight[1] = 0.0729173226;
    weight[2] = 0.0692612719;
    weight[3] = 0.0635706586;
    weight[4] = 0.0563805695;
    weight[5] = 0.0483179728;
    weight[6] = 0.0400123861;
    weight[7] = 0.0320174467;
    weight[8] = 0.0247562831;
    weight[9] = 0.0184965480;
    weight[10] = 0.0133537249;
    weight[11] = 0.0093158110;
    weight[12] = 0.0062797942;
    weight[13] = 0.0040905024;
    weight[14] = 0.0025746274;

    
    vec2 tex_offset = 1.0 / texSize;
    
    
    vec3 result = texture2D(image, uv).rgb * weight[0]; 

    // Horizontal blur pass
    for(int i = 1; i < 15; ++i)
    {
        for(int j = 1; j < 15; ++j)
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
