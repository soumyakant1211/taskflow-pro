import { describe, expect, it } from 'vitest';
import { paginate } from './pagination.dto.js';

describe('paginate', () => {
  it('computes total pages', () => {
    expect(paginate([1, 2], 45, 2, 20).meta).toEqual({ page: 2, limit: 20, total: 45, totalPages: 3 });
  });
  it('reports at least one page for empty results', () => {
    expect(paginate([], 0, 1, 20).meta.totalPages).toBe(1);
  });
});
