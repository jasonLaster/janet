import { describe, it, expect, vi, beforeEach } from 'vitest';
import { suggestNewName } from '../../src/services/openai.js';

// Use vi.hoisted to create mock function that's available during module initialization
const mockCreateFn = vi.hoisted(() => vi.fn());

// Mock the OpenAI module
vi.mock('openai', () => ({
  OpenAI: vi.fn(() => ({
    chat: {
      completions: {
        create: mockCreateFn
      }
    }
  }))
}));

describe('OpenAI Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateFn.mockClear();
  });

  describe('suggestNewName', () => {
    it('should suggest a new filename based on content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({ filename: '20240101_Invoice_123.pdf' })
          }
        }]
      };

      mockCreateFn.mockResolvedValueOnce(mockResponse);

      const result = await suggestNewName('old.pdf', 'Invoice #123 content');
      expect(result).toBe('20240101_Invoice_123.pdf');
      expect(mockCreateFn).toHaveBeenCalledTimes(1);
    });

    it('should return original filename if API fails', async () => {
      mockCreateFn.mockRejectedValueOnce(new Error('API Error'));

      const result = await suggestNewName('original.pdf', 'content');
      expect(result).toBe('original.pdf');
      expect(mockCreateFn).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed API responses', async () => {
      mockCreateFn.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'not valid json'
          }
        }]
      });

      const result = await suggestNewName('original.pdf', 'content');
      expect(result).toBe('original.pdf');
      expect(mockCreateFn).toHaveBeenCalledTimes(1);
    });
  });
}); 