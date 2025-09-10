import { describe, it, expect } from 'vitest';

describe('Project Setup', () => {
  it('should have basic project configuration working', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support ES modules', () => {
    const result = Promise.resolve('ES modules working');
    expect(result).toBeInstanceOf(Promise);
  });
});
