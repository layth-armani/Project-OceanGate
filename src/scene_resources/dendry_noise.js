import {vec2} from "../../lib/gl-matrix_3.3.0/esm/index.js"

export class DendryNoise{
    constructor(width, height, {
            levels = 3,
            epsilon = 0.25,
            delta = 0.05,
            gridSize = 4,
            controlFunc = () => 0.5,
            beta = 1.5
        } ={}){
        this.w = width;
        this.h = height;
        this.levels = levels;
        this.epsilon = epsilon;
        this.delta = delta;
        this.baseGrid = gridSize;
        this.controlFunc = controlFunc;
        this.beta = beta;

        this.grids = [];
        for (let k = 0; k < levels; k++) {
            this.grids.push({
                size: this.baseGrid * (1 << k),
                keys: this._generateKeys(this.baseGrid * (1 << k), width, height)
            });
        }
    }

    _generateKeys(gridN, width, height) {
        const keys = [];
        for (let j = 0; j < gridN; j++) {
            for (let i = 0; i < gridN; i++) {
                const fx = (i + 0.5) / gridN;
                const fy = (j + 0.5) / gridN;
                
                const rx = fx + (Math.random()*2-1) * (0.5 - this.epsilon) / gridN;
                const ry = fy + (Math.random()*2-1) * (0.5 - this.epsilon) / gridN;
    
                keys.push({
                    i,
                    j,
                    pos: vec2.fromValues(rx * width, ry * height)
                });
            }
        }
        return keys;
    }


    _segmentDistance(p, a, b) {
        const ab = vec2.sub(vec2.create(), b, a);
        const ap = vec2.sub(vec2.create(), p, a);
        const t = Math.max(0, Math.min(1, vec2.dot(ap, ab) / vec2.sqrLen(ab)));
        const proj = vec2.scaleAndAdd(vec2.create(), a, ab, t);
        return vec2.distance(p, proj);
    }


    eval(x, y) {
        const p = vec2.fromValues(x, y);
        let sum = 0.0;
    
        for (let { size, keys } of this.grids) {
            const getKey = (i, j) => {
                if (i < 0 || j < 0 || i >= size || j >= size) return null;
                return keys[j * size + i];
            };
    
            const i = Math.floor(x / this.w * size);
            const j = Math.floor(y / this.h * size);
    
            for (let dj = -1; dj <= 1; dj++) {
                for (let di = -1; di <= 1; di++) {
                    const center = getKey(i + di, j + dj);
                    if (!center) continue;
    
                    const neighbors = [
                        getKey(center.i + 1, center.j),
                        getKey(center.i, center.j + 1),
                        getKey(center.i + 1, center.j + 1)
                    ];
    
                    for (let n of neighbors) {
                        if (!n) continue;
                        const d = this._segmentDistance(p, center.pos, n.pos);
                        sum += Math.pow(d, -this.beta);
                    }
                }
            }
        }
    
        return this.controlFunc(x,y)*Math.pow(sum, -1 / this.beta);
    }
    

    
}