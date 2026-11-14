// Keep the current lane clear until the next lane has been clear long enough
// for every previously spawned train or obstacle to pass the player.
export const CORRIDOR_CLEARANCE = 120;
export function createCorridor(random=Math.random){
  return {lane:Math.floor(random()*3),target:null,transitionAt:140+random()*100};
}
export function corridorAt(corridor,distance,random=Math.random){
  if(corridor.target!==null && distance>=corridor.transitionAt+CORRIDOR_CLEARANCE){
    corridor.lane=corridor.target;corridor.target=null;
    corridor.transitionAt=distance+150+random()*100;
  }
  if(corridor.target===null && distance>=corridor.transitionAt){
    const neighbours=[corridor.lane-1,corridor.lane+1].filter(lane=>lane>=0&&lane<3);
    corridor.target=neighbours[Math.floor(random()*neighbours.length)];
    corridor.transitionAt=distance;
  }
  return corridor.target===null?[corridor.lane]:[corridor.lane,corridor.target];
}
export function speedAt(distance){
  // Progressive speed acceleration: starts at comfortable 14.5, picks up speed fast, caps at 34
  const base = 14.5;
  const boost = Math.pow(Math.max(0, distance), 0.52) * 0.65;
  return Math.min(34, base + boost);
}
