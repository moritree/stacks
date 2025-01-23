interface Position {
  x: number;
  y: number;
}

interface TextEntity {
  type: "text";
  pos: Position;
  content: string;
}

export type Entity = TextEntity; // Add other entity types here as needed

export interface SceneState {
  [key: string]: Entity;
}
