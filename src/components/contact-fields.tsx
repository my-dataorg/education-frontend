"use client";

import type { ContactInput } from "@/lib/contact";

const inputClass = "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm";

function Field({
  id,
  label,
  value,
  onChange,
  required,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={required && type !== "tel" ? 2 : undefined}
        autoComplete={autoComplete}
        className={inputClass}
      />
    </div>
  );
}

export function ContactFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: ContactInput;
  onChange: (next: ContactInput | ((current: ContactInput) => ContactInput)) => void;
}) {
  function set(key: keyof ContactInput, next: string) {
    onChange((current) => ({ ...current, [key]: next }));
  }

  return (
    <div className="space-y-3">
      <Field
        id={`${idPrefix}-contact`}
        label="Contact person"
        required
        value={value.contactName}
        onChange={(next) => set("contactName", next)}
        autoComplete="name"
      />
      <Field
        id={`${idPrefix}-phone`}
        label="Phone"
        required
        type="tel"
        value={value.phone}
        onChange={(next) => set("phone", next)}
        autoComplete="tel"
      />
      <Field
        id={`${idPrefix}-address`}
        label="Address"
        required
        value={value.address}
        onChange={(next) => set("address", next)}
        autoComplete="street-address"
      />
      <Field
        id={`${idPrefix}-city`}
        label="City"
        required
        value={value.city}
        onChange={(next) => set("city", next)}
        autoComplete="address-level2"
      />
      <Field
        id={`${idPrefix}-state`}
        label="State"
        value={value.state}
        onChange={(next) => set("state", next)}
        autoComplete="address-level1"
      />
      <Field
        id={`${idPrefix}-pin`}
        label="PIN code"
        value={value.postalCode}
        onChange={(next) => set("postalCode", next)}
        autoComplete="postal-code"
      />
    </div>
  );
}
