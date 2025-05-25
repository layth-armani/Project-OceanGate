import { vec2, vec3, vec4, mat3, mat4 } from "../../lib/gl-matrix_3.3.0/esm/index.js"
import { forEach } from "../../lib/gl-matrix_3.3.0/esm/vec3.js";
const Factorials = [1, 1];

export class BezierCamAnimation{

  constructor(pos_points, look_points, duration){
    if(!pos_points ||
      !look_points || look_points.length != pos_points.length){
      throw new Error("Invalid camera or points");
    }
    this.pos_points = pos_points;
    this.look_points = look_points;
    this.duration = duration;
    this.t = 0;

    this.pos = this.get_current(pos_points);
    this.look = this.get_current(look_points);
  }

  is_animation_finished(){
    return this.t > 0.99;
  }

  get_current(points){
    let p = vec3.fromValues(0, 0, 0);
    const n = points.length - 1;
    for (let k = 0; k <= n; k++) {
      const p_i = vec3.clone(points[k]);
      const s_i =  C(n,k) * Math.pow(1 - this.t, n-k) * Math.pow(this.t, k);

      vec3.scale(p_i, p_i, s_i);

      vec3.add(p, p, p_i);
    }

    return p;
  }

  update(dt){
    this.t += dt / this.duration;

    if(this.t > 1){
      this.t = 1;
    }

    this.pos = this.get_current(this.pos_points);
    this.look = this.get_current(this.look_points);

    return {pos: this.pos, look: this.look};
  }
}


function factorial(n) {
  if (n < 0) {
    console.error("Factorial is not defined for negative numbers.");
    return -1;
  }

  if (Factorials[n] !== undefined) {
    return Factorials[n];
  }

  for (let i = Factorials.length; i <= n; i++) {
    Factorials[i] = Factorials[i - 1] * i;
  }

  return Factorials[n];
}


function C(n, k) {
  if (k < 0 || k > n) {
    return 0; 
  }
  if (k === 0 || k === n) {
    return 1;
  }
  if (k > n / 2) {
    k = n - k; 
  }

  return factorial(n) / (factorial(k) * factorial(n - k));
}