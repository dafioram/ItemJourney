import { useMemo } from 'react';
import { Combobox, type ComboOption } from './Combobox';
import type { ID, Owner } from '../../engine/types';

interface OwnerComboProps {
  ownerId: ID | null;
  owners: Owner[];
  onChange: (ownerId: ID | null) => void;
  onCreate: (name: string) => ID;
  disabled?: boolean;
  'aria-label'?: string;
}

const UNASSIGNED_KEY = '__unassigned__';

export function OwnerCombo({ ownerId, owners, onChange, onCreate, disabled, ...rest }: OwnerComboProps) {
  const options: ComboOption[] = useMemo(
    () => [
      { key: UNASSIGNED_KEY, label: 'Unassigned', pinned: true },
      ...owners.map((o) => ({ key: o.id, label: o.name })),
    ],
    [owners],
  );

  const current = ownerId ? owners.find((o) => o.id === ownerId) : null;
  const value = current ? current.name : 'Unassigned';

  return (
    <Combobox
      value={value}
      options={options}
      placeholder="Unassigned"
      allowCreate
      createLabel={(text) => `Add new owner "${text}"`}
      onSelect={(opt) => onChange(opt.key === UNASSIGNED_KEY ? null : opt.key)}
      onCreate={(text) => onChange(onCreate(text))}
      disabled={disabled}
      aria-label={rest['aria-label'] ?? 'Owner'}
    />
  );
}
