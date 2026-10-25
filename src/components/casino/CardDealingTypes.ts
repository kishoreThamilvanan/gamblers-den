export interface CardCoordinate {
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
}

export interface FlyingCardData {
  id: string;
  card: {
    rank: string;
    suit: string;
    value?: number;
  };
  faceDown?: boolean;
  origin: CardCoordinate;
  target: CardCoordinate;
  durationMs?: number;
  rotation?: number; // target resting rotation in degrees
  flightRotation?: number; // tilt during slide flight
  scale?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  targetSeatLabel?: string;
  onLanded?: () => void;
}

export interface CardDealQueueOptions {
  speed?: 'relaxed' | 'normal';
  onAllLanded?: () => void;
}
