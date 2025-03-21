interface RectEntity {
  type: "rect";
  color: string;
  size: { width: number; height: number };
}

interface TextEntity {
  type: "text";
  content: string;
  fontSize?: number;
}

interface BaseEntity {
  id: string;
  scripts: { [key: string]: string };
  pos: { x: number; y: number };
  draggable?: Boolean;
  rotation?: number;
}

export type Entity = BaseEntity & (RectEntity | TextEntity);
