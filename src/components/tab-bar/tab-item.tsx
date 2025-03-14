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
    ? `${props.atBottom ? "border-t-2" : "border-b-2"} border-blue-500 text-blue-500`
    : `${props.atBottom ? "border-t-2" : "border-b-2"} border-gray-100 text-gray-500 hover:text-gray-700`;

  return (
    <button
      class={`flex flex-row overflow-hidden gap-2 p-1 grow justify-center transition-colors duration-200 ${activeClasses}`}
      onClick={props.onClick}
    >
      {/* {props.label || "X"} */}
      {props.children}
    </button>
  );
}
