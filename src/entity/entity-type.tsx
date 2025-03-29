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

interface TextInputEntity {
  type: "text_input";
  content?: string;
  placeholder?: string;
  size: { width: number; height: number };
  fontSize?: number;
  color: string;
}

interface BaseEntity {
  id: string;
  scripts: { [key: string]: string };
  pos: { x: number; y: number };
  draggable?: boolean;
  rotation?: number;
}

export type Entity = BaseEntity &
  (RectEntity | TextEntity | SvgEntity | TextInputEntity);
