interface RectEntity {
  type: "rect";
  color: string;
  size: { width: number; height: number };
}

interface TextEntity {
  type: "text";
  content: string;
  font_size?: number;
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
  font_size?: number;
  color: string;
  disabled?: string;
}

interface BaseEntity {
  id: string;
  scripts: { [key: string]: string };
  pos: { x: number; y: number };
  selectable?: boolean;
  rotation?: number;
}

export type Entity = BaseEntity &
  (RectEntity | TextEntity | SvgEntity | TextInputEntity);
