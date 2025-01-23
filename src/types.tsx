interface Position {
  x: number;
  y: number;
}

interface Color {
  r: number;
  g: number;
  b: number;
}

interface TextEntity {
  type: "text";
  pos: Position;
  content: string;
}

interface RectEntity {
  type: "rect";
  pos: Position;
  dimension: Position;
  color: Color;
}

export type Entity = TextEntity | RectEntity;

export interface SceneState {
  [key: string]: Entity;
}
