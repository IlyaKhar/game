import * as THREE from './three.module.js';

// Reusable, lightweight models. All sizes are in game units; ground is y = 0.
const materials = {
  orange: new THREE.MeshStandardMaterial({color:0xe86336, roughness:.7}),
  bright: new THREE.MeshStandardMaterial({color:0xff9a55, roughness:.65}),
  stripe: new THREE.MeshStandardMaterial({color:0xffe6be, roughness:.72, side:THREE.DoubleSide}),
  frame: new THREE.MeshStandardMaterial({color:0x3f3b54, roughness:.8}),
  dark: new THREE.MeshStandardMaterial({color:0x29283d, roughness:.82}),
  bolt: new THREE.MeshStandardMaterial({color:0xaeb7c5, metalness:.35, roughness:.5})
};
const cube = new THREE.BoxGeometry(1,1,1);
const boltGeometry = new THREE.SphereGeometry(.045,8,6);
function block(parent, size, pos, material, rotation=0){const obj=new THREE.Mesh(cube,material);obj.scale.set(...size);obj.position.set(...pos);obj.rotation.z=rotation;parent.add(obj);return obj}
function bolt(parent,x,y,z){const b=new THREE.Mesh(boltGeometry,materials.bolt);b.position.set(x,y,z);parent.add(b)}
// Stripe polygons are clipped to the sign face so no texture or external image is required.
function stripes(parent,width,height,y,z){
  const slope=.46, step=.68, stripeWidth=.27;
  for(let x=-width/2-height*slope-step;x<width/2+height*slope;x+=step){
    let poly=[[x,-height/2],[x+stripeWidth,-height/2],[x+stripeWidth+height*slope,height/2],[x+height*slope,height/2]];
    for(const [axis,limit,keepGreater] of [[0,-width/2,true],[0,width/2,false]]){
      const output=[]; for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],inside=p=>keepGreater?p[axis]>=limit:p[axis]<=limit; if(inside(a))output.push(a);if(inside(a)!==inside(b)){const t=(limit-a[axis])/(b[axis]-a[axis]);output.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}}poly=output;
    }
    if(poly.length<3)continue;const vertices=[];for(let i=1;i<poly.length-1;i++)for(const p of [poly[0],poly[i],poly[i+1]])vertices.push(p[0],p[1]+y,z);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();parent.add(new THREE.Mesh(geometry,materials.stripe));
  }
}
function sign(parent,width,height,y,depth){block(parent,[width,height,depth],[0,y,0],materials.orange);stripes(parent,width-.08,height-.08,y,depth/2+.007);block(parent,[width,.08,depth+.03],[0,y+height/2,0],materials.bright);block(parent,[width,.07,depth+.03],[0,y-height/2,0],materials.dark);for(const x of [-width/2+.13,width/2-.13])for(const yy of [y-height/2+.11,y+height/2-.11])bolt(parent,x,yy,depth/2+.025)}
function low(){const g=new THREE.Group();for(const x of [-.95,.95]){block(g,[.2,.56,.22],[x,.31,0],materials.frame);const foot=block(g,[.24,.14,.9],[x,.09,0],materials.dark);foot.rotation.x=-.1}sign(g,2.35,.55,.7,.27);return g}
function high(){const g=new THREE.Group();for(const x of [-1.13,1.13]){block(g,[.24,2.12,.32],[x,1.08,0],materials.frame);block(g,[.36,.14,.7],[x,.07,0],materials.dark);block(g,[.34,.22,.4],[x,2.12,0],materials.orange)}sign(g,2.52,.48,1.87,.32);return g}
function tall(){const g=new THREE.Group();block(g,[2.25,2.3,.82],[0,1.24,0],materials.orange);block(g,[2.42,.18,1],[0,.09,0],materials.dark);block(g,[2.4,.2,.96],[0,2.44,0],materials.bright);block(g,[1.92,1.7,.025],[0,1.28,.425],materials.orange);stripes(g,1.85,.64,1.1,.445);for(const x of [-.93,.93])for(const y of [.42,2.05])bolt(g,x,y,.46);return g}
const factories={low,high,block:tall};
const prototypes = {};
export function createObstacle(type){if(!factories[type])throw new Error(`Unknown obstacle: ${type}`);if(!prototypes[type])prototypes[type]=factories[type]();return prototypes[type].clone(true)}
