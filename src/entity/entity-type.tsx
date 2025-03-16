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
  scripts_available: Set<string>;
  scripts_str: string;
  pos: { x: number; y: number };
  draggable?: Boolean;
}

export type Entity = BaseEntity & (RectEntity | TextEntity);
