precision mediump float;

varying vec2 TexCoords;

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
    vec3 result = texture2D(image, TexCoords).rgb * weight[0]; 

    // Horizontal blur pass
    if(horizontal)
    {
        for(int i = 1; i < 5; ++i)
        {
            
            result += texture2D(image, TexCoords + vec2(tex_offset.x * float(i), 0.0)).rgb * weight[i];
            result += texture2D(image, TexCoords - vec2(tex_offset.x * float(i), 0.0)).rgb * weight[i];
        }
    }
    // Vertical blur pass
    else
    {
        for(int i = 1; i < 5; ++i)
        {
           
            result += texture2D(image, TexCoords + vec2(0.0, tex_offset.y * float(i))).rgb * weight[i];
            result += texture2D(image, TexCoords - vec2(0.0, tex_offset.y * float(i))).rgb * weight[i];
        }
    }

    // Output the final color
    gl_FragColor = vec4(result, 1.0);


   

}


