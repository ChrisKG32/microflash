import { PrismaClient, CardState, Rating } from '../src/generated/prisma';

const prisma = new PrismaClient();

/**
 * Prisma Seed Script
 *
 * Populates the database with test data for development.
 *
 * Usage:
 *   pnpm db:seed              (from apps/server)
 *   pnpm prisma db seed       (from apps/server)
 *
 * This script is idempotent - it clears existing data before seeding,
 * so it can be run multiple times safely.
 */

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (for idempotency)
  console.log('🧹 Cleaning existing data...');
  await prisma.sprintCard.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.cardTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.review.deleteMany();
  await prisma.card.deleteMany();
  await prisma.deck.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  console.log('👤 Creating users...');

  // Dev auth user - used for local development with DEV_AUTH=1
  const devUser = await prisma.user.create({
    data: {
      clerkId: 'user_local_dev',
      pushToken: null,
      notificationsEnabled: true,
    },
  });

  const user1 = await prisma.user.create({
    data: {
      clerkId: 'user_test123abc',
      pushToken: 'ExponentPushToken[test123]',
      notificationsEnabled: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      clerkId: 'user_test456def',
      pushToken: 'ExponentPushToken[test456]',
      notificationsEnabled: true,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      clerkId: 'user_test789ghi',
      pushToken: null,
      notificationsEnabled: false,
    },
  });

  console.log(`✅ Created ${4} users (including dev user)`);

  // Create decks with hierarchy
  console.log('📚 Creating decks...');

  // =========================================================================
  // Dev User decks - for testing markdown + LaTeX rendering
  // =========================================================================
  const devMathDeck = await prisma.deck.create({
    data: {
      title: 'Math Formulas',
      description: 'Mathematical formulas with LaTeX',
      userId: devUser.id,
      priority: 80,
    },
  });

  const devProgrammingDeck = await prisma.deck.create({
    data: {
      title: 'Programming Concepts',
      description: 'Code and programming concepts with markdown',
      userId: devUser.id,
      priority: 60,
    },
  });

  const devMixedDeck = await prisma.deck.create({
    data: {
      title: 'Mixed Content',
      description: 'Cards with both markdown and LaTeX',
      userId: devUser.id,
      priority: 40,
    },
  });

  // User 1 decks
  const mathDeck = await prisma.deck.create({
    data: {
      title: 'Mathematics',
      description: 'Core mathematics concepts',
      userId: user1.id,
    },
  });

  const algebraSubdeck = await prisma.deck.create({
    data: {
      title: 'Algebra',
      description: 'Algebraic equations and formulas',
      userId: user1.id,
      parentDeckId: mathDeck.id,
    },
  });

  const calculusSubdeck = await prisma.deck.create({
    data: {
      title: 'Calculus',
      description: 'Derivatives and integrals',
      userId: user1.id,
      parentDeckId: mathDeck.id,
    },
  });

  const scienceDeck = await prisma.deck.create({
    data: {
      title: 'Science',
      description: 'General science topics',
      userId: user1.id,
    },
  });

  const physicsDeck = await prisma.deck.create({
    data: {
      title: 'Physics',
      description: 'Physics formulas and concepts',
      userId: user1.id,
      parentDeckId: scienceDeck.id,
    },
  });

  // User 2 decks
  const languageDeck = await prisma.deck.create({
    data: {
      title: 'Spanish',
      description: 'Spanish vocabulary and grammar',
      userId: user2.id,
    },
  });

  const vocabSubdeck = await prisma.deck.create({
    data: {
      title: 'Vocabulary',
      description: 'Common Spanish words',
      userId: user2.id,
      parentDeckId: languageDeck.id,
    },
  });

  const historyDeck = await prisma.deck.create({
    data: {
      title: 'World History',
      description: 'Important historical events',
      userId: user2.id,
    },
  });

  // User 3 decks
  const programmingDeck = await prisma.deck.create({
    data: {
      title: 'Programming',
      description: 'Software development concepts',
      userId: user3.id,
    },
  });

  const jsDeck = await prisma.deck.create({
    data: {
      title: 'JavaScript',
      description: 'JavaScript fundamentals',
      userId: user3.id,
      parentDeckId: programmingDeck.id,
    },
  });

  console.log(`✅ Created ${13} decks (including ${4} subdecks + 3 dev decks)`);

  // Helper function to create dates in the past/future
  const daysFromNow = (days: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  };

  // Create cards with various FSRS states
  console.log('🃏 Creating cards...');

  // NEW cards (never reviewed)
  const newCards = await Promise.all([
    prisma.card.create({
      data: {
        front: 'What is the quadratic formula?',
        back: '$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$',
        deckId: algebraSubdeck.id,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
    prisma.card.create({
      data: {
        front: 'Define a derivative',
        back: 'The instantaneous rate of change of a function',
        deckId: calculusSubdeck.id,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
    prisma.card.create({
      data: {
        front: '¿Cómo estás?',
        back: 'How are you?',
        deckId: vocabSubdeck.id,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
  ]);

  // LEARNING cards (reviewed 1-2 times)
  const learningCards = await Promise.all([
    prisma.card.create({
      data: {
        front: "What is Newton's Second Law?",
        back: 'F = ma (Force equals mass times acceleration)',
        deckId: physicsDeck.id,
        state: CardState.LEARNING,
        stability: 1.5,
        difficulty: 5.0,
        reps: 1,
        lapses: 0,
        elapsedDays: 0,
        scheduledDays: 1,
        lastReview: daysFromNow(-1),
        nextReviewDate: daysFromNow(1),
      },
    }),
    prisma.card.create({
      data: {
        front: 'What does "hola" mean?',
        back: 'Hello',
        deckId: vocabSubdeck.id,
        state: CardState.LEARNING,
        stability: 2.0,
        difficulty: 4.5,
        reps: 2,
        lapses: 0,
        elapsedDays: 1,
        scheduledDays: 2,
        lastReview: daysFromNow(-2),
        nextReviewDate: new Date(),
      },
    }),
  ]);

  // REVIEW cards (reviewed multiple times, stable)
  const reviewCards = await Promise.all([
    prisma.card.create({
      data: {
        front: 'What is the Pythagorean theorem?',
        back: '$$a^2 + b^2 = c^2$$',
        deckId: algebraSubdeck.id,
        state: CardState.REVIEW,
        stability: 30.0,
        difficulty: 3.0,
        reps: 5,
        lapses: 0,
        elapsedDays: 15,
        scheduledDays: 30,
        lastReview: daysFromNow(-15),
        nextReviewDate: daysFromNow(15),
      },
    }),
    prisma.card.create({
      data: {
        front: 'What year did World War II end?',
        back: '1945',
        deckId: historyDeck.id,
        state: CardState.REVIEW,
        stability: 45.0,
        difficulty: 2.5,
        reps: 8,
        lapses: 1,
        elapsedDays: 20,
        scheduledDays: 45,
        lastReview: daysFromNow(-20),
        nextReviewDate: daysFromNow(25),
      },
    }),
    prisma.card.create({
      data: {
        front: 'What does `const` do in JavaScript?',
        back: 'Declares a block-scoped variable that cannot be reassigned',
        deckId: jsDeck.id,
        state: CardState.REVIEW,
        stability: 20.0,
        difficulty: 4.0,
        reps: 4,
        lapses: 0,
        elapsedDays: 10,
        scheduledDays: 20,
        lastReview: daysFromNow(-10),
        nextReviewDate: daysFromNow(10),
      },
    }),
  ]);

  // RELEARNING cards (forgotten and being relearned)
  const relearnCards = await Promise.all([
    prisma.card.create({
      data: {
        front: 'What is the speed of light?',
        back: 'Approximately 299,792,458 meters per second',
        deckId: physicsDeck.id,
        state: CardState.RELEARNING,
        stability: 5.0,
        difficulty: 7.0,
        reps: 6,
        lapses: 2,
        elapsedDays: 3,
        scheduledDays: 5,
        lastReview: daysFromNow(-3),
        nextReviewDate: daysFromNow(2),
      },
    }),
  ]);

  // Cards due for review NOW (for testing notifications)
  const dueCards = await Promise.all([
    prisma.card.create({
      data: {
        front: 'What is an integral?',
        back: 'The area under a curve, or the antiderivative',
        deckId: calculusSubdeck.id,
        state: CardState.REVIEW,
        stability: 10.0,
        difficulty: 4.5,
        reps: 3,
        lapses: 0,
        elapsedDays: 10,
        scheduledDays: 10,
        lastReview: daysFromNow(-10),
        nextReviewDate: new Date(), // Due NOW
      },
    }),
    prisma.card.create({
      data: {
        front: 'Translate: "Good morning"',
        back: 'Buenos días',
        deckId: vocabSubdeck.id,
        state: CardState.REVIEW,
        stability: 8.0,
        difficulty: 3.5,
        reps: 4,
        lapses: 0,
        elapsedDays: 8,
        scheduledDays: 8,
        lastReview: daysFromNow(-8),
        nextReviewDate: new Date(), // Due NOW
      },
    }),
  ]);

  // More cards to reach ~30 total
  const additionalCards = await Promise.all([
    prisma.card.create({
      data: {
        front: 'What is the capital of France?',
        back: 'Paris',
        deckId: historyDeck.id,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
    prisma.card.create({
      data: {
        front: 'What does `let` do in JavaScript?',
        back: 'Declares a block-scoped variable that can be reassigned',
        deckId: jsDeck.id,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
    prisma.card.create({
      data: {
        front: 'What is the mitochondria?',
        back: 'The powerhouse of the cell',
        deckId: scienceDeck.id,
        state: CardState.LEARNING,
        stability: 1.0,
        difficulty: 5.5,
        reps: 1,
        lapses: 0,
        elapsedDays: 0,
        scheduledDays: 1,
        lastReview: new Date(),
        nextReviewDate: daysFromNow(1),
      },
    }),
    prisma.card.create({
      data: {
        front: 'What is a variable in programming?',
        back: 'A named container for storing data values',
        deckId: programmingDeck.id,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
    prisma.card.create({
      data: {
        front: "What is $e$ (Euler's number)?",
        back: 'Approximately 2.71828, the base of natural logarithms',
        deckId: algebraSubdeck.id,
        state: CardState.REVIEW,
        stability: 25.0,
        difficulty: 3.5,
        reps: 6,
        lapses: 0,
        elapsedDays: 12,
        scheduledDays: 25,
        lastReview: daysFromNow(-12),
        nextReviewDate: daysFromNow(13),
      },
    }),
  ]);

  // =========================================================================
  // Dev User cards - for testing markdown + LaTeX rendering
  // =========================================================================
  console.log('🧪 Creating dev user cards with markdown + LaTeX...');

  const devMathCards = await Promise.all([
    // Block LaTeX with $$ delimiters
    prisma.card.create({
      data: {
        front: 'What is the quadratic formula?',
        back: 'The quadratic formula is:\n\n$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$\n\nUsed to solve equations of the form $ax^2 + bx + c = 0$',
        deckId: devMathDeck.id,
        priority: 90,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
    // Inline LaTeX with $ delimiters
    prisma.card.create({
      data: {
        front: 'What is the Pythagorean theorem?',
        back: 'For a right triangle: $a^2 + b^2 = c^2$ where $c$ is the hypotenuse.',
        deckId: devMathDeck.id,
        priority: 85,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
    // Block LaTeX with \[ \] delimiters
    prisma.card.create({
      data: {
        front: 'What is the formula for the area of a circle?',
        back: 'The area of a circle is:\n\n\\[A = \\pi r^2\\]\n\nwhere \\(r\\) is the radius.',
        deckId: devMathDeck.id,
        priority: 80,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
    // Inline LaTeX with \( \) delimiters
    prisma.card.create({
      data: {
        front: "What is Euler's identity?",
        back: "Euler's identity: \\(e^{i\\pi} + 1 = 0\\)\n\nThis connects five fundamental constants: \\(e\\), \\(i\\), \\(\\pi\\), \\(1\\), and \\(0\\).",
        deckId: devMathDeck.id,
        priority: 75,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
    // Invalid LaTeX (for testing error handling)
    prisma.card.create({
      data: {
        front: 'Test card with invalid LaTeX',
        back: 'This has invalid math: $\\frac{1}{$ and should show fallback.',
        deckId: devMathDeck.id,
        priority: 10,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
  ]);

  const devProgrammingCards = await Promise.all([
    // Markdown with code blocks
    prisma.card.create({
      data: {
        front: 'What is a **closure** in JavaScript?',
        back: 'A closure is a function that has access to variables from its outer scope.\n\n```javascript\nfunction outer() {\n  let x = 10;\n  return function inner() {\n    return x;\n  };\n}\n```\n\nThe inner function "closes over" the variable `x`.',
        deckId: devProgrammingDeck.id,
        priority: 70,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
    // Markdown with lists
    prisma.card.create({
      data: {
        front: 'What are the **SOLID** principles?',
        back: '1. **S**ingle Responsibility\n2. **O**pen/Closed\n3. **L**iskov Substitution\n4. **I**nterface Segregation\n5. **D**ependency Inversion',
        deckId: devProgrammingDeck.id,
        priority: 65,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
    // Markdown with inline code
    prisma.card.create({
      data: {
        front: 'What is the difference between `let` and `const`?',
        back: '- `let`: Block-scoped, *can* be reassigned\n- `const`: Block-scoped, *cannot* be reassigned\n\nBoth are hoisted but not initialized (temporal dead zone).',
        deckId: devProgrammingDeck.id,
        priority: 60,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
  ]);

  const devMixedCards = await Promise.all([
    // Mixed markdown and LaTeX
    prisma.card.create({
      data: {
        front: 'Explain **Big O notation** for common algorithms',
        back: '| Algorithm | Time Complexity |\n|-----------|----------------|\n| Binary Search | $O(\\log n)$ |\n| Linear Search | $O(n)$ |\n| Bubble Sort | $O(n^2)$ |\n| Merge Sort | $O(n \\log n)$ |',
        deckId: devMixedDeck.id,
        priority: 55,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
    // Complex formula with markdown explanation
    prisma.card.create({
      data: {
        front: 'What is the **derivative** of $f(x) = x^n$?',
        back: "Using the **power rule**:\n\n$$\\frac{d}{dx}x^n = nx^{n-1}$$\n\nFor example:\n- $f(x) = x^3 \\Rightarrow f'(x) = 3x^2$\n- $f(x) = x^{-1} \\Rightarrow f'(x) = -x^{-2}$",
        deckId: devMixedDeck.id,
        priority: 50,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
    // Blockquote with math
    prisma.card.create({
      data: {
        front: 'State the **Fundamental Theorem of Calculus**',
        back: '> If $F$ is an antiderivative of $f$ on $[a,b]$, then:\n\n$$\\int_a^b f(x)\\,dx = F(b) - F(a)$$\n\nThis connects *differentiation* and *integration*.',
        deckId: devMixedDeck.id,
        priority: 45,
        state: CardState.NEW,
        nextReviewDate: new Date(),
      },
    }),
  ]);

  const totalCards =
    newCards.length +
    learningCards.length +
    reviewCards.length +
    relearnCards.length +
    dueCards.length +
    additionalCards.length +
    devMathCards.length +
    devProgrammingCards.length +
    devMixedCards.length;

  const devCardCount =
    devMathCards.length + devProgrammingCards.length + devMixedCards.length;

  console.log(`✅ Created ${totalCards} cards`);
  console.log(`   - ${newCards.length} NEW cards`);
  console.log(`   - ${learningCards.length} LEARNING cards`);
  console.log(`   - ${reviewCards.length} REVIEW cards`);
  console.log(`   - ${relearnCards.length} RELEARNING cards`);
  console.log(`   - ${dueCards.length} cards due NOW`);
  console.log(`   - ${additionalCards.length} additional cards`);
  console.log(`   - ${devCardCount} dev user cards (markdown + LaTeX)`);

  // Create sample review history
  console.log('📝 Creating review history...');

  const reviews = await Promise.all([
    // Reviews for a LEARNING card
    prisma.review.create({
      data: {
        userId: user1.id,
        cardId: learningCards[0].id,
        rating: Rating.GOOD,
        createdAt: daysFromNow(-1),
      },
    }),
    // Reviews for a REVIEW card
    prisma.review.create({
      data: {
        userId: user1.id,
        cardId: reviewCards[0].id,
        rating: Rating.EASY,
        createdAt: daysFromNow(-30),
      },
    }),
    prisma.review.create({
      data: {
        userId: user1.id,
        cardId: reviewCards[0].id,
        rating: Rating.GOOD,
        createdAt: daysFromNow(-25),
      },
    }),
    prisma.review.create({
      data: {
        userId: user1.id,
        cardId: reviewCards[0].id,
        rating: Rating.GOOD,
        createdAt: daysFromNow(-20),
      },
    }),
    prisma.review.create({
      data: {
        userId: user1.id,
        cardId: reviewCards[0].id,
        rating: Rating.GOOD,
        createdAt: daysFromNow(-15),
      },
    }),
    // Reviews for a RELEARNING card (showing lapses)
    prisma.review.create({
      data: {
        userId: user1.id,
        cardId: relearnCards[0].id,
        rating: Rating.GOOD,
        createdAt: daysFromNow(-20),
      },
    }),
    prisma.review.create({
      data: {
        userId: user1.id,
        cardId: relearnCards[0].id,
        rating: Rating.AGAIN, // Lapsed!
        createdAt: daysFromNow(-10),
      },
    }),
    prisma.review.create({
      data: {
        userId: user1.id,
        cardId: relearnCards[0].id,
        rating: Rating.HARD,
        createdAt: daysFromNow(-3),
      },
    }),
  ]);

  console.log(`✅ Created ${reviews.length} review records`);

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - Users: 4 (including dev user: user_local_dev)`);
  console.log(`   - Decks: 13 (9 parent, 4 subdecks)`);
  console.log(`   - Cards: ${totalCards}`);
  console.log(`   - Reviews: ${reviews.length}`);
  console.log('');
  console.log('💡 Dev user (user_local_dev) has cards with:');
  console.log('   - LaTeX math (inline $...$ and block $$...$$)');
  console.log('   - LaTeX math (\\(...\\) and \\[...\\] delimiters)');
  console.log('   - Markdown formatting (bold, code, lists)');
  console.log('   - Mixed content (markdown + LaTeX)');
  console.log('   - Invalid LaTeX (for error handling testing)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
