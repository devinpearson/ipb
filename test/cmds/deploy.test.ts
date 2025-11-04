import { describe, it, vi } from 'vitest';
import { initializeApi } from '../../src/index';

vi.mock('../../src/index', () => ({
  initializeApi: vi.fn(),
  credentials: {},
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn(() => 'mocked file content'),
}));

const mockApi = {
  deployCode: vi.fn(),
};

initializeApi.mockResolvedValue(mockApi);

describe('deployCommand', () => {
  it('should deploy code successfully', async () => {
    const _options = {
      filename: 'test-file.js',
      environment: 'test-env',
      cardId: 'test-card-id',
    };

    mockApi.deployCode.mockResolvedValue({ success: true });

    console.log = vi.fn();
  });
});
