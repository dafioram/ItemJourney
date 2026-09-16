import { useMemo } from 'react';
import { Combobox, type ComboOption } from './Combobox';
import type { Container, ContainerRef, ID } from '../../engine/types';

interface ContainerComboProps {
  value: ContainerRef;
  containers: Container[];
  onChange: (ref: ContainerRef) => void;
  onCreateBox: (name: string) => ID;
  /** Item creation can't set Removed directly - it never makes sense for a brand-new item. */
  allowRemoved?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

export function ContainerCombo({
  value,
  containers,
  onChange,
  onCreateBox,
  allowRemoved = true,
  disabled,
  ...rest
}: ContainerComboProps) {
  const options: ComboOption[] = useMemo(() => {
    const pinned: ComboOption[] = [
      { key: 'reserved:None', label: 'None (unboxed)', pinned: true },
      { key: 'reserved:Pending', label: 'Pending (not yet introduced)', pinned: true },
    ];
    if (allowRemoved) pinned.push({ key: 'reserved:Removed', label: 'Removed (exited)', pinned: true });
    return [...pinned, ...containers.map((c) => ({ key: `box:${c.id}`, label: c.name }))];
  }, [containers, allowRemoved]);

  const currentLabel = useMemo(() => {
    if (value.kind === 'reserved') {
      if (value.value === 'None') return 'None (unboxed)';
      if (value.value === 'Pending') return 'Pending (not yet introduced)';
      return 'Removed (exited)';
    }
    return containers.find((c) => c.id === value.containerId)?.name ?? '(unknown box)';
  }, [value, containers]);

  return (
    <Combobox
      value={currentLabel}
      options={options}
      placeholder="Choose a box or status..."
      allowCreate
      createLabel={(text) => `Create new box "${text}"`}
      onSelect={(opt) => {
        if (opt.key.startsWith('reserved:')) {
          const v = opt.key.split(':')[1] as 'None' | 'Pending' | 'Removed';
          onChange({ kind: 'reserved', value: v });
        } else {
          onChange({ kind: 'box', containerId: opt.key.slice(4) });
        }
      }}
      onCreate={(text) => onChange({ kind: 'box', containerId: onCreateBox(text) })}
      disabled={disabled}
      aria-label={rest['aria-label'] ?? 'Box'}
    />
  );
}
