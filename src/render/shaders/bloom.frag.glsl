    precision mediump float;

    uniform vec3 material_base_color;



    void main(){


        const vec3 luminance = vec3(0.2126, 0.7152, 0.0722);

        float brightness = dot(material_base_color, luminance);

        vec3 bloom_color = brightness > 0.1 ? material_base_color : vec3(0.0);
        
        gl_FragColor = vec4(bloom_color, 1.);
        
    }
