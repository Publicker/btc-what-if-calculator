interface ResultRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  type?: "positive" | "negative";
}

export function ResultRow({ icon, label, value, type }: ResultRowProps) {
  const valueColor =
    type === "positive"
      ? "text-green-600"
      : type === "negative"
      ? "text-red-600"
      : "text-gray-800";

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center">
        <span className="mr-2 text-gray-500">{icon}</span>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
    </div>
  );
}
