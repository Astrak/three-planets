import {
    EventDispatcher,
    Matrix4,
    MOUSE,
    OrthographicCamera,
    PerspectiveCamera,
    Quaternion,
    Spherical,
    Vector2,
    Vector3,
} from "three";

const EPS = 0.000000001;

const changeEvent = { type: "change" };
const startEvent = { type: "start" };
const endEvent = { type: "end" };

enum MOUSE_STATE {
    NONE = -1,
    ROTATE = 0,
    DOLLY = 1,
    PAN = 2,
    TOUCH_ROTATE = 3,
    TOUCH_DOLLY = 4,
    TOUCH_PAN = 5,
}

const vector = new Vector3();

export class OrbitControls extends EventDispatcher {
    enabled = true;

    minDistance = 0;
    maxDistance = Infinity;

    minZoom = 0;
    maxZoom = Infinity;

    minAzimuthAngle = -Infinity;
    maxAzimuthAngle = Infinity;

    minPolarAngle = 0;
    maxPolarAngle = Math.PI;

    target = new Vector3();

    enableDamping = false;

    enableZoom = true;
    zoomSpeed = 1.0;
    zoomDampingFactor = 0.1;

    enableRotate = true;
    rotateSpeed = 1.0;
    rotateDampingFactor = 0.1;

    enablePan = true;
    keyPanSpeed = 7.0;
    panSpeed = 1.0;
    panDampingFactor = 0.1;

    autoRotate = false;
    autoRotateSpeed = 2.0;

    enableKeys = true;

    keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

    mouseButtons = { ORBIT: MOUSE.LEFT, ZOOM: MOUSE.MIDDLE, PAN: MOUSE.RIGHT };

    private target0 = this.target.clone();
    private position0 = this.object.position.clone();
    private zoom0 = this.object.zoom;

    private mouseState = MOUSE_STATE.NONE;

    private spherical = new Spherical();
    private sphericalDelta = new Spherical();

    private distanceDelta = 0;
    private orthographicZoomDelta = 0;
    private panOffset = new Vector3();
    private zoomChanged = false;

    private rotateStart = new Vector2();
    private rotateEnd = new Vector2();
    private rotateDelta = new Vector2();

    private panStart = new Vector2();
    private panEnd = new Vector2();
    private panDelta = new Vector2();

    private zoomStart = new Vector2();
    private zoomEnd = new Vector2();
    private zoomDelta = new Vector2();

    private offset = new Vector3();

    private zoom = this.object.zoom;

    private quaternion = new Quaternion().setFromUnitVectors(this.object.up, new Vector3(0, 1, 0));
    private quatInverse = this.quaternion.clone().inverse();

    private lastPosition = new Vector3();
    private lastQuaternion = new Quaternion();

    constructor(
        public object: PerspectiveCamera | OrthographicCamera,
        public domElement: HTMLCanvasElement
    ) {
        super();

        this.onContextMenu = this.onContextMenu.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseWheel = this.onMouseWheel.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);

        domElement.addEventListener("contextmenu", this.onContextMenu, false);
        domElement.addEventListener("mousedown", this.onMouseDown, false);
        domElement.addEventListener("wheel", this.onMouseWheel, false);
        domElement.addEventListener("touchstart", this.onTouchStart, false);
        domElement.addEventListener("touchend", this.onTouchEnd, false);
        domElement.addEventListener("touchmove", this.onTouchMove, false);
        window.addEventListener("keydown", this.onKeyDown, false);

