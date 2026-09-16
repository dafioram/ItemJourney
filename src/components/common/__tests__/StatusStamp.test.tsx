import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusStamp } from '../StatusStamp';

describe('StatusStamp', () => {
  it('renders the correct label per status', () => {
    const { rerender } = render(<StatusStamp status="pending" />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();

    rerender(<StatusStamp status="active" />);
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();

    rerender(<StatusStamp status="removed" />);
    expect(screen.getByText('REMOVED')).toBeInTheDocument();
  });
});
