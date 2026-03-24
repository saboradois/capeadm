import * as React from "react";
import { Input } from "@/components/ui/input";

interface NumberInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number;
  onValueChange: (value: number) => void;
  decimal?: boolean;
  min?: number;
}

export function NumberInput({ value, onValueChange, decimal = false, min, ...props }: NumberInputProps) {
  const [raw, setRaw] = React.useState<string>(() => value ? String(value) : '');

  React.useEffect(() => {
    // Sync from external state only if input isn't focused
    setRaw(prev => {
      const parsed = decimal ? parseFloat(prev) : parseInt(prev);
      if (prev === '' && value === 0) return '';
      if (!isNaN(parsed) && parsed === value) return prev;
      return value ? String(value) : '';
    });
  }, [value, decimal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setRaw(v);
    if (v === '' || v === '-') {
      onValueChange(0);
      return;
    }
    const parsed = decimal ? parseFloat(v) : parseInt(v);
    if (!isNaN(parsed)) {
      onValueChange(parsed);
    }
  };

  const handleBlur = () => {
    if (raw === '') {
      const minVal = min ?? 0;
      onValueChange(minVal);
      setRaw(minVal ? String(minVal) : '');
    }
  };

  return (
    <Input
      type="number"
      value={raw}
      onChange={handleChange}
      onBlur={handleBlur}
      min={min}
      {...props}
    />
  );
}
