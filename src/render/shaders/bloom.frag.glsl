precision mediump float;

varying vec4 canvas_pos;

uniform float threshold;
uniform sampler2D texture;

void main(){

    // get uv coordinates in the canvas 
    vec2 uv = (canvas_pos.xy / canvas_pos.w) * 0.5 + 0.5;
    vec3 color = texture2D(texture, uv).rgb;

    const vec3 luminance = vec3(0.2126, 0.7152, 0.0722);
    float brightness = dot(color, luminance);

        
    if(brightness > threshold ){

        gl_FragColor = vec4(color, 1.);
    }
    else{
        gl_FragColor = vec4(0. , 0., 0., 1);
    }
        
    }
