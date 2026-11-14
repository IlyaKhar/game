// Coordinates are relative to the centre of the closed wagon; positive z is toward the player.
export const TRAIN_LENGTH=7.2;
export const WAGON_ROOF=2.5;
export const LOCO_ROOF=2.74;
export const MOVING_BACK=-TRAIN_LENGTH*2.5;
export const RAMP_END=TRAIN_LENGTH/2+4.8;
export const GROUND_JUMP_SPEED=8.8;
export const GRAVITY=22;
// Small frame-to-frame gaps between neighbouring roofs should not turn a
// landing into a fatal side collision. A ground jump cannot reach this band.
export const ROOF_LANDING_TOLERANCE=.4;
export function roofHeight(type){return type==='train-moving'?LOCO_ROOF:WAGON_ROOF}

export function trainSurface(type,z){
  if(Math.abs(z)<=TRAIN_LENGTH/2)return roofHeight(type);
  if(type==='train-moving'&&z>=MOVING_BACK&&z< -TRAIN_LENGTH/2)return WAGON_ROOF;
  if(type==='train-ramp'&&z>TRAIN_LENGTH/2&&z<=RAMP_END)return WAGON_ROOF*(RAMP_END-z)/(RAMP_END-TRAIN_LENGTH/2);
  return 0;
}

export function canStandOnTrain(previousHeight, nextHeight, descending, wasGrounded, surface, type, maxRampStep=.4, wasOnRamp=false){
  if(surface<=0)return false;

  // On a ramp train, the incline and roof always catch and support the player
  if(type==='train-ramp'){
    if(wasOnRamp)return true;
    if(wasGrounded&&surface<=maxRampStep+0.35)return true;
    if(nextHeight<=surface+0.35)return true;
    if(descending&&previousHeight>=surface-0.6&&nextHeight<=surface+0.2)return true;
    return false;
  }

  // Standard train wagons / locomotives
  const normalLanding=descending&&previousHeight>=surface-0.25&&nextHeight<=surface+0.12;
  const roofTransfer=descending&&previousHeight>=WAGON_ROOF-ROOF_LANDING_TOLERANCE&&nextHeight<=surface+0.12;
  return normalLanding||roofTransfer;
}

export function hitsTrain(type,z,h){
  // If player is on top of or landing onto the train surface, never trigger a fatal crash
  const surface=trainSurface(type,z);
  if(surface>0&&h>=surface-0.22){
    return false;
  }

  // Moving train following wagons
  if(type==='train-moving'&&z>=MOVING_BACK&&z< -TRAIN_LENGTH/2){
    return h<WAGON_ROOF-0.15;
  }

  // Ramp train: front (z > 0.2) is the on-ramp, climbing/jumping onto it must never crash
  if(type==='train-ramp'){
    if(z>0.2){
      return h<surface-0.45&&z<=TRAIN_LENGTH/2-0.6;
    }
    return Math.abs(z)<=TRAIN_LENGTH/2&&h<WAGON_ROOF-0.15;
  }

  // Still or locomotive front: flat wall collision
  return Math.abs(z)<=TRAIN_LENGTH/2&&h<roofHeight(type)-0.15;
}
