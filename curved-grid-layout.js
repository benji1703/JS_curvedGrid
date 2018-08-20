AFRAME.registerComponent("curved-grid-layout", {
  schema: {
    layout: {
      type: "array",
      default: [
        { i: "a", x: 0, y: 0, w: 1, h: 1, color: "blue", texture: "https://images-na.ssl-images-amazon.com/images/I/41NQQxIgiPL._SY300_.jpg"},
        { i: "b", x: 1, y: 1, w: 1, h: 2, color: "red"},
        { i: "c", x: 2, y: 0, w: 1, h: 1 },
        { i: "d", x: 3, y: 0, w: 1, h: 1 },
        { i: "e", x: 4, y: 0, w: 1, h: 1 },
        { i: "f", x: 5, y: 0, w: 1, h: 1 },
        { i: "g", x: 6, y: 0, w: 3, h: 1 },
        { i: "i", x: 9, y: 0, w: 1, h: 1 },
        { i: "j", x: 10, y: 0, w: 1, h: 1, texture: "https://images-na.ssl-images-amazon.com/images/I/41NQQxIgiPL._SY300_.jpg" },
        { i: "k", x: 11, y: 0, w: 1, h: 1 },
        { i: "a1", x: 0, y: 1, w: 1, h: 1 },
        { i: "c1", x: 2, y: 1, w: 1, h: 1 },
        { i: "d1", x: 3, y: 1, w: 1, h: 1 },
        { i: "e1", x: 4, y: 1, w: 1, h: 1, color: "green" },
        { i: "f1", x: 5, y: 1, w: 1, h: 1 },
        { i: "g1", x: 6, y: 1, w: 1, h: 1 },
        { i: "h1", x: 7, y: 1, w: 1, h: 1 },
        { i: "i1", x: 8, y: 1, w: 1, h: 1 },
        { i: "j1", x: 9, y: 1, w: 1, h: 1 },
        { i: "k1", x: 10, y: 1, w: 1, h: 1 },
        { i: "k1", x: 11, y: 1, w: 1, h: 1, color: "yellow" }
      ]
    },
    marginColumn: { default: 0.1, min: 0, max: 1 },
    marginRow: { default: 0.1, min: 0, max: 1 },
    curved: { default: true },
    curveObject: { type: "selector" }
  },

  init: function() {
    this.convertLayout = AFRAME.utils.bind(this.convertLayout, this);
    this.createCurve = AFRAME.utils.bind(this.createCurve, this);
    this.putBox = AFRAME.utils.bind(this.putBox, this);
  },

  update: function() {
    this.removeTiles();
    this.createCurve();
    this.convertLayout();
    this.putBox();
  },

  createCurve: function() {
    var curveForce = 4/3;
    var oTherCurveForce = 0;
    this.radius = (this.data.marginColumn * 11 + 12) / (Math.PI / 2);
    this.curve = new THREE.EllipseCurve(
      0,
      0,
      this.radius,
      this.radius,
      (3 * Math.PI) / 4, // From quarter to 3/4 of half circle
      (Math.PI) / 4,
      true,
      0 // No rotation needed
    );

    // Get 14 points on curve
    this.points = this.curve.getPoints(13);

    // Create the object using those points
    var geometry = this.setFromPoints(new THREE.BufferGeometry(), this.points);
    var material = new THREE.LineBasicMaterial({ color: 0xff0000 });

    // Create the final object to add to the scene
    var curveObject = new THREE.Line(geometry, material);
    var mesh = this.el.getOrCreateObject3D("mesh", THREE.Line);

    lineMaterial = mesh.material
      ? mesh.material
      : new THREE.LineBasicMaterial({
          color: "#ff0000"
        });

    var lineGeometry = new THREE.Geometry();

    // Get the points
    lineGeometry.vertices = this.curve.getPoints(this.points.length * 10);
    this.el.setObject3D("mesh", new THREE.Line(lineGeometry, lineMaterial));
  },

  // To match Unity (0,0) using Reduce
  calculateRowCount: function() {
    this.rowCount = this.data.layout.reduce(function(rowCount, child) {
      if (child.y + child.h > rowCount) {
        rowCount = child.y + child.h;
      }
      return rowCount;
    }, 0);
  },

  // Creating the layout for every child
  convertLayout: function() {
    this.calculateRowCount();
    let margC = this.data.marginColumn;
    let margR = this.data.marginRow;
    this.aframeLayout = this.data.layout.map(function(child) {
      // calculate aframe positioning here
      // i - index
      // x,y - position
      // w,h - size
      return {
        i: child.i,
        x:
          child.x +
          0.5 * child.w +
          margC * child.x +
          0.5 * margC * (child.w - 1), // If this is a wider than 1 object - add the number of margin needed
        y:
          child.y +
          0.5 * child.h +
          margR * child.y +
          0.5 * margR * (child.h - 1), // Same here for height
        h: child.h + margR * (child.h - 1), // New height (with margin)
        w: child.w + margC * (child.w - 1), // Same for widht
        color: child.color, // Get the color of the layout
        texture: child.texture
      };
    });
  },

  putBox: function() {
    const self = this;
    let rowCount = self.rowCount;
    let margC = this.data.marginColumn;
    this.aframeLayout.map(function(child) {
      let childEntity = document.createElement("a-entity");
      childEntity.setAttribute("id", child.i);

      // Different Rendering if curved
      if (self.data.curved) {
        const curvePoint = self.curve.getPointAt(
          child.x / self.curve.getLength()
        );
        AFRAME.utils.entity.setComponentProperty(childEntity, "position", {
          x: curvePoint.x,
          y: rowCount - child.h + child.y,
          z: -curvePoint.y
        });
        AFRAME.utils.entity.setComponentProperty(childEntity, "look-at", {
          x: 0,
          y: 0,
          z: 0
        });
      } else {
        AFRAME.utils.entity.setComponentProperty(childEntity, "position", {
          x: child.x - (6 + 5.5 * margC), // Adding the math to center it (with margin)
          y: rowCount - child.h + child.y, // There is 12/2 column and 11/2 margin needed to shift
          z: -self.radius // Fixing the curve radius
        });
      }
      AFRAME.utils.entity.setComponentProperty(childEntity, "geometry", {
        primitive: "plane",
        width: child.w,
        height: child.h
      });
      AFRAME.utils.entity.setComponentProperty(childEntity, "material", {
        color: child.color,
        src: child.texture,
        side: "double"
      });
      self.el.appendChild(childEntity);
    });
  },

  // From THREE.js rev88 (AFRAME 0.7.1 use rev87)
  setFromPoints: function(bufferGeometry, points) {
    var position = [];

    for (var i = 0, l = points.length; i < l; i++) {
      var point = points[i];
      position.push(point.x, point.y, point.z || 0);
    }

    bufferGeometry.addAttribute(
      "position",
      new THREE.Float32BufferAttribute(position, 3)
    );
    return bufferGeometry;
  },

  removeTiles: function() {
    while (this.el.firstChild) {
      this.el.removeChild(this.el.firstChild);
    }
  },

  remove: function() {
    this.curve = null;
    if (this.el.getObject3D("clones")) {
      this.el.removeObject3D("clones");
    }
  }
});
