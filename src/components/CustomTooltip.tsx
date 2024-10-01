import { Paper, Text } from "@mantine/core";
import { format } from "date-fns";
import { formatAmount } from "../utils";
import type { HistoricalDataPoint } from "@/types";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: HistoricalDataPoint }>;
  label?: string;
}

export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length && label) {
    return (
      <Paper p="md" shadow="sm">
        <Text size="sm" fw={500}>
          {format(payload[0].payload.date, "MMM dd, yyyy")}
        </Text>
        <Text size="xs">Return: {payload[0].value.toFixed(2)}%</Text>
        <Text size="xs">
          BTC Price: ${formatAmount(payload[0].payload.close)}
        </Text>
      </Paper>
    );
  }
  return null;
}
