interface TabItemProps {
  label?: String;
  isActive?: boolean;
  onClick?: () => void;
}

export default function TabItem(props: TabItemProps) {
  const activeClasses = props.isActive
    ? "border-b-2 border-blue-500 text-blue-500"
    : "text-gray-500 hover:text-gray-700";

  return (
    <button
      class={`grow justify-center transition-colors duration-200 ${activeClasses}`}
      onClick={props.onClick}
    >
      {props.label || "X"}
    </button>
  );
}
