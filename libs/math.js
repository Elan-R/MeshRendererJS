const PRECISION = 2;
const TOLERANCE = 1e-10;

function isClose(n, v) {
    return Math.abs(n - v) <= TOLERANCE;
}

function isZero(n) {
    return isClose(n, 0);
}

class Point3D {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        Object.freeze(this);
    }

    toString() {
        return `P3(${this.x.toFixed(PRECISION)}, ${this.y.toFixed(PRECISION)}, ${this.z.toFixed(PRECISION)})`;
    }
}

Point3D.origin = new Point3D(0, 0, 0);

class Vector3D {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        Object.freeze(this);
    }

    toString() {
        return `V3(${this.x.toFixed(PRECISION)}, ${this.y.toFixed(PRECISION)}, ${this.z.toFixed(PRECISION)})`;
    }
}

Vector3D.up = new Vector3D(0, 0, 1);
Vector3D.down = new Vector3D(0, 0, -1);
Vector3D.right = new Vector3D(0, 1, 0);
Vector3D.left = new Vector3D(0, -1, 0);
Vector3D.forward = new Vector3D(1, 0, 0);
Vector3D.back = new Vector3D(-1, 0, 0);

class Point2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        Object.freeze(this);
    }

    toString() {
        return `P2(${this.x.toFixed(PRECISION)}, ${this.y.toFixed(PRECISION)})`;
    }
}

Point2D.origin = new Point2D(0, 0);

class Vector2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        Object.freeze(this);
    }

    toString() {
        return `V2(${this.x.toFixed(PRECISION)}, ${this.y.toFixed(PRECISION)})`;
    }
}

Vector2D.up = new Vector2D(0, 1);
Vector2D.down = new Vector2D(0, -1);
Vector2D.right = new Vector2D(1, 0);
Vector2D.left = new Vector2D(-1, 0);

class Triangle3D {
    constructor(p1, p2, p3, original = null) {
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
        this.original = original;
        Object.freeze(this);
    }

    toString() {
        return `T3(${this.p1}, ${this.p2}, ${this.p3}, ${this.original})`;
    }
}

class Triangle2D {
    constructor(p1, p2, p3, original) {
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
        this.original = original;
        Object.freeze(this);
    }

    toString() {
        return `T2(${this.p1}, ${this.p2}, ${this.p3}, ${this.original})`;
    }
}

class Rectangle {
    constructor(bottomLeft, topRight) {
        this.bottomLeft = bottomLeft;
        this.topRight = topRight;
        Object.freeze(this);
    }

    toString() {
        return `R(${this.bottomLeft}, ${this.topRight})`;
    }
}

class Object3D {
    constructor(position, forward, up) {
        this._position = position;
        this._forward = normalize(forward);
        this._up = normalize(up);
        if (!isClose(magnitude(this.right), 1)) {
            throw new Error(
                `Forward and up vectors must be orthogonal: forward: ${forward}, up: ${up}`
            );
        }
    }

    get position() {
        return this._position;
    }

    shift(vector) {
        this._position = shift(this._position, vector);
    }

    shiftBy(vector, distance) {
        this.shift(scale(normalize(vector), distance));
    }

    encircle(center, normal, theta) {
        this._position = encircle(this._position, center, normal, theta);
    }

    get forward() {
        return normalize(this._forward);
    }

    get up() {
        return normalize(this._up);
    }

    get right() {
        return cross(this.forward, this.up);
    }

    yaw(theta) {
        this._forward = vectorEncircle(this.forward, this.up, theta);
    }

    pitch(theta) {
        this._forward = vectorEncircle(this.forward, this.right, theta);
        this._up = vectorEncircle(this.up, this.right, theta);
    }

    roll(theta) {
        this._up = vectorEncircle(this.up, this.forward, theta);
    }
}

function magnitude(v) {
    return Math.sqrt(dot(v, v));
}

function normalize(v) {
    const mag = magnitude(v);
    if (isZero(mag)) {
        throw new Error(`Cannot normalize a zero vector: ${v}`);
    }
    return scale(v, 1 / mag);
}

function negate(v) {
    return new Vector3D(-v.x, -v.y, -v.z);
}

function shift(p, v) {
    return new Point3D(p.x + v.x, p.y + v.y, p.z + v.z);
}

function encircle(p, c, n, t) {
    const xVector = vector(c, shift(p, negate(proj(n, vector(c, p)))));
    const yVector = scale(
        normalize(cross(vector(c, p), n)),
        magnitude(xVector)
    );
    return shift(
        shift(shift(c, scale(xVector, Math.cos(t))), scale(yVector, Math.sin(t))),
        proj(n, vector(c, p))
    );
}

function vectorEncircle(v, n, t) {
    const xVector = shift(v, negate(proj(n, v)));
    const yVector = scale(normalize(cross(v, n)), magnitude(xVector));
    return shift(
        shift(scale(xVector, Math.cos(t)), scale(yVector, Math.sin(t))),
        proj(n, v)
    );
}

function vector(a, b) {
    return new Vector3D(b.x - a.x, b.y - a.y, b.z - a.z);
}

function vector2D(a, b) {
    return new Vector2D(b.x - a.x, b.y - a.y);
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a, b) {
    return new Vector3D(
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x
    );
}

function scale(v, b) {
    return new Vector3D(v.x * b, v.y * b, v.z * b);
}

function comp(a, b) {
    return dot(normalize(a), b);
}

function proj(a, b) {
    return scale(normalize(a), comp(a, b));
}

function angle(a, b) {
    return Math.acos(dot(normalize(a), normalize(b)));
}

function normal(t) {
    return cross(vector(t.p1, t.p2), vector(t.p1, t.p3));
}

function boundingRectangle(t) {
    const xCoords = [t.p1.x, t.p2.x, t.p3.x];
    const yCoords = [t.p1.y, t.p2.y, t.p3.y];
    return new Rectangle(
        new Point2D(Math.min(...xCoords), Math.min(...yCoords)),
        new Point2D(Math.max(...xCoords), Math.max(...yCoords))
    );
}

function det(a, b) {
    return a.x * b.y - a.y * b.x;
}

function triangleInterior(p, t) {
    const v1 = vector2D(t.p1, t.p2);
    const v2 = vector2D(t.p1, t.p3);

    const denominator = det(v1, v2);

    if (isZero(denominator)) {
        return false;
    }

    const vp = vector2D(t.p1, p);

    const a = det(vp, v2) / denominator;
    const b = -det(vp, v1) / denominator;

    return a >= 0 && b >= 0 && a + b <= 1;
}