        this.update();
    }

    getPolarAngle() {
        return this.spherical.phi;
    }

    getAzimuthalAngle() {
        return this.spherical.theta;
    }

    saveState() {
        this.target0.copy(this.target);
        this.position0.copy(this.object.position);
        this.zoom0 = this.object.zoom;
    }

    reset() {
        this.target.copy(this.target0);
        this.object.position.copy(this.position0);
        this.object.zoom = this.zoom0;

        this.object.updateProjectionMatrix();
        this.dispatchEvent(changeEvent);

        this.update();

        this.mouseState = MOUSE_STATE.NONE;
    }

    dispose() {
        this.domElement.removeEventListener("contextmenu", this.onContextMenu, false);
        this.domElement.removeEventListener("mousedown", this.onMouseDown, false);
        this.domElement.removeEventListener("wheel", this.onMouseWheel, false);
        this.domElement.removeEventListener("touchstart", this.onTouchStart, false);
        this.domElement.removeEventListener("touchend", this.onTouchEnd, false);
        this.domElement.removeEventListener("touchmove", this.onTouchMove, false);
        document.removeEventListener("mousemove", this.onMouseMove, false);
        document.removeEventListener("mouseup", this.onMouseUp, false);
        window.removeEventListener("keydown", this.onKeyDown, false);
    }

    update() {
        this.offset.copy(this.object.position).sub(this.target);

        // rotate offset to "y-axis-is-up" space
        this.offset.applyQuaternion(this.quaternion);

        // angle from z-axis around y-axis
        this.spherical.setFromVector3(this.offset);

        if (this.autoRotate && this.mouseState === MOUSE_STATE.NONE) {
            this.rotateLeft(this.getAutoRotationAngle());
        }

        this.spherical.theta += this.sphericalDelta.theta;
        this.spherical.phi += this.sphericalDelta.phi;

        // restrict theta to be between desired limits
        this.spherical.theta = Math.max(
            this.minAzimuthAngle,
            Math.min(this.maxAzimuthAngle, this.spherical.theta)
        );

        // restrict phi to be between desired limits
        this.spherical.phi = Math.max(
            this.minPolarAngle,
            Math.min(this.maxPolarAngle, this.spherical.phi)
        );

        this.spherical.makeSafe();

        this.spherical.radius *= 1 + this.distanceDelta;

        // restrict radius to be between desired limits
        this.spherical.radius = Math.max(
            this.minDistance,
            Math.min(this.maxDistance, this.spherical.radius)
        );

        // move target to panned location
        this.target.add(this.panOffset);

        this.offset.setFromSpherical(this.spherical);

        // rotate offset back to "camera-up-vector-is-up" space
        this.offset.applyQuaternion(this.quatInverse);

        this.object.position.copy(this.target).add(this.offset);

        this.object.lookAt(this.target);

        if (Math.abs(this.orthographicZoomDelta) > EPS) {
            //orthographicZoomDelta is only changed for orthographic camera

            this.zoom = Math.min(
                this.maxZoom,
                Math.max(this.minZoom, this.object.zoom * (1 - this.orthographicZoomDelta))
            );

            if (this.zoom !== this.object.zoom) {
                this.object.zoom = this.zoom;
                this.object.updateProjectionMatrix();
                this.zoomChanged = true;
            }
        }

        if (this.enableDamping === true) {
            this.sphericalDelta.theta *= 1 - this.rotateDampingFactor;
            this.sphericalDelta.phi *= 1 - this.rotateDampingFactor;
            this.panOffset.multiplyScalar(1 - this.panDampingFactor);
            this.distanceDelta *= 1 - this.zoomDampingFactor;
            this.orthographicZoomDelta *= 1 - this.zoomDampingFactor;
        } else {
            this.sphericalDelta.set(0, 0, 0);
            this.panOffset.set(0, 0, 0);
            this.distanceDelta = 0;
            this.orthographicZoomDelta = 0;
        }

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8

        if (
            this.zoomChanged ||
            this.lastPosition.distanceToSquared(this.object.position) > EPS ||
            8 * (1 - this.lastQuaternion.dot(this.object.quaternion)) > EPS
        ) {
            this.dispatchEvent(changeEvent);

            this.lastPosition.copy(this.object.position);
            this.lastQuaternion.copy(this.object.quaternion);
            this.zoomChanged = false;

            return true;
        }

        return false;
    }

    getAutoRotationAngle() {
        return ((2 * Math.PI) / 60 / 60) * this.autoRotateSpeed;
    }

    rotateLeft(angle: number) {
        this.sphericalDelta.theta -= angle;
    }

    rotateUp(angle: number) {
        this.sphericalDelta.phi -= angle;
    }

    panLeft(distance: number, objectMatrix: Matrix4) {
        vector.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
        vector.multiplyScalar(-distance);

        this.panOffset.add(vector);
    }

    panUp(distance: number, objectMatrix: Matrix4) {
        vector.setFromMatrixColumn(objectMatrix, 1); // get Y column of objectMatrix
        vector.multiplyScalar(distance);

        this.panOffset.add(vector);
    }

    pan(deltaX: number, deltaY: number) {
        if (this.object instanceof PerspectiveCamera) {
            // perspective
            vector.copy(this.object.position).sub(this.target);
            let targetDistance = vector.length();

            // half of the fov is center to top of screen
            targetDistance *= Math.tan(((this.object.fov / 2) * Math.PI) / 180.0);

            // we actually don't use screenWidth, since perspective camera is fixed to screen height
            this.panLeft(
                (2 * deltaX * targetDistance) / this.domElement.clientHeight,
                this.object.matrix
            );
            this.panUp(
                (2 * deltaY * targetDistance) / this.domElement.clientHeight,
                this.object.matrix
            );
        } else if (this.object instanceof OrthographicCamera) {
            // orthographic
            this.panLeft(
                (deltaX * (this.object.right - this.object.left)) /
                    this.object.zoom /
                    this.domElement.clientWidth,
                this.object.matrix
            );
            this.panUp(
                (deltaY * (this.object.top - this.object.bottom)) /
                    this.object.zoom /
                    this.domElement.clientHeight,
                this.object.matrix
            );
        } else {
            // camera neither orthographic nor perspective
            console.warn(
                "WARNING: OrbitControls.js encountered an unknown camera type - " + "pan disabled."
            );
            this.enablePan = false;
        }
    }

    assignZoom(zoomValue: number) {
        if (this.object instanceof PerspectiveCamera) {
            this.distanceDelta = zoomValue;
        } else if (this.object instanceof OrthographicCamera) {
            this.orthographicZoomDelta = zoomValue;
        } else {
            console.warn(
                "WARNING: OrbitControls.js encountered an unknown camera type - " +
                    "dolly / zoom disabled."
            );
            this.enableZoom = false;
        }
    }

    handleMouseDownRotate(event: MouseEvent) {
        this.rotateStart.set(event.clientX, event.clientY);
    }

    handleMouseDownDolly(event: MouseEvent) {
        this.zoomStart.set(event.clientX, event.clientY);
    }

    handleMouseDownPan(event: MouseEvent) {
        this.panStart.set(event.clientX, event.clientY);
    }

    handleMouseMoveRotate(event: MouseEvent) {
        this.rotateEnd.set(event.clientX, event.clientY);
        this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);

        // rotating across whole screen goes 360 degrees around
        this.rotateLeft(
            ((2 * Math.PI * this.rotateDelta.x) / this.domElement.clientWidth) * this.rotateSpeed
        );

        // rotating up and down along whole screen attempts to go 360, but limited to 180
        this.rotateUp(
            ((2 * Math.PI * this.rotateDelta.y) / this.domElement.clientHeight) * this.rotateSpeed
        );

        this.rotateStart.copy(this.rotateEnd);

        this.update();
    }

    handleMouseMoveDolly(event: MouseEvent) {
        //console.log( 'handleMouseMoveDolly' );

        this.zoomEnd.set(event.clientX, event.clientY);

        this.zoomDelta.subVectors(this.zoomEnd, this.zoomStart);

        const zoomSign = this.zoomDelta.y < 0 ? -1 : this.zoomDelta.y > 0 ? 1 : 0;

        this.assignZoom((1 - Math.pow(0.95, this.zoomSpeed)) * zoomSign);

        this.zoomStart.copy(this.zoomEnd);

        this.update();
    }

    handleMouseMovePan(event: MouseEvent) {
        //console.log( 'handleMouseMovePan' );

        this.panEnd.set(event.clientX, event.clientY);

        this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.panSpeed);

        this.pan(this.panDelta.x, this.panDelta.y);

        this.panStart.copy(this.panEnd);

        this.update();
    }

    handleMouseUp(event: MouseEvent) {
        // console.log( 'handleMouseUp' );
    }

    handleMouseWheel(event: MouseWheelEvent) {
        // console.log( 'handleMouseWheel' );

        const zoomSign = event.deltaY < 0 ? -1 : event.deltaY > 0 ? 1 : 0;

        this.assignZoom((1 - Math.pow(0.95, this.zoomSpeed)) * zoomSign);

        this.update();
    }

    handleKeyDown(event: KeyboardEvent) {
        //console.log( 'handleKeyDown' );

        switch (event.keyCode) {
            case this.keys.UP:
                this.pan(0, this.keyPanSpeed);
                this.update();
                break;

            case this.keys.BOTTOM:
                this.pan(0, -this.keyPanSpeed);
                this.update();
                break;

            case this.keys.LEFT:
                this.pan(this.keyPanSpeed, 0);
                this.update();
                break;

            case this.keys.RIGHT:
                this.pan(-this.keyPanSpeed, 0);
                this.update();
                break;
        }
    }

    handleTouchStartRotate(event: TouchEvent) {
        //console.log( 'handleTouchStartRotate' );

        this.rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
    }

    handleTouchStartDolly(event: TouchEvent) {
        //console.log( 'handleTouchStartDolly' );

        const dx = event.touches[0].pageX - event.touches[1].pageX;
        const dy = event.touches[0].pageY - event.touches[1].pageY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        this.zoomStart.set(0, distance);
    }

    handleTouchStartPan(event: TouchEvent) {
        //console.log( 'handleTouchStartPan' );

        this.panStart.set(event.touches[0].pageX, event.touches[0].pageY);
    }

    handleTouchMoveRotate(event: TouchEvent) {
        //console.log( 'handleTouchMoveRotate' );

        this.rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
        this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);

        // rotating across whole screen goes 360 degrees around
        this.rotateLeft(
            ((2 * Math.PI * this.rotateDelta.x) / this.domElement.clientWidth) * this.rotateSpeed
        );

        // rotating up and down along whole screen attempts to go 360, but limited to 180
        this.rotateUp(
            ((2 * Math.PI * this.rotateDelta.y) / this.domElement.clientHeight) * this.rotateSpeed
        );

        this.rotateStart.copy(this.rotateEnd);

        this.update();
    }

    handleTouchMoveDolly(event: TouchEvent) {
        //console.log( 'handleTouchMoveDolly' );

        const dx = event.touches[0].pageX - event.touches[1].pageX;
        const dy = event.touches[0].pageY - event.touches[1].pageY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        this.zoomEnd.set(0, distance);

        this.zoomDelta.subVectors(this.zoomEnd, this.zoomStart);

        const zoomSign = this.zoomDelta.y > 0 ? -1 : this.zoomDelta.y < 0 ? 1 : 0;

        this.assignZoom((1 - Math.pow(0.95, this.zoomSpeed)) * zoomSign);

        this.zoomStart.copy(this.zoomEnd);

        this.update();
    }

    handleTouchMovePan(event: TouchEvent) {
        //console.log( 'handleTouchMovePan' );

        this.panEnd.set(event.touches[0].pageX, event.touches[0].pageY);

        this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.panSpeed);

        this.pan(this.panDelta.x, this.panDelta.y);

        this.panStart.copy(this.panEnd);

        this.update();
    }

    handleTouchEnd(event: TouchEvent) {
        //console.log( 'handleTouchEnd' );
    }

    onMouseDown(event: MouseEvent) {
        if (!this.enabled) {
            return;
        }

        event.preventDefault();

        switch (event.button) {
            case this.mouseButtons.ORBIT:
                if (!this.enableRotate) {
                    return;
                }

                this.handleMouseDownRotate(event);

                this.mouseState = MOUSE_STATE.ROTATE;

                break;

            case this.mouseButtons.ZOOM:
                if (!this.enableZoom) {
                    return;
                }

                this.handleMouseDownDolly(event);

                this.mouseState = MOUSE_STATE.DOLLY;

                break;

            case this.mouseButtons.PAN:
                if (!this.enablePan) {
                    return;
                }

                this.handleMouseDownPan(event);

                this.mouseState = MOUSE_STATE.PAN;

                break;
        }

        if (this.mouseState !== MOUSE_STATE.NONE) {
            document.addEventListener("mousemove", this.onMouseMove, false);
            document.addEventListener("mouseup", this.onMouseUp, false);

            this.dispatchEvent(startEvent);
        }
    }

    onMouseMove(event: MouseEvent) {
        if (!this.enabled) {
            return;
        }

        event.preventDefault();

        switch (this.mouseState) {
            case MOUSE_STATE.ROTATE:
                if (!this.enableRotate) {
                    return;
                }
                this.handleMouseMoveRotate(event);
                break;

            case MOUSE_STATE.DOLLY:
                if (!this.enableZoom) {
                    return;
                }
                this.handleMouseMoveDolly(event);
                break;

            case MOUSE_STATE.PAN:
                if (!this.enablePan) {
                    return;
                }
                this.handleMouseMovePan(event);
                break;
        }
    }

    onMouseUp(event: MouseEvent) {
        if (!this.enabled) {
            return;
        }

        this.handleMouseUp(event);

        document.removeEventListener("mousemove", this.onMouseMove, false);
        document.removeEventListener("mouseup", this.onMouseUp, false);

        this.dispatchEvent(endEvent);

        this.mouseState = MOUSE_STATE.NONE;
    }

    onMouseWheel(event: MouseWheelEvent) {
        if (
            !this.enabled ||
            !this.enableZoom ||
            (this.mouseState !== MOUSE_STATE.NONE && this.mouseState !== MOUSE_STATE.ROTATE)
        ) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();

        this.handleMouseWheel(event);

        this.dispatchEvent(startEvent);
        this.dispatchEvent(endEvent);
    }

    onKeyDown(event: KeyboardEvent) {
        if (!this.enabled || !this.enableKeys || !this.enablePan) {
            return;
        }

        this.handleKeyDown(event);
    }

    onTouchStart(event: TouchEvent) {
        if (!this.enabled) {
            return;
        }

        switch (event.touches.length) {
            case 1: // one-fingered touch: rotate
                if (!this.enableRotate) {
                    return;
                }
                this.handleTouchStartRotate(event);
                this.mouseState = MOUSE_STATE.TOUCH_ROTATE;
                break;

            case 2: // two-fingered touch: dolly
                if (!this.enableZoom) {
                    return;
                }
                this.handleTouchStartDolly(event);
                this.mouseState = MOUSE_STATE.TOUCH_DOLLY;
                break;

            case 3: // three-fingered touch: pan
                if (!this.enablePan) {
                    return;
                }
                this.handleTouchStartPan(event);
                this.mouseState = MOUSE_STATE.TOUCH_PAN;
                break;

            default:
                this.mouseState = MOUSE_STATE.NONE;
        }

        if (this.mouseState !== MOUSE_STATE.NONE) {
            this.dispatchEvent(startEvent);
        }
    }

    onTouchMove(event: TouchEvent) {
        if (!this.enabled) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        switch (event.touches.length) {
            case 1: // one-fingered touch: rotate
                if (!this.enableRotate) {
                    return;
                }
                if (this.mouseState !== MOUSE_STATE.TOUCH_ROTATE) {
                    return;
                }
                this.handleTouchMoveRotate(event);
                break;

            case 2: // two-fingered touch: dolly
                if (!this.enableZoom) {
                    return;
                }
                if (this.mouseState !== MOUSE_STATE.TOUCH_DOLLY) {
                    return;
                }
                this.handleTouchMoveDolly(event);
                break;

            case 3: // three-fingered touch: pan
                if (!this.enablePan) {
                    return;
                }
                if (this.mouseState !== MOUSE_STATE.TOUCH_PAN) {
                    return;
                }
                this.handleTouchMovePan(event);
                break;

            default:
                this.mouseState = MOUSE_STATE.NONE;
        }
    }

    onTouchEnd(event: TouchEvent) {
        if (!this.enabled) {
            return;
        }

        this.handleTouchEnd(event);

        this.dispatchEvent(endEvent);

        this.mouseState = MOUSE_STATE.NONE;
    }

    onContextMenu(event: MouseEvent) {
        if (!this.enabled) {
            return;
        }

        event.preventDefault();
    }
}
