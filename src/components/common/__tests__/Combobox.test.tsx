import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox } from '../Combobox';

const options = [
  { key: 'a', label: 'Ava' },
  { key: 'b', label: 'Bill' },
  { key: 'unassigned', label: 'Unassigned', pinned: true },
];

describe('Combobox', () => {
  it('filters options as you type', async () => {
    const user = userEvent.setup();
    render(<Combobox value="" options={options} onSelect={vi.fn()} aria-label="Owner" />);

    const input = screen.getByRole('combobox', { name: 'Owner' });
    await user.click(input);
    await user.type(input, 'Av');

    expect(await screen.findByRole('option', { name: 'Ava' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Bill' })).not.toBeInTheDocument();
  });

  it('calls onSelect when an option is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Combobox value="" options={options} onSelect={onSelect} aria-label="Owner" />);

    await user.click(screen.getByRole('combobox', { name: 'Owner' }));
    await user.click(await screen.findByRole('option', { name: 'Bill' }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ key: 'b', label: 'Bill' }));
  });

  it('offers to create a new entry when there is no exact match', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(
      <Combobox value="" options={options} onSelect={vi.fn()} onCreate={onCreate} allowCreate aria-label="Owner" />,
    );

    const input = screen.getByRole('combobox', { name: 'Owner' });
    await user.click(input);
    await user.type(input, 'Priya');

    const createOption = await screen.findByText('Create "Priya"');
    await user.click(createOption);
    expect(onCreate).toHaveBeenCalledWith('Priya');
  });

  it('does not offer to create when the text exactly matches an existing option', async () => {
    const user = userEvent.setup();
    render(<Combobox value="" options={options} onSelect={vi.fn()} allowCreate aria-label="Owner" />);

    const input = screen.getByRole('combobox', { name: 'Owner' });
    await user.click(input);
    await user.type(input, 'Ava');

    expect(screen.queryByText(/Create "/)).not.toBeInTheDocument();
  });

  it('commits an exact match on blur, even without clicking the dropdown option or pressing Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <div>
        <Combobox value="" options={options} onSelect={onSelect} aria-label="Owner" />
        <button>elsewhere</button>
      </div>,
    );

    const input = screen.getByRole('combobox', { name: 'Owner' });
    await user.click(input);
    await user.type(input, 'Ava');
    // Click a totally unrelated element instead of the dropdown option or Enter.
    await user.click(screen.getByRole('button', { name: 'elsewhere' }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ key: 'a', label: 'Ava' }));
  });

  it('commits an exact match on blur regardless of typed casing, using the option\'s stored casing', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <div>
        <Combobox value="" options={options} onSelect={onSelect} aria-label="Owner" />
        <button>elsewhere</button>
      </div>,
    );

    const input = screen.getByRole('combobox', { name: 'Owner' });
    await user.click(input);
    await user.type(input, 'ava');
    await user.click(screen.getByRole('button', { name: 'elsewhere' }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ key: 'a', label: 'Ava' }));
  });

  it('reverts to the last committed value on blur when the typed text matches nothing', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <div>
        <Combobox value="Ava" options={options} onSelect={onSelect} aria-label="Owner" />
        <button>elsewhere</button>
      </div>,
    );

    const input = screen.getByRole('combobox', { name: 'Owner' });
    await user.click(input);
    await user.clear(input);
    await user.type(input, 'Av');
    await user.click(screen.getByRole('button', { name: 'elsewhere' }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(input).toHaveValue('Ava');
  });

  it('commits an exact match on Enter even if a different row is highlighted', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Combobox value="" options={options} onSelect={onSelect} aria-label="Owner" />);

    const input = screen.getByRole('combobox', { name: 'Owner' });
    await user.click(input);
    await user.type(input, 'Bill');
    // Arrow up past the top of the list - highlight clamps to 0 (Bill is filtered[0] here anyway,
    // but this exercises the "exact match wins over whatever is highlighted" path).
    await user.keyboard('{ArrowUp}{ArrowUp}');
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ key: 'b', label: 'Bill' }));
  });
});
