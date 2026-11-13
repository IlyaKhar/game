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
export function trainSurface(type,z){if(Math.abs(z)<=TRAIN_LENGTH/2)return roofHeight(type);if(type==='train-moving'&&z>=MOVING_BACK&&z< -TRAIN_LENGTH/2)return WAGON_ROOF;if(type==='train-ramp'&&z>TRAIN_LENGTH/2&&z<RAMP_END)return WAGON_ROOF*(RAMP_END-z)/(RAMP_END-TRAIN_LENGTH/2);return 0}
export function canStandOnTrain(previousHeight, nextHeight, descending, wasGrounded, surface, type, maxRampStep=.4, wasOnRamp=false){
  if(surface<=0)return false;
  const normalLanding=descending&&previousHeight>=surface-.03&&nextHeight<=surface;
  const roofTransfer=descending&&previousHeight>=WAGON_ROOF-ROOF_LANDING_TOLERANCE&&previousHeight>=surface-ROOF_LANDING_TOLERANCE&&nextHeight<=surface;
  const rampClimb=type==='train-ramp'&&descending&&(wasGrounded||wasOnRamp)&&surface-previousHeight<=maxRampStep;
  return normalLanding||roofTransfer||rampClimb;
}
export function hitsTrain(type,z,h){if(type==='train-moving'&&z>=MOVING_BACK&&z< -TRAIN_LENGTH/2)return h<WAGON_ROOF-.02;return Math.abs(z)<=TRAIN_LENGTH/2&&h<roofHeight(type)-.02}
