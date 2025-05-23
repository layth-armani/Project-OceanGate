import { vec2, vec3, vec4, mat3, mat4 } from "../../lib/gl-matrix_3.3.0/esm/index.js"
import { normalize } from "../../lib/gl-matrix_3.3.0/esm/vec3.js"
import { deg_to_rad, mat4_to_string, vec_to_string, mat4_matmul_many } from "../cg_libraries/cg_math.js"

/**
 * Create a new point of view camera
 */
export class POVCamera {

    MAX_MOV_SPEED = 0.8;
    MIN_MOV_SPEED = 0.2;
    MAX_ROT_SENSITIVITY = 0.02;
    MIN_ROT_SENSITIVITY = 0.001;

    constructor() {
        this.pos = [0, 0, 0]
        this.look_dir = [1, 0, 0]
        this.rotation_sensitivity = this.MIN_ROT_SENSITIVITY;
        this.movement_speed = this.MIN_MOV_SPEED;

        this.animation = null;
        
        this.mat = {
            projection : mat4.create(),
            view : mat4.create()
        }

        this.update_format_ratio(100, 100);
        this.update_cam_transform();
        
    }

    set_boundary(bounds){
        this.bounds = bounds;
    }

    get_boundary(){
        if(!this.bounds){
            throw new Error("No bounds defined");
        }
        return this.bounds;
    }

    set_pos(pos){
        this.pos = vec3.clone(pos);
        this.update_cam_transform();
    }

    set_look_dir(look_dir){
        this.look_dir = vec3.clone(look_dir);
        vec3.normalize(this.look_dir, this.look_dir);
        this.update_cam_transform();
    }

    set_animation(animation){
        this.animation = animation;
    }

    is_animation_ongoing(){
        return this.animation != null;
    }

    animate(dt){
        
        if(this.animation){
            if(this.animation.is_animation_finished()){
                this.animation = null;
            } else {
                const {pos, look} = this.animation.update(dt);
                this.set_pos(pos);
                this.set_look_dir(look);
            }
        }
    }

    getMovSpeed(){
        return this.movement_speed;
    }

    setMovSpeed(speed){
        if(speed > this.MAX_MOV_SPEED){
            this.movement_speed = this.MAX_MOV_SPEED;
        } else if(speed < this.MIN_MOV_SPEED){
            this.movement_speed = this.MIN_MOV_SPEED;
        } else{
            this.movement_speed = speed;
        }
    }

    getRotSensitivity(){
        return this.rotation_sensitivity;
    }

    setRotSensitivity(sensitivity){
        if(sensitivity > this.MAX_ROT_SENSITIVITY){
            this.rotation_sensitivity = this.MAX_ROT_SENSITIVITY;
        } else if(sensitivity < this.MIN_ROT_SENSITIVITY){
            this.rotation_sensitivity = this.MIN_ROT_SENSITIVITY;
        } else{
            this.rotation_sensitivity = sensitivity;
        }
    }

    get_right_v(){
        const look = vec3.clone(this.look_dir);

        const right_unit_v = vec3.create();
        vec3.cross(
            right_unit_v,
            look,
            vec3.fromValues(0, 0, 1)
        )
        normalize(right_unit_v, right_unit_v);

        return right_unit_v;
    }

    get_up_v(){
        const look = vec3.clone(this.look_dir);

        const right_unit_v = vec3.create();
        vec3.cross(
            right_unit_v,
            look,
            vec3.fromValues(0, 0, -1)
        )

        const up_unit_v = vec3.create();
        vec3.cross(
            up_unit_v,
            look,
            right_unit_v
        )

        normalize(up_unit_v, up_unit_v);

        return up_unit_v;
    }

    /**
     * Recompute the camera perspective matrix based on the new ratio
     * @param {*} width the width of the canvas
     * @param {*} height the heigth of the canvas
     */
    update_format_ratio(width, height){
        mat4.perspective(this.mat.projection,
            deg_to_rad * 60, // fov y
            width / height, // aspect ratio
            0.01, // near
            512, // far
        )
    }

    /**
     * Recompute the view matrix (mat.view)
     */
    update_cam_transform() {
        mat4.lookAt(this.mat.view,
            this.pos, // camera position in world coord
            mat3.add(mat3.create(), this.pos, this.look_dir), // view target point
            [0, 0, 1], // up vector
        )
    }

    /**
     * Compute all the objects transformation matrices and store them into the camera
     * (For improved performance, objects' transformation matrices are computed once at the 
     * beginning of every frame and are stored in the camera for shader_renderers to use)
     * @param {*} scene_objects 
     */
    compute_objects_transformation_matrices(scene_objects){
        this.object_matrices = new Map();

        // Compute and store the objects matrices
        for (const obj of scene_objects) {
            const transformation_matrices = this.compute_transformation_matrices(obj);
            this.object_matrices.set(obj, transformation_matrices);
        }
    }

