class Camera extends Object3D {
    constructor(position, forward, up, lightPosition, lightDirection) {
        super(position, forward, up);
        this.lightPosition = lightPosition;
        this.lightDirection = lightDirection;
    }
}

class Mesh extends Object3D {
    constructor(position, forward, up, triangles) {
        super(position, forward, up);
        this.triangles = triangles;
    }
}

FOV = Math.PI / 4;

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
        const data = Array.from({length: this.height}, () => Array.from({length: this.width}, () => " "));
        const donutBuffer = Array.from({length: this.height}, () => Array.from({length: this.width}, () => -1));

        for (const mesh of meshes) {
            for (const triangle of mesh.triangles) {
                const placedTriangle = this.placeTriangle(triangle, mesh);
                const projectedTriangle = this.projectTriangle(placedTriangle);
                if (!projectedTriangle) continue;
                const parameterizedTriangle = this.parametrizeTriangle(projectedTriangle);
                this.draw(data, donutBuffer, parameterizedTriangle);
            }
        }

        return data;
    }

    placeTriangle(triangle, mesh) {
        return new Triangle3D(
            this.placePoint(triangle.p1, mesh),
            this.placePoint(triangle.p2, mesh),
            this.placePoint(triangle.p3, mesh)
        );
    }

    placePoint(point, mesh) {
        return shift(shift(shift(mesh.position, scale(mesh.forward, point.x)), scale(mesh.right, point.y)), scale(mesh.up, point.z));
    }

    projectTriangle(triangle) {
        const p1 = this.projectPoint(triangle.p1);
        const p2 = this.projectPoint(triangle.p2);
        const p3 = this.projectPoint(triangle.p3);

        if (!p1 || !p2 || !p3) {
            return null;
        }

        const theta = angle(vector(p1, p2), vector(p2, p3));

        if (isClose(theta, 0) || isClose(theta, Math.PI)) {
            return null;
        } else {
            return new Triangle3D(p1, p2, p3, triangle);
        }
    }

    projectPoint(point) {
        const cameraToScreen = scale(this.camera.forward, this.distanceToScreen);
        const cameraToPoint = vector(this.camera.position, point);
        if (angle(cameraToScreen, cameraToPoint) > FOV) return null;

        const cameraToProjectedPoint = scale(
            cameraToPoint,
            dot(cameraToScreen, cameraToScreen) / dot(cameraToScreen, cameraToPoint)
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
            const gridPoint = this.toGridPoint(point);
            if (0 <= gridPoint.y && gridPoint.y < this.height && 0 <= gridPoint.x && gridPoint.x < this.width) {
                const currentDistance = donutBuffer[gridPoint.y][gridPoint.x];
                if (distance >= 0 && (currentDistance <= 0 || distance < currentDistance)) {
                    donutBuffer[gridPoint.y][gridPoint.x] = distance;
                    data[gridPoint.y][gridPoint.x] = character;
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
                if (!triangleInterior(point, triangle, 0)) continue;
                result.push([point, this.getDonutValue(point, triangle.original)]);
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
        return dot(vector(this.camera.position, triangle.p1), n) / dot(normalize(vector(this.camera.position, pointOnPlane)), n);
    }

    assignCharacter(triangle) {
        const lightDirection = normalize(this.camera.lightDirection);
        const light = shift(
            shift(scale(this.camera.forward, lightDirection.x), scale(this.camera.right, lightDirection.y)),
            scale(this.camera.up, lightDirection.z)
        );
        let theta = angle(normal(triangle), light);
        if (theta > Math.PI / 2) theta = Math.PI - theta;
        return assignCharacter(2 * theta / Math.PI, this.fontData, true);
    }

    toGridPoint(point) {
        return new Point2D(
            Math.round(point.x / this.xStep + this.width / 2),
            this.height - Math.round(point.y / this.yStep + this.height / 2) - 1
        );
    }
}
