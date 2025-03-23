import { ComponentChild } from "preact";

interface TabItemProps {
  children?: ComponentChild | ComponentChild[];
  label?: String;
  isActive?: boolean;
  onClick?: () => void;
  atBottom?: boolean;
}

export default function TabItem(props: TabItemProps) {
  const activeClasses = props.isActive
    ? `${props.atBottom ? "border-t-2" : "border-b-2"} border-accent text-accent`
    : `${props.atBottom ? "border-t-2" : "border-b-2"} border-secondary text-tertiary hover:text-text-color`;

  return (
    <button
      class={`flex flex-row overflow-hidden gap-2 p-1 grow justify-center transition-colors duration-200 ${activeClasses}`}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
