
export class LocationData {
  id?: string;
  latitude: number = 0;
  longitude: number = 0;
  timestamp?: number;
  speed?: number;
  distance: number = 0;
  synced?: boolean;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TaskParams {
  delay: number;
}