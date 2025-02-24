export type Coordinate = {
  x: number;
  y: number;
};

export interface RectEntity {
  type: "rect";
  color: string;
  dimension: Coordinate;
}

export interface TextEntity {
  type: "text";
  content: string;
}

interface BaseEntity {
  id: string;
  type: string;
  pos: Coordinate;
  draggable?: Boolean;
  on_click?: Boolean;
}

export type Entity = BaseEntity & (RectEntity | TextEntity);
