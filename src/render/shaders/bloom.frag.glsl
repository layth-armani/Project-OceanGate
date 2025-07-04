precision mediump float;

varying vec4 canvas_pos;

uniform float threshold;
uniform sampler2D texture;
uniform bool extra_bloom;

void main(){

    // get uv coordinates in the canvas 
    vec2 uv = (canvas_pos.xy / canvas_pos.w) * 0.5 + 0.5;
    if(texture2D(texture, uv).a < 0.1)discard;
    vec3 color = texture2D(texture, uv).rgb;
    

    const vec3 luminance = vec3(0.2126, 0.7152, 0.0722);
    float brightness = dot(color, luminance);

        
    if(brightness > threshold){

        gl_FragColor = vec4(color, 1.);
    }
    else if (extra_bloom){
        gl_FragColor = vec4(color * 100., 1.);
    }else{
        discard;
    }
        
    }
