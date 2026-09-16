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
});
