/**
 * A module for tracking and displaying performance metrics
 */
export class PerformanceMonitor {
    constructor(max_samples = 120) {
        this.frame_times = [];
        this.max_samples = max_samples;
        this.overlay_element = null;
        this.enabled = true;
        this.create_overlay();
    }

    create_overlay() {
        this.overlay_element = document.createElement('div');
        this.overlay_element.id = 'performance-overlay';
        this.overlay_element.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background-color: rgba(0, 0, 0, 0.6);
            color: #fff;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 14px;
            pointer-events: none;
            z-index: 1000;
            text-align: right;
        `;
        document.body.appendChild(this.overlay_element);
    }

    /**
     * Update performance metrics with a new frame time
     * @param {number} dt - The delta time (in seconds) for this frame
     */
    update(dt) {
        if (!this.enabled) return;
        
        this.frame_times.push(dt * 1000);
        
        if (this.frame_times.length > this.max_samples) {
            this.frame_times.shift();
        }
        
        this.update_display();
    }

    /**
     * Calculate various performance metrics including 1% and 10% low FPS
     * @returns {Object} Object containing calculated metrics
     */
    calculate_metrics() {
        if (this.frame_times.length === 0) {
            return { 
                fps: 0, 
                avg_frame_time: 0, 
                fps_1_low: 0, 
                fps_10_low: 0 
            };
        }

        const avg_frame_time = this.frame_times.reduce((a, b) => a + b, 0) / this.frame_times.length;
        const fps = 1000 / avg_frame_time;
        
        const fps_values = this.frame_times.map(time => 1000 / time);
        
        fps_values.sort((a, b) => a - b);
        
        const index_1_percent = Math.max(0, Math.floor(fps_values.length * 0.01));
        const index_10_percent = Math.max(0, Math.floor(fps_values.length * 0.1));
        
        const fps_1_low = fps_values[index_1_percent];
        const fps_10_low = fps_values[index_10_percent];

        return {
            fps: Math.round(fps),
            avg_frame_time: avg_frame_time.toFixed(2),
            fps_1_low: Math.round(fps_1_low),
            fps_10_low: Math.round(fps_10_low)
        };
    }

    /**
     * Update the overlay display with current metrics
     */
    update_display() {
        if (!this.overlay_element || !this.enabled) return;

        const metrics = this.calculate_metrics();
        
        this.overlay_element.innerHTML = `
            FPS: ${metrics.fps}<br>
            Frame Time: ${metrics.avg_frame_time} ms<br>
            1% Low FPS: ${metrics.fps_1_low}<br>
            10% Low FPS: ${metrics.fps_10_low}
        `;
    }

    /**
     * Toggle the visibility of the performance overlay
     */
    toggle() {
        this.enabled = !this.enabled;
        if (this.overlay_element) {
            this.overlay_element.style.display = this.enabled ? 'block' : 'none';
        }
    }
}