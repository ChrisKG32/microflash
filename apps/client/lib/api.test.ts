/**
 * API Client Smoke Tests
 *
 * Tests for edge cases in the API client, particularly:
 * - 204 No Content response handling
 * - Non-JSON error body handling
 *
 * These tests verify the shared @microflash/api-client behavior
 * through the mobile adapter.
 */

// Mock fetch globally before any imports
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the api-client client module to reset configuration between tests
jest.mock('@microflash/api-client/client', () => {
  const actual = jest.requireActual('@microflash/api-client/client');
  return {
    ...actual,
    // Allow reconfiguration for tests
    isApiClientConfigured: jest.fn(() => false),
  };
});

describe('API client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Reset modules to get fresh configuration
    jest.resetModules();
  });

  describe('204 No Content handling', () => {
    it('deleteDeck succeeds on 204 No Content response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      // Import fresh for each test
      const { deleteDeck } = require('./api');
      await expect(deleteDeck('deck-123')).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/decks/deck-123'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('deleteCard succeeds on 204 No Content response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      const { deleteCard } = require('./api');
      await expect(deleteCard('card-456')).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/cards/card-456'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('unsnoozeCard succeeds on 204 No Content response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      const { unsnoozeCard } = require('./api');
      await expect(unsnoozeCard('card-789')).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/notifications/cards/card-789/snooze'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('Error handling', () => {
    it('throws ApiError with code and message from JSON error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: jest.fn().mockResolvedValue({
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
          },
        }),
      });

      const { getDeck, ApiError } = require('./api');

      await expect(getDeck('non-existent')).rejects.toThrow(ApiError);

      try {
        await getDeck('non-existent-2');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as { status: number }).status).toBe(404);
        expect((err as { code: string }).code).toBe('NOT_FOUND');
        expect((err as { message: string }).message).toBe('Resource not found');
      }
    });

    it('handles non-JSON error response gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      const { getDeck, ApiError } = require('./api');

      await expect(getDeck('some-deck')).rejects.toThrow(ApiError);

      try {
        await getDeck('some-deck-2');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as { status: number }).status).toBe(500);
        expect((err as { code: string }).code).toBe('UNKNOWN');
      }
    });

    it('handles error response without error object gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: jest.fn().mockResolvedValue({ message: 'Bad request' }),
      });

      const { getDeck, ApiError } = require('./api');

      await expect(getDeck('some-deck')).rejects.toThrow(ApiError);

      try {
        await getDeck('some-deck-2');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as { status: number }).status).toBe(400);
        expect((err as { code: string }).code).toBe('UNKNOWN');
        expect((err as { message: string }).message).toBe('Unknown error');
      }
    });
  });

  describe('Successful JSON responses', () => {
    it('parses JSON response correctly', async () => {
      const mockDeckData = {
        id: 'deck-1',
        title: 'Test Deck',
        description: null,
        priority: 50,
        cardCount: 10,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: jest.fn().mockResolvedValue({ deck: mockDeckData }),
      });

      const { getDeck } = require('./api');
      const result = await getDeck('deck-1');

      expect(result).toEqual({ deck: mockDeckData });
    });
  });
});
