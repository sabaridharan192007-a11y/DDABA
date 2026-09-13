import { useEffect, useId, useState } from "react";

interface RecommendedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  options?: readonly string[];
  labels?: Record<string, string>;
  storageKey: string;
}

const STORAGE_PREFIX = "ddaba-recommendations:";

export function RecommendedInput({
  value,
  onChange,
  options = [],
  labels = {},
  storageKey,
  ...inputProps
}: RecommendedInputProps) {
  const generatedId = useId().replace(/:/g, "");
  const listId = `${generatedId}-${storageKey.replace(/[^a-zA-Z0-9-]/g, "-")}`;
  const [customOptions, setCustomOptions] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`) || "[]");
      if (Array.isArray(saved)) {
        setCustomOptions(saved.filter((item): item is string => typeof item === "string" && item.trim().length > 0));
      }
    } catch {
      // A malformed recommendation cache should not prevent the form from working.
      setCustomOptions([]);
    }
  }, [storageKey]);

  function rememberValue() {
    const nextValue = value.trim();
    if (!nextValue || options.includes(nextValue) || customOptions.includes(nextValue)) return;
    const nextOptions = [...customOptions, nextValue].slice(-50);
    setCustomOptions(nextOptions);
    localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify(nextOptions));
  }

  const recommendationOptions = [...options, ...customOptions.filter((item) => !options.includes(item))];

  return (
    <>
      <input
        {...inputProps}
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={rememberValue}
      />
      <datalist id={listId}>
        {recommendationOptions.map((option) => (
          <option key={option} value={option} label={labels[option] || option} />
        ))}
      </datalist>
    </>
  );
}
