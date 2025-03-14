interface RectEntity {
  type: "rect";
  color: string;
  size: { width: number; height: number };
}

interface TextEntity {
  type: "text";
  content: string;
}

interface BaseEntity {
  id: string;
  pos: { x: number; y: number };
  draggable?: Boolean;
  on_click?: Boolean;
}

export type Entity = BaseEntity & (RectEntity | TextEntity);
