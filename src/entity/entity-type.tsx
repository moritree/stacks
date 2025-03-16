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
  scripts: any;
  pos: { x: number; y: number };
  draggable?: Boolean;
}

export type Entity = BaseEntity & (RectEntity | TextEntity);
