// Custom shader for radial gradient sky
export const skyVertexShader = `
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;
        
export const skyFragmentShader = `
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec3 u_center_color;
    uniform vec3 u_middle_color;
    uniform vec3 u_edge_color;

    varying vec2 vUv;
    
    void main() {
        // Calculate distance from current pixel to mouse position
        vec2 mousePos = (u_mouse + 1.0) * 0.5; // Convert from -1,1 to 0,1
        float dist = distance(vUv, mousePos);
        
        // Create gradient colors - you can customize these
        vec3 centerColor = u_center_color;
        vec3 middleColor = u_middle_color;
        vec3 edgeColor = u_edge_color;

        // Add some time-based animation
        float animatedDist = dist + sin(u_time * 0.5) * 0.1;
        
        // Create smooth transitions between colors
        vec3 color;
        if (animatedDist < 0.3) {
            // Center to middle transition
            float t = animatedDist / 0.3;
            color = mix(centerColor, middleColor, smoothstep(0.0, 1.0, t));
        } else {
            // Middle to edge transition
            float t = (animatedDist - 0.3) / 0.7;
            color = mix(middleColor, edgeColor, smoothstep(0.0, 1.0, t));
        }
        
        // Add some subtle noise for more organic feel
        float noise = sin(vUv.x * 10.0 + u_time) * sin(vUv.y * 10.0 + u_time) * 0.02;
        color += noise;
        
        gl_FragColor = vec4(color, 1.0);
    }
`;
