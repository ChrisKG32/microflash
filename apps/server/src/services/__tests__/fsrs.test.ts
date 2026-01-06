import {
  initializeFSRS,
  calculateInitialReviewDate,
  calculateNextReview,
  RATING_VALUES,
  STATE_VALUES,
  DEFAULT_FSRS_PARAMETERS,
  type FSRSState,
} from '../fsrs';

describe('FSRS Algorithm', () => {
  // ==========================================================================
  // initializeFSRS() Tests
  // ==========================================================================
  describe('initializeFSRS', () => {
    it('should return correct default state', () => {
      const state = initializeFSRS();

      expect(state.state).toBe('NEW');
      expect(state.reps).toBe(0);
      expect(state.lapses).toBe(0);
    });

    it('should return correct default stability', () => {
      const state = initializeFSRS();

      // Initial stability is 0 for new cards (set on first review)
      expect(state.stability).toBe(0);
    });

    it('should return correct default difficulty', () => {
      const state = initializeFSRS();

      // Initial difficulty is 0 for new cards (set on first review)
      expect(state.difficulty).toBe(0);
    });

    it('should return immutable state (independent objects)', () => {
      const state1 = initializeFSRS();
      const state2 = initializeFSRS();

      // Modify state1
      state1.reps = 100;
      state1.stability = 999;

      // state2 should be unaffected
      expect(state2.reps).toBe(0);
      expect(state2.stability).toBe(0);
    });

    it('should have null lastReview for new cards', () => {
      const state = initializeFSRS();

      expect(state.lastReview).toBeNull();
    });

    it('should have zero elapsedDays and scheduledDays', () => {
      const state = initializeFSRS();

      expect(state.elapsedDays).toBe(0);
      expect(state.scheduledDays).toBe(0);
    });
  });

  // ==========================================================================
  // calculateInitialReviewDate() Tests
  // ==========================================================================
  describe('calculateInitialReviewDate', () => {
    it('should return a date close to now', () => {
      const before = new Date();
      const reviewDate = calculateInitialReviewDate();
      const after = new Date();

      expect(reviewDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(reviewDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // ==========================================================================
  // calculateNextReview() Tests - Basic Functionality
  // ==========================================================================
  describe('calculateNextReview', () => {
    const now = new Date('2025-01-01T12:00:00Z');

    describe('with AGAIN rating', () => {
      it('should increase lapses for reviewed cards', () => {
        const state: FSRSState = {
          ...initializeFSRS(),
          state: 'REVIEW',
          reps: 5,
          lapses: 0,
          stability: 10,
          difficulty: 5,
        };

        const result = calculateNextReview(state, 'AGAIN', now);

        expect(result.state.lapses).toBe(1);
      });

      it('should produce short interval (less than 1 day)', () => {
        const state: FSRSState = {
          ...initializeFSRS(),
          state: 'REVIEW',
          reps: 5,
          stability: 10,
          difficulty: 5,
        };

        const result = calculateNextReview(state, 'AGAIN', now);
        const intervalMs = result.nextReviewDate.getTime() - now.getTime();
        const intervalDays = intervalMs / (1000 * 60 * 60 * 24);

        expect(intervalDays).toBeLessThan(1);
      });

      it('should transition REVIEW to RELEARNING', () => {
        const state: FSRSState = {
          ...initializeFSRS(),
          state: 'REVIEW',
          reps: 5,
          stability: 10,
          difficulty: 5,
        };

        const result = calculateNextReview(state, 'AGAIN', now);

        expect(result.state.state).toBe('RELEARNING');
      });
    });

    describe('with HARD rating', () => {
      it('should produce shorter interval than GOOD', () => {
        const state: FSRSState = {
          ...initializeFSRS(),
          state: 'REVIEW',
          reps: 5,
          stability: 10,
          difficulty: 5,
          lastReview: new Date('2024-12-25T12:00:00Z'),
        };

        const hardResult = calculateNextReview(state, 'HARD', now);
        const goodResult = calculateNextReview(state, 'GOOD', now);

        expect(hardResult.nextReviewDate.getTime()).toBeLessThan(
          goodResult.nextReviewDate.getTime(),
        );
      });
    });

    describe('with GOOD rating', () => {
      it('should increment reps', () => {
        const state: FSRSState = {
          ...initializeFSRS(),
          state: 'REVIEW',
          reps: 5,
          stability: 10,
          difficulty: 5,
        };

        const result = calculateNextReview(state, 'GOOD', now);

        expect(result.state.reps).toBe(6);
      });

      it('should produce future review date', () => {
        const state = initializeFSRS();

        const result = calculateNextReview(state, 'GOOD', now);

        expect(result.nextReviewDate.getTime()).toBeGreaterThan(now.getTime());
      });

      it('should transition NEW to REVIEW (graduate immediately)', () => {
        const state = initializeFSRS();

        const result = calculateNextReview(state, 'GOOD', now);

        expect(result.state.state).toBe('REVIEW');
      });
    });

    describe('with EASY rating', () => {
      it('should produce longest interval', () => {
        const state: FSRSState = {
          ...initializeFSRS(),
          state: 'REVIEW',
          reps: 5,
          stability: 10,
          difficulty: 5,
          lastReview: new Date('2024-12-25T12:00:00Z'),
        };

        const againResult = calculateNextReview(state, 'AGAIN', now);
        const hardResult = calculateNextReview(state, 'HARD', now);
        const goodResult = calculateNextReview(state, 'GOOD', now);
        const easyResult = calculateNextReview(state, 'EASY', now);

        expect(easyResult.nextReviewDate.getTime()).toBeGreaterThan(
          goodResult.nextReviewDate.getTime(),
        );
        expect(goodResult.nextReviewDate.getTime()).toBeGreaterThan(
          hardResult.nextReviewDate.getTime(),
        );
        expect(hardResult.nextReviewDate.getTime()).toBeGreaterThan(
          againResult.nextReviewDate.getTime(),
        );
      });

      it('should provide bonus to stability', () => {
        const state: FSRSState = {
          ...initializeFSRS(),
          state: 'REVIEW',
          reps: 5,
          stability: 10,
          difficulty: 5,
          lastReview: new Date('2024-12-25T12:00:00Z'),
        };

        const goodResult = calculateNextReview(state, 'GOOD', now);
        const easyResult = calculateNextReview(state, 'EASY', now);

        expect(easyResult.state.stability).toBeGreaterThan(
          goodResult.state.stability,
        );
      });
    });

    describe('interval ordering: AGAIN < HARD < GOOD < EASY', () => {
      it('should produce intervals in correct order for NEW cards', () => {
        const state = initializeFSRS();

        const againResult = calculateNextReview(state, 'AGAIN', now);
        const hardResult = calculateNextReview(state, 'HARD', now);
        const goodResult = calculateNextReview(state, 'GOOD', now);
        const easyResult = calculateNextReview(state, 'EASY', now);

        expect(againResult.nextReviewDate.getTime()).toBeLessThanOrEqual(
          hardResult.nextReviewDate.getTime(),
        );
        expect(hardResult.nextReviewDate.getTime()).toBeLessThanOrEqual(
          goodResult.nextReviewDate.getTime(),
        );
        expect(goodResult.nextReviewDate.getTime()).toBeLessThanOrEqual(
          easyResult.nextReviewDate.getTime(),
        );
      });

      it('should produce intervals in correct order for REVIEW cards', () => {
        const state: FSRSState = {
          ...initializeFSRS(),
          state: 'REVIEW',
          reps: 10,
          stability: 20,
          difficulty: 5,
          lastReview: new Date('2024-12-15T12:00:00Z'),
        };

        const againResult = calculateNextReview(state, 'AGAIN', now);
        const hardResult = calculateNextReview(state, 'HARD', now);
        const goodResult = calculateNextReview(state, 'GOOD', now);
        const easyResult = calculateNextReview(state, 'EASY', now);

        expect(againResult.nextReviewDate.getTime()).toBeLessThan(
          hardResult.nextReviewDate.getTime(),
        );
        expect(hardResult.nextReviewDate.getTime()).toBeLessThan(
          goodResult.nextReviewDate.getTime(),
        );
        expect(goodResult.nextReviewDate.getTime()).toBeLessThan(
          easyResult.nextReviewDate.getTime(),
        );
      });
    });
  });

  // ==========================================================================
  // State Transition Tests
  // ==========================================================================
  describe('State Transitions', () => {
    const now = new Date('2025-01-01T12:00:00Z');

    it('should transition NEW -> LEARNING on AGAIN', () => {
      const state = initializeFSRS();

      const result = calculateNextReview(state, 'AGAIN', now);

      expect(result.state.state).toBe('LEARNING');
    });

    it('should transition NEW -> LEARNING on HARD', () => {
      const state = initializeFSRS();

      const result = calculateNextReview(state, 'HARD', now);

      expect(result.state.state).toBe('LEARNING');
    });

    it('should transition NEW -> REVIEW on GOOD', () => {
      const state = initializeFSRS();

      const result = calculateNextReview(state, 'GOOD', now);

      expect(result.state.state).toBe('REVIEW');
    });

    it('should transition NEW -> REVIEW on EASY', () => {
      const state = initializeFSRS();

      const result = calculateNextReview(state, 'EASY', now);

      expect(result.state.state).toBe('REVIEW');
    });

    it('should transition REVIEW -> RELEARNING on lapse (AGAIN)', () => {
      const state: FSRSState = {
        ...initializeFSRS(),
        state: 'REVIEW',
        reps: 5,
        stability: 10,
        difficulty: 5,
      };

      const result = calculateNextReview(state, 'AGAIN', now);

      expect(result.state.state).toBe('RELEARNING');
    });

    it('should stay in REVIEW on successful recall (GOOD)', () => {
      const state: FSRSState = {
        ...initializeFSRS(),
        state: 'REVIEW',
        reps: 5,
        stability: 10,
        difficulty: 5,
      };

      const result = calculateNextReview(state, 'GOOD', now);

      expect(result.state.state).toBe('REVIEW');
    });

    it('should transition RELEARNING -> REVIEW on recovery (GOOD)', () => {
      const state: FSRSState = {
        ...initializeFSRS(),
        state: 'RELEARNING',
        reps: 5,
        lapses: 1,
        stability: 2,
        difficulty: 6,
      };

      const result = calculateNextReview(state, 'GOOD', now);

      expect(result.state.state).toBe('REVIEW');
    });

    it('should transition LEARNING -> REVIEW on graduation (GOOD)', () => {
      const state: FSRSState = {
        ...initializeFSRS(),
        state: 'LEARNING',
        reps: 1,
        stability: 0.6,
        difficulty: 5,
      };

      const result = calculateNextReview(state, 'GOOD', now);

      expect(result.state.state).toBe('REVIEW');
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================
  describe('Edge Cases', () => {
    const now = new Date('2025-01-01T12:00:00Z');

    it('should handle card with many lapses', () => {
      const state: FSRSState = {
        ...initializeFSRS(),
        state: 'REVIEW',
        reps: 50,
        lapses: 20,
        stability: 5,
        difficulty: 8,
      };

      // Should not throw
      const result = calculateNextReview(state, 'GOOD', now);

      expect(result.nextReviewDate.getTime()).toBeGreaterThan(now.getTime());
      expect(result.state.stability).toBeGreaterThan(0);
    });

    it('should handle card with high reps count', () => {
      const state: FSRSState = {
        ...initializeFSRS(),
        state: 'REVIEW',
        reps: 500,
        stability: 100,
        difficulty: 3,
        lastReview: new Date('2024-09-01T12:00:00Z'),
      };

      // Should not throw or produce unreasonable values
      const result = calculateNextReview(state, 'GOOD', now);

      expect(result.nextReviewDate.getTime()).toBeGreaterThan(now.getTime());
      // Interval should not exceed maximum
      const intervalDays =
        (result.nextReviewDate.getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24);
      expect(intervalDays).toBeLessThanOrEqual(
        DEFAULT_FSRS_PARAMETERS.maximumInterval,
      );
    });

    it('should handle very old lastReview date', () => {
      const state: FSRSState = {
        ...initializeFSRS(),
        state: 'REVIEW',
        reps: 10,
        stability: 30,
        difficulty: 5,
        lastReview: new Date('2020-01-01T12:00:00Z'), // 5 years ago
      };

      // Should not throw
      const result = calculateNextReview(state, 'GOOD', now);

      expect(result.nextReviewDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should handle early review (nextReview in future)', () => {
      const state: FSRSState = {
        ...initializeFSRS(),
        state: 'REVIEW',
        reps: 5,
        stability: 10,
        difficulty: 5,
        lastReview: new Date('2024-12-31T12:00:00Z'), // Yesterday
      };

      // Reviewing early (only 1 day elapsed when scheduled for 10)
      const result = calculateNextReview(state, 'GOOD', now);

      expect(result.nextReviewDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should handle zero stability gracefully', () => {
      const state: FSRSState = {
        ...initializeFSRS(),
        state: 'LEARNING',
        reps: 1,
        stability: 0,
        difficulty: 5,
      };

      const result = calculateNextReview(state, 'GOOD', now);

      expect(result.state.stability).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Stability and Difficulty Tests
  // ==========================================================================
  describe('Stability and Difficulty', () => {
    const now = new Date('2025-01-01T12:00:00Z');

    it('should increase stability after successful review (GOOD)', () => {
      const state: FSRSState = {
        ...initializeFSRS(),
        state: 'REVIEW',
        reps: 5,
        stability: 10,
        difficulty: 5,
        lastReview: new Date('2024-12-22T12:00:00Z'), // 10 days ago
      };

      const result = calculateNextReview(state, 'GOOD', now);

      expect(result.state.stability).toBeGreaterThan(state.stability);
    });

    it('should increase stability more for EASY than GOOD', () => {
      const state: FSRSState = {
        ...initializeFSRS(),
        state: 'REVIEW',
        reps: 5,
        stability: 10,
        difficulty: 5,
        lastReview: new Date('2024-12-22T12:00:00Z'),
      };

      const goodResult = calculateNextReview(state, 'GOOD', now);
      const easyResult = calculateNextReview(state, 'EASY', now);

      expect(easyResult.state.stability).toBeGreaterThan(
        goodResult.state.stability,
      );
    });

    it('should decrease/reset stability after AGAIN', () => {
      const state: FSRSState = {
        ...initializeFSRS(),
        state: 'REVIEW',
        reps: 5,
        stability: 30,
        difficulty: 5,
        lastReview: new Date('2024-12-01T12:00:00Z'),
      };

      const result = calculateNextReview(state, 'AGAIN', now);

      expect(result.state.stability).toBeLessThan(state.stability);
    });

    it('should adjust difficulty based on rating (AGAIN vs EASY)', () => {
      // FSRS difficulty formula pulls toward mean (w4=4.93) with rating adjustment
      // For cards with difficulty > mean, AGAIN increases it, EASY decreases it
      const state: FSRSState = {
        ...initializeFSRS(),
        state: 'REVIEW',
        reps: 5,
        stability: 10,
        difficulty: 7, // Above mean difficulty
        lastReview: new Date('2024-12-22T12:00:00Z'),
      };

      const againResult = calculateNextReview(state, 'AGAIN', now);
      const easyResult = calculateNextReview(state, 'EASY', now);

      // AGAIN should result in higher difficulty than EASY
      expect(againResult.state.difficulty).toBeGreaterThan(
        easyResult.state.difficulty,
      );
    });

    it('should have AGAIN produce higher difficulty than GOOD', () => {
      const state: FSRSState = {
        ...initializeFSRS(),
        state: 'REVIEW',
        reps: 5,
        stability: 10,
        difficulty: 5,
        lastReview: new Date('2024-12-22T12:00:00Z'),
      };

      const againResult = calculateNextReview(state, 'AGAIN', now);
      const goodResult = calculateNextReview(state, 'GOOD', now);

      expect(againResult.state.difficulty).toBeGreaterThan(
        goodResult.state.difficulty,
      );
    });

    it('should keep difficulty within valid range (1-10)', () => {
      // Test with very low difficulty
      const lowDiffState: FSRSState = {
        ...initializeFSRS(),
        state: 'REVIEW',
        reps: 5,
        stability: 10,
        difficulty: 1,
        lastReview: new Date('2024-12-22T12:00:00Z'),
      };

      const easyResult = calculateNextReview(lowDiffState, 'EASY', now);
      expect(easyResult.state.difficulty).toBeGreaterThanOrEqual(1);

      // Test with very high difficulty
      const highDiffState: FSRSState = {
        ...initializeFSRS(),
        state: 'REVIEW',
        reps: 5,
        stability: 10,
        difficulty: 10,
        lastReview: new Date('2024-12-22T12:00:00Z'),
      };

      const againResult = calculateNextReview(highDiffState, 'AGAIN', now);
      expect(againResult.state.difficulty).toBeLessThanOrEqual(10);
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================
  describe('Constants', () => {
    it('should have correct RATING_VALUES', () => {
      expect(RATING_VALUES.AGAIN).toBe(1);
      expect(RATING_VALUES.HARD).toBe(2);
      expect(RATING_VALUES.GOOD).toBe(3);
      expect(RATING_VALUES.EASY).toBe(4);
    });

    it('should have correct STATE_VALUES', () => {
      expect(STATE_VALUES.NEW).toBe(0);
      expect(STATE_VALUES.LEARNING).toBe(1);
      expect(STATE_VALUES.REVIEW).toBe(2);
      expect(STATE_VALUES.RELEARNING).toBe(3);
    });

    it('should have valid DEFAULT_FSRS_PARAMETERS', () => {
      expect(DEFAULT_FSRS_PARAMETERS.requestRetention).toBe(0.9);
      expect(DEFAULT_FSRS_PARAMETERS.maximumInterval).toBe(36500);
      expect(DEFAULT_FSRS_PARAMETERS.w).toHaveLength(17);
    });
  });
});
