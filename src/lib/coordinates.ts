const WORLD_FACTOR = {
  x: 0.05,
  y: -0.05
}


export function world2screen(x: number, y: number): {x:number; y:number;} 
export function world2screen(x: number): {x:number; y:number;} 

export function world2screen(x: number, y?: number) {
  if(y === undefined){
    return {
      x: x/WORLD_FACTOR.x,
      y: x/WORLD_FACTOR.y
    }
  }else{
    return {
      x: x/WORLD_FACTOR.x,
      y: y/WORLD_FACTOR.y,
    }
  }
}


export function screen2world(x: number, y: number): {x:number; y:number;} 
export function screen2world(x: number): {x:number; y:number;} 

export function screen2world(x: number, y?: number) {
  if(y === undefined){
    return {
      x: x*WORLD_FACTOR.x,
      y: x*WORLD_FACTOR.y,
    }
  }else {
    return {
      x: x*WORLD_FACTOR.x,
      y: y*WORLD_FACTOR.y,
    }
  }
}
