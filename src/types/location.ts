
export class LocationData {
  id?: string;
  latitude?: number;
  longitude?: number;
  timestamp?: number;
  speed?: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TaskParams {
  delay: number;
}