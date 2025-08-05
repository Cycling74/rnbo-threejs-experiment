export const MountainGreen = [
    [0.5, 0.5, 0.5, 0.1],
    [0.5, 0.5, 1.0, 0.2],
    [0.5, 0.5, 0.5, 0.3]
]

export function makePalette(r, g, b) {

    function colorCosine(t, a, b, c, d) {
        return a + b * Math.cos(6.283185 * (c * t + d));
    }

    return function(t) {
        return new THREE.Color(
            colorCosine(t, ...r),
            colorCosine(t, ...g),
            colorCosine(t, ...b)
        );
    };
}
