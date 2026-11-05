import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

/** A native SwiftUI segmented control, the phone's version of the web's tabs and toggle groups. */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: "stretch" }}>
      <Picker selection={value} onSelectionChange={(v) => onChange(v as T)} modifiers={[pickerStyle("segmented")]}>
        {options.map((o) => (
          <Text key={o.value} modifiers={[tag(o.value)]}>
            {o.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
