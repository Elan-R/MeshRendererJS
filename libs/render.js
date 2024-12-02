class Camera extends Positioned(Oriented) {
    constructor(position, forward, up, lightPosition, lightDirection) {
        super(position);
        Oriented.call(this, forward, up);
        this.lightPosition = lightPosition;
        this.lightDirection = lightDirection;
    }
}

class Renderer {
    constructor(camera, distanceToScreen, width, height, xStep, yStep, fontData) {
        this.camera = camera;
        this.distanceToScreen = distanceToScreen;
        this.width = width;
        this.height = height;
        this.xStep = xStep;
        this.yStep = yStep;
        this.fontData = fontData;
    }

    generateFrame(...meshes) {
        const data = Array.from({length: this.height}, () => Array.from({length: this.width}, () => ' '));
        const donutBuffer = Array.from({length: this.height}, () => Array.from({length: this.width}, () => -1));
        
        for (const mesh of meshes) {
            for (const triangle of mesh) {
                const projectedTriangle = this.projectTriangle(triangle);
                log("before");
                if (!projectedTriangle) continue;
                log("OKAY");
                const parameterizedTriangle = this.parametrizeTriangle(projectedTriangle);
                this.draw(data, donutBuffer, parameterizedTriangle);
            }
        }

        return data;
    }

    projectTriangle(triangle) {
        const p1 = this.projectPoint(triangle.p1);
        const p2 = this.projectPoint(triangle.p2);
        const p3 = this.projectPoint(triangle.p3);

        if (!p1 || !p2 || !p3) {
            return null;
        }

        const theta = angle(vector(p1, p2), vector(p2, p3));

        if (isClose(theta, 0) || isClose(theta, PI)) {
            return null;
        } else {
            return new Triangle3D(p1, p2, p3, triangle);
        }
    }

    projectPoint(point) {
        const cameraToScreen = scale(this.camera.forward, this.distanceToScreen);
        const cameraToPoint = vector(this.camera.position, point);
        const denominator = dot(cameraToScreen, cameraToPoint);

        if (denominator <= 0) {
            return null;
        }

        const cameraToProjectedPoint = scale(
            cameraToPoint,
            dot(cameraToScreen, cameraToScreen) / denominator
        );
        return shift(this.camera.position, cameraToProjectedPoint);
    }

    parametrizeTriangle(triangle) {
        return new Triangle2D(
            this.parametrizePoint(triangle.p1),
            this.parametrizePoint(triangle.p2),
            this.parametrizePoint(triangle.p3),
            triangle.original
        );
    }

    parametrizePoint(point) {
        const cameraToScreen = scale(this.camera.forward, this.distanceToScreen);
        const projectedPoint = shift(vector(this.camera.position, point), negate(cameraToScreen));
        return new Point2D(
            comp(this.camera.right, projectedPoint),
            comp(this.camera.up, projectedPoint)
        );
    }

    draw(data, donutBuffer, triangle) {
        const interiorPoints = this.findInteriorPoints(triangle);
        const character = this.assignCharacter(triangle.original);

        for (const [point, distance] of interiorPoints) {
            log(point);
            if (0 <= point.y && point.y < this.height && 0 <= point.x && point.x < this.width) {
                const currentDistance = donutBuffer[point.y][point.x];
                if (distance >= 0 && (currentDistance <= 0 || distance < currentDistance)) {
                    data[point.y][point.x] = character;
                }
            }
        }
    }

    findInteriorPoints(triangle) {
        const result = [];
        const box = boundingRectangle(triangle);

        for (let x = box.bottomLeft.x; x <= box.topRight.x; x += this.xStep) {
            for (let y = box.bottomLeft.y; y <= box.topRight.y; y += this.yStep) {
                const point = new Point2D(x, y);

                if (triangleInterior(point, triangle)) {
                    const screenX = Math.round(x * 1 / this.xStep + this.width / 2);
                    const screenY = this.height - Math.round(y * 1 / this.yStep + this.height / 2) - 1;
                    result.push([
                        new Point2D(screenX, screenY),
                        this.getDonutValue(point, triangle.original)
                    ]);
                }
            }
        }

        return result;
    }

    getDonutValue(point, triangle) {
        const cameraToScreen = scale(this.camera.forward, this.distanceToScreen);
        const planeOrigin = shift(this.camera.position, cameraToScreen);
        const pointOnPlane = shift(
            shift(
                planeOrigin,
                scale(this.camera.right, point.x)
            ),
            scale(this.camera.up, point.y)
        );
        const n = normal(triangle);
        return dot(vector(this.camera.position, triangle.p1), n) /
            dot(normalize(vector(this.camera.position, pointOnPlane)), n);
    }

    assignCharacter(triangle) {
        const lightDirection = normalize(this.camera.lightDirection);
        const light = shift(
            shift(scale(this.camera.forward, lightDirection.x), scale(this.camera.right, lightDirection.y)),
            scale(this.camera.up, lightDirection.z)
        );
        const theta = angle(normal(triangle), light) % (PI / 2);
        return assignCharacter(2 * theta / PI, this.fontData, false);
    }
}
