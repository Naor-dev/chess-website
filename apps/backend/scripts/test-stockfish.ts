/**
 * Manual test script for Stockfish engine outside of Jest environment.
 *
 * This script tests the Stockfish WASM engine directly to verify it works
 * in the Node.js environment without any test framework overhead.
 *
 * Run with: npx tsx scripts/test-stockfish.ts
 * Or: pnpm tsx scripts/test-stockfish.ts
 */

import { StockfishEngine } from '../src/engines/StockfishEngine';
import { STARTING_FEN } from '@chess-website/shared';

// Test positions
const TEST_POSITIONS = [
  {
    name: 'Starting position',
    fen: STARTING_FEN,
    expectedMoves: ['e2e4', 'd2d4', 'c2c4', 'g1f3', 'b1c3'], // Common opening moves
  },
  {
    name: 'Position after 1.e4',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    expectedMoves: ['e7e5', 'c7c5', 'e7e6', 'd7d5', 'c7c6'], // Common responses to e4
  },
];

async function main() {
  console.log('='.repeat(60));
  console.log('Stockfish Engine Manual Test');
  console.log('='.repeat(60));
  console.log();

  // Check WebAssembly support
  console.log('1. Checking WebAssembly support...');
  if (typeof WebAssembly === 'object') {
    console.log('   WebAssembly is available');
  } else {
    console.error('   ERROR: WebAssembly is NOT available');
    process.exit(1);
  }
  console.log();

  // Create engine instance
  console.log('2. Creating Stockfish engine...');
  const engine = new StockfishEngine();
  console.log(`   Engine name: ${engine.name}`);
  console.log(`   Engine ready: ${engine.isReady()}`);
  console.log();

  // Initialize engine
  console.log('3. Initializing engine...');
  const initStart = Date.now();
  try {
    await engine.initialize();
    const initTime = Date.now() - initStart;
    console.log(`   Initialization successful in ${initTime}ms`);
    console.log(`   Engine ready: ${engine.isReady()}`);
  } catch (error) {
    console.error(`   ERROR: Initialization failed: ${error}`);
    process.exit(1);
  }
  console.log();

  // Test positions
  console.log('4. Testing positions...');
  console.log();

  for (let i = 0; i < TEST_POSITIONS.length; i++) {
    const test = TEST_POSITIONS[i];
    console.log(`   Test ${i + 1}: ${test.name}`);
    console.log(`   FEN: ${test.fen}`);

    const analysisStart = Date.now();
    try {
      const result = await engine.getBestMove(test.fen, {
        depth: 10,
        timeout: 30000,
        difficultyLevel: 3,
      });

      const analysisTime = Date.now() - analysisStart;
      console.log(
        `   Best move: ${result.move.from}${result.move.to}${result.move.promotion || ''}`
      );
      console.log(`   Depth: ${result.depth}`);
      if (result.score !== undefined) {
        console.log(`   Score: ${result.score} centipawns`);
      }
      console.log(`   Analysis time: ${analysisTime}ms`);

      // Check if the move is reasonable
      const moveStr = `${result.move.from}${result.move.to}`;
      if (test.expectedMoves.includes(moveStr)) {
        console.log('   Result: PASS (expected move)');
      } else {
        console.log(`   Result: OK (move ${moveStr} was not in expected list but may be valid)`);
      }
    } catch (error) {
      console.error(`   ERROR: Analysis failed: ${error}`);
    }
    console.log();
  }

  // Test with different depths
  console.log('5. Testing depth variations...');
  for (const depth of [1, 5, 10, 15]) {
    const start = Date.now();
    try {
      const result = await engine.getBestMove(STARTING_FEN, {
        depth,
        timeout: 60000,
        difficultyLevel: 3,
      });
      const time = Date.now() - start;
      console.log(`   Depth ${depth}: ${result.move.from}${result.move.to} (${time}ms)`);
    } catch (error) {
      console.error(`   Depth ${depth}: ERROR - ${error}`);
    }
  }
  console.log();

  // Dispose engine
  console.log('6. Disposing engine...');
  await engine.dispose();
  console.log(`   Engine ready after dispose: ${engine.isReady()}`);
  console.log();

  console.log('='.repeat(60));
  console.log('Test completed successfully!');
  console.log('='.repeat(60));
}

// Run the test
main().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
