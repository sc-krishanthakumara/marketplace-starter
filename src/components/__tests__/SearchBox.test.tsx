// Unit tests for SearchBox component

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from '../SearchBox';

describe('SearchBox', () => {
  it('should render with default placeholder', () => {
    const mockOnSearch = jest.fn();
    render(<SearchBox onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText('Search text content...');
    expect(input).toBeInTheDocument();
  });

  it('should render with custom placeholder', () => {
    const mockOnSearch = jest.fn();
    render(
      <SearchBox onSearch={mockOnSearch} placeholder="Custom search..." />
    );

    const input = screen.getByPlaceholderText('Custom search...');
    expect(input).toBeInTheDocument();
  });

  it('should call onSearch after debounce delay', async () => {
    jest.useFakeTimers();
    const mockOnSearch = jest.fn();
    render(<SearchBox onSearch={mockOnSearch} debounceMs={300} />);

    const input = screen.getByPlaceholderText('Search text content...');
    fireEvent.change(input, { target: { value: 'test' } });

    // Should not be called immediately
    expect(mockOnSearch).not.toHaveBeenCalled();

    // Fast-forward time
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test');
    });

    jest.useRealTimers();
  });

  it('should display clear button when input has value', () => {
    const mockOnSearch = jest.fn();
    render(<SearchBox onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText('Search text content...');
    
    // Initially no clear button
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();

    // Type something
    fireEvent.change(input, { target: { value: 'test' } });

    // Clear button should appear
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('should clear input when clear button is clicked', async () => {
    jest.useFakeTimers();
    const mockOnSearch = jest.fn();
    render(<SearchBox onSearch={mockOnSearch} debounceMs={100} />);

    const input = screen.getByPlaceholderText(
      'Search text content...'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });

    expect(input.value).toBe('test');

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    expect(input.value).toBe('');

    // Should trigger search with empty string
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('');
    });

    jest.useRealTimers();
  });

  it('should render with initial value', () => {
    const mockOnSearch = jest.fn();
    render(<SearchBox onSearch={mockOnSearch} initialValue="initial" />);

    const input = screen.getByPlaceholderText(
      'Search text content...'
    ) as HTMLInputElement;
    expect(input.value).toBe('initial');
  });

  it('should debounce multiple rapid changes', async () => {
    jest.useFakeTimers();
    const mockOnSearch = jest.fn();
    render(<SearchBox onSearch={mockOnSearch} debounceMs={300} />);

    const input = screen.getByPlaceholderText('Search text content...');

    // Type multiple characters rapidly
    fireEvent.change(input, { target: { value: 't' } });
    fireEvent.change(input, { target: { value: 'te' } });
    fireEvent.change(input, { target: { value: 'tes' } });
    fireEvent.change(input, { target: { value: 'test' } });

    // Should not be called yet
    expect(mockOnSearch).not.toHaveBeenCalled();

    // Fast-forward time
    jest.advanceTimersByTime(300);

    // Should only be called once with final value
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledTimes(1);
      expect(mockOnSearch).toHaveBeenCalledWith('test');
    });

    jest.useRealTimers();
  });
});
