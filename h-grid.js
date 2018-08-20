import { objectParse, objectStringify, fastBind } from 'utils';
import {reduce, map} from 'lodash';

const CHILD_DEFAULT_COMPONENTS = ['texture', 'transitions'];
const MAX_ROWS = 5;

AFRAME.registerComponent("grid", {
    schema: {
        marginColumn: { default: 0.1, min: 0, max: 1, hideBehavior: true },
        marginRow: { default: 0.1, min: 0, max: 1, hideBehavior: true },
        curved: { default: true, hideBehavior: true },
        tiltTilesToCenter: { default: false, hideBehavior: true },
        maxRows: {default: MAX_ROWS, hide: true},
      children: {
        type: "layout",
        parse: objectParse,
        stringify: objectStringify,
        hideLabel: true,
        default: {
          a: {
            layoutPosition: { x: 0, y: 0, w: 1, h: 1},
            id: 'a',
            texture: {
              color: "blue",  
            },     
        },
        b:{
          layoutPosition: { x: 5, y: 3, w: 1, h: 1},
          id: 'b',
            texture: {
                    color: "yellow",
                  },
            }
          }
        }
    },
  
    init: function() {
      this.convertLayout = AFRAME.utils.bind(this.convertLayout, this);
      this.createCurve = AFRAME.utils.bind(this.createCurve, this);
      this.putBox = AFRAME.utils.bind(this.putBox, this);
      this.MAX_ROWS = MAX_ROWS;
    },
  
    update: function() {
      this.removeTiles();
      this.createCurve();
      this.convertLayout();
      this.putBox();
    },
  
    createCurve: function() {
      let curveForce = 4/3;
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
      let geometry = this.setFromPoints(new THREE.BufferGeometry(), this.points);
      let material = new THREE.LineBasicMaterial({ color: 0xff0000 });
  
      // Create the final object to add to the scene
      let mesh = this.el.getOrCreateObject3D("mesh", THREE.Line);
  
      let lineMaterial = mesh.material
        ? mesh.material
        : new THREE.LineBasicMaterial({
            color: "#ff0000"
          });
  
      let lineGeometry = new THREE.Geometry();
  
      // Get the points
      lineGeometry.vertices = this.curve.getPoints(this.points.length * 10);
      this.el.setObject3D("mesh", new THREE.Line(lineGeometry, lineMaterial));
    },
  
    // // To match Unity (0,0) using Reduce
    // calculateRowCount: function() {
    //   this.rowCount = _.reduce(this.data.childs, (rowCount, child, childId) => {
    //     if (child.layoutPosition.y + child.layoutPosition.h > rowCount) {
    //       rowCount = child.layoutPosition.y + child.layoutPosition.h;
    //     }
    //     return rowCount;
    //   }, 0);
    // },
  
    // Creating the layout for every child
    convertLayout: function() {
      // this.calculateRowCount();
      let margC = this.data.marginColumn; 
      let margR = this.data.marginRow;
      let gridId = this.el.getAttribute('id');
      this.aframeLayout = _.map(this.data.children, (child, childId) => {
        const {layoutPosition} = child;
        const {x,y,w,h} = layoutPosition;
        const childComponents = _.omit(child, ['id', 'layoutPosition']);
        // calculate aframe positioning here
        // i - index
        // x,y - position
        // w,h - size
        return Object.assign({}, {
          id: `${gridId}_${childId}`,
          x:
            x +
            0.5 * w +
            margC * x +
            0.5 * margC * (w - 1), // If this is a wider than 1 object - add the number of margin needed
          y:
            y +
            0.5 * h +
            margR * y +
            0.5 * margR * (h - 1), // Same here for height
          h: h + margR * (h - 1), // New height (with margin)
          w: w + margC * (w - 1), // Same for widht
        }, childComponents);
      });
    },
  
    putBox: function() {
      const self = this;
      let margC = this.data.marginColumn;
      const lookAtY = this.data.tiltTilesToCenter;
      this.aframeLayout.map(function(child) {
        let childEntity = document.createElement("a-entity");
        childEntity.setAttribute('id',child.id);
        // Different Rendering if curved
        if (self.data.curved) {
          const curvePoint = self.curve.getPointAt(
            child.x / self.curve.getLength()
          );
          AFRAME.utils.entity.setComponentProperty(childEntity, "position", {
            x: curvePoint.x,
            y: MAX_ROWS - child.y,
            z: -curvePoint.y
          });
          AFRAME.utils.entity.setComponentProperty(childEntity, "look-at", {
            x: 0,
            y: lookAtY ? 0 : MAX_ROWS - child.y,
            z: 0
          });
        } else {
          AFRAME.utils.entity.setComponentProperty(childEntity, "position", {
            x: child.x - (6 + 5.5 * margC), // Adding the math to center it (with margin)
            y: MAX_ROWS - child.y, // There is 12/2 column and 11/2 margin needed to shift
            z: -self.radius // Fixing the curve radius
          });
        }
        AFRAME.utils.entity.setComponentProperty(childEntity, "geometry", {
          primitive: "plane",
          width: child.w,
          height: child.h
        });

        _.forEach(CHILD_DEFAULT_COMPONENTS, (componentName) => {
            AFRAME.utils.entity.setComponentProperty(childEntity, componentName, child[componentName] || {});   
        });

        _.forEach(child, (component, componentName) => {
          if(componentName.startsWith('animation__'))
            AFRAME.utils.entity.setComponentProperty(childEntity, componentName, component);   
        });

        self.el.appendChild(childEntity);
      });
    },
  
    // From THREE.js rev88 (AFRAME 0.7.1 use rev87)
    setFromPoints: function(bufferGeometry, points) {
      let position = [];
  
      for (let i = 0, l = points.length; i < l; i++) {
        let point = points[i];
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
  