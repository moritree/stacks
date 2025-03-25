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

interface SvgEntity {
  type: "svg";
  content: string;
  size: { width: number; height: number };
}

interface BaseEntity {
  id: string;
  scripts: { [key: string]: string };
  pos: { x: number; y: number };
  draggable?: boolean;
  rotation?: number;
}

export type Entity = BaseEntity & (RectEntity | TextEntity | SvgEntity);
