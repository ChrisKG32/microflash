/**
 * Review-related DTOs
 */

import type { Rating, ISODateString } from './common';

/**
 * A review record
 */
export interface ReviewDTO {
  id: string;
  cardId: string;
  rating: Rating;
  createdAt: ISODateString;
}

/**
 * Request to submit a standalone review (outside of sprint context)
 */
export interface CreateReviewRequestDTO {
  cardId: string;
  rating: Rating;
}

/**
 * Response from submitting a review
 */
export interface CreateReviewResponseDTO {
  review: ReviewDTO;
  card: {
    id: string;
    nextReviewDate: ISODateString;
    state: string;
  };
}
