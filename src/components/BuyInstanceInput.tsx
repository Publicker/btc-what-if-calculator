import { Select, NumberInput, Button } from "@mantine/core";
import type { BuyInstance } from "../types";

interface BuyInstanceInputProps {
  instance: BuyInstance;
  onUpdate: (updatedInstance: BuyInstance) => void;
  onDelete: () => void;
}

export function BuyInstanceInput({
  instance,
  onUpdate,
  onDelete,
}: BuyInstanceInputProps) {
  return (
    <div className="flex items-center space-x-2 mb-2">
      <NumberInput
        value={instance.amount}
        onChange={(value) => onUpdate({ ...instance, amount: Number(value) })}
        label="Amount (USD)"
        min={0}
      />
      <Select
        value={instance.frequency}
        onChange={(value) =>
          onUpdate({
            ...instance,
            frequency: value as BuyInstance["frequency"],
          })
        }
        data={[
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
        ]}
        label="Frequency"
      />
      {instance.frequency === "weekly" && (
        <Select
          value={instance.dayOfWeek?.toString()}
          onChange={(value) =>
            onUpdate({ ...instance, dayOfWeek: Number(value) })
          }
          data={[
            { value: "0", label: "Sunday" },
            { value: "1", label: "Monday" },
            { value: "2", label: "Tuesday" },
            { value: "3", label: "Wednesday" },
            { value: "4", label: "Thursday" },
            { value: "5", label: "Friday" },
            { value: "6", label: "Saturday" },
          ]}
          label="Day of Week"
        />
      )}
      {instance.frequency === "monthly" && (
        <NumberInput
          value={instance.dayOfMonth}
          onChange={(value) =>
            onUpdate({ ...instance, dayOfMonth: Number(value) })
          }
          label="Day of Month"
          min={1}
          max={31}
        />
      )}
      <Button onClick={onDelete} color="red" className="self-end">
        Delete
      </Button>
    </div>
  );
}