    /**
     * Compute the transfortmation matrix of the object for this camera
     * @param {*} object 
     * @returns 
     */
    compute_transformation_matrices(object) {
        const mat_projection = this.mat.projection;
        const mat_view = this.mat.view;

        // Construct mat_model_to_world from translation and scale.
        // If we wanted to have a rotation too, we could use mat4.fromRotationTranslationScale.
        const mat_model_to_world = mat4.create();
        
        mat4.fromTranslation(mat_model_to_world, object.translation);
        
        if(object.velocity){


            const right_unit_v = vec3.create();
            vec3.cross(
                right_unit_v,
                object.velocity,
                vec3.fromValues(0, 0, -1)
            )

            const up_unit_v = vec3.create();
            vec3.cross(
                up_unit_v,
                object.velocity,
                right_unit_v
            )

            normalize(up_unit_v, up_unit_v);

            let mat_rot1 = mat4.fromRotation(mat4.create(), Math.PI / 2, [0, -1, 0])//mat4.targetTo(mat4.create, [0, 0, 0], [0, 0, 1], [0, 0, 1]);
            let mat_rot2 = mat4.targetTo(mat4.create, [0, 0, 0], object.velocity, right_unit_v);

            mat4.multiply(mat_rot1, mat_rot2, mat_rot1);
            mat4.multiply(mat_model_to_world, mat_model_to_world, mat_rot1);
            
        }
        mat4.scale(mat_model_to_world, mat_model_to_world, object.scale);

        const mat_model_view = mat4.create();
        const mat_model_view_projection = mat4.create();
        const mat_normals_model_view = mat3.create();
        
        // Compute mat_model_view, mat_model_view_projection, mat_normals_model_view.
        mat4_matmul_many(mat_model_view, mat_view, mat_model_to_world);
        mat4_matmul_many(mat_model_view_projection, mat_projection, mat_model_view);

        // Recall that the transform matrix model_view for normal projection
        // is the inverted transpose of the vertices model_view.
        mat3.identity(mat_normals_model_view);
        mat3.fromMat4(mat_normals_model_view, mat_model_view);
        mat3.invert(mat_normals_model_view, mat_normals_model_view);
        mat3.transpose(mat_normals_model_view, mat_normals_model_view);

        // Note: to optimize we could compute mat_view_projection = mat_projection * mat_view 
        // only once instead as for every object. This option is simpler, and the performance
        // difference is negligible for a moderate number of objects.
        // Consider optimizing this routine if you need to render thousands of distinct objects.
        return { mat_model_view, mat_model_view_projection, mat_normals_model_view }
    }

    //// UI USEFUL FUNCTIONS

    /**
     * Place the camera in the defined view
     * @param {{distance_factor, angle_z, angle_y, look_at}} view 
     */
    set_preset_view(view){
        this.pos = view.pos;
        this.look_dir = view.look_dir;
        this.update_cam_transform();
    }

    /**
     * Helper function to get in the console the state of 
     * the camera to define a preset view
     */
    log_current_state(){
        console.log(
            "pos: " + this.pos,
            "lookdir: " + this.look_dir,
        );
    }

    /**
     * Update the camera angle to make it rotate around its look_at point
     * @param {*} movementX 
     * @param {*} movementY 
     */
    rotate_action(movementX, movementY){
        // update the look_dir
        const factor_mul = -1 * this.rotation_sensitivity;
        const dx = movementX * factor_mul;
        const dy = movementY * factor_mul;
        const MAX_VERTICAL_ANGLE = Math.PI / 2 - 0.01;
        const MIN_VERTICAL_ANGLE = -Math.PI / 2 + 0.01;

        const flatLookDir = vec3.create();
        vec3.set(flatLookDir, this.look_dir[0], this.look_dir[1], 0);
        // angle returned by vec3.angle is in absolute value
        const upAngle = vec3.angle(flatLookDir, this.look_dir) * Math.sign(this.look_dir[2]);


        // rotate around z axis (right/left rotation)
        vec3.rotateZ(this.look_dir, this.look_dir, vec3.zero(vec3.create()), dx);

        // rotate around right hand axis using rodrigues formula (up/down rotation)
        if(Math.abs(upAngle + dy) < MAX_VERTICAL_ANGLE){
            let rotAxis = vec3.normalize(vec3.create(), this.get_right_v());
            let look = vec3.clone(this.look_dir);
            let factor1 = vec3.scale(vec3.create(), look, Math.cos(dy));
            vec3.copy(look, this.look_dir);
            let factor2 = vec3.scale(vec3.create(), 
                vec3.cross(vec3.create(), rotAxis, look), 
                Math.sin(dy)
            );
            vec3.copy(look, this.look_dir);
            let factor3 = vec3.scale(vec3.create(), 
                rotAxis, 
                vec3.dot(rotAxis, look) * (1 - Math.cos(dy))
            );
            vec3.add(this.look_dir, factor1, factor2);
            vec3.add(this.look_dir, this.look_dir, factor3);
        }
        
        //vec3.rotateY(this.look_dir, this.look_dir, vec3.zero(vec3.create()), dy);


        vec3.normalize(this.look_dir, this.look_dir);

        this.update_cam_transform();
    }

    /**
     * Moves the camera look_at point
     * @param {*} forward_mov
     * @param {*} right_mov
     * @param {*} up_mov 
     */
    move_action(forward_mov, right_mov, up_mov){

        //this.log_current_state();

        
        if(forward_mov == 0 && right_mov == 0 && up_mov == 0){
            return;
        }
        

        forward_mov = forward_mov * this.movement_speed;
        right_mov = right_mov * this.movement_speed;
        up_mov = up_mov * this.movement_speed;

        const look = vec3.clone(this.look_dir);

        const forward_unit_v = look;
        const right_unit_v = this.get_right_v();
        const up_unit_v = this.get_up_v();

        const result_mov = vec3.create();
        

        const forward_mov_v = vec3.scale(forward_unit_v, forward_unit_v, forward_mov);
        const right_mov_v = vec3.scale(right_unit_v, right_unit_v, right_mov);
        const up_mov_v = vec3.scale(up_unit_v, up_unit_v, up_mov);


        vec3.add(result_mov, forward_mov_v, right_mov_v);
        vec3.add(result_mov, result_mov, up_mov_v);

        const new_pos = vec3.create();
        vec3.add(new_pos, this.pos, result_mov);
        
        if(this.bounds){
            const clipped_pos = this.bounds.clip_to_bounds(new_pos);
            vec3.copy(new_pos, clipped_pos);
        }

        vec3.copy(this.pos, new_pos);
        this.update_cam_transform();
    }
}