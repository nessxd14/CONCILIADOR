"use client";

export function Tabs<T extends string>({ items, value, onChange, label, id }: {
  items: { value: T; label: string; count?: number }[];
  value: T; onChange: (value: T) => void; label: string; id: string;
}) {
  return <div className="tabs" role="tablist" aria-label={label}>
    {items.map((item, index) => <button key={item.value} type="button" role="tab"
      id={`${id}-tab-${item.value}`} aria-controls={`${id}-panel`} aria-selected={value === item.value}
      tabIndex={value === item.value ? 0 : -1} onClick={() => onChange(item.value)}
      onKeyDown={(event) => {
        let next = index;
        if (event.key === "ArrowRight") next = (index + 1) % items.length;
        else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = items.length - 1;
        else return;
        event.preventDefault(); onChange(items[next].value);
        document.getElementById(`${id}-tab-${items[next].value}`)?.focus();
      }}>
      {item.label}{item.count !== undefined && <span className="tab-count">{item.count}</span>}
    </button>)}
  </div>;
}
