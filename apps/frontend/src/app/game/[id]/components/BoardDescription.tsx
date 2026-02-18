import { useMemo } from 'react';

const PIECE_NAMES: Record<string, string> = {
  K: 'King',
  Q: 'Queen',
  R: 'Rook',
  B: 'Bishop',
  N: 'Knight',
  P: 'Pawn',
};

const PIECE_VALUES: Record<string, number> = {
  Q: 9,
  R: 5,
  B: 3,
  N: 3,
  P: 1,
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

interface BoardDescriptionProps {
  fen: string;
  isGameOver: boolean;
  isUserTurn: boolean;
}

/**
 * Parse a FEN string into piece positions grouped by color.
 */
function parseFen(fen: string) {
  const [placement, activeColor] = fen.split(' ');
  const ranks = placement.split('/');

  const whitePieces: { piece: string; square: string }[] = [];
  const blackPieces: { piece: string; square: string }[] = [];

  ranks.forEach((rank, rankIdx) => {
    let fileIdx = 0;
    for (const char of rank) {
      if (/\d/.test(char)) {
        fileIdx += parseInt(char, 10);
      } else {
        const square = `${FILES[fileIdx]}${8 - rankIdx}`;
        const isWhite = char === char.toUpperCase();
        const pieceType = char.toUpperCase();
        const entry = { piece: pieceType, square };
        if (isWhite) {
          whitePieces.push(entry);
        } else {
          blackPieces.push(entry);
        }
        fileIdx++;
      }
    }
  });

  return { whitePieces, blackPieces, activeColor };
}

/**
 * Format a list of pieces into a human-readable string.
 * Groups by piece type: "King on e1, Queen on d1, Rooks on a1 and h1, Pawns on a2, b2, c2"
 */
function formatPieceList(pieces: { piece: string; square: string }[]): string {
  const grouped: Record<string, string[]> = {};

  // Order: King, Queen, Rook, Bishop, Knight, Pawn
  const order = ['K', 'Q', 'R', 'B', 'N', 'P'];

  for (const { piece, square } of pieces) {
    if (!grouped[piece]) grouped[piece] = [];
    grouped[piece].push(square);
  }

  const parts: string[] = [];
  for (const pieceType of order) {
    const squares = grouped[pieceType];
    if (!squares || squares.length === 0) continue;

    const name = PIECE_NAMES[pieceType];
    if (squares.length === 1) {
      parts.push(`${name} on ${squares[0]}`);
    } else {
      const plural = pieceType === 'N' ? 'Knights' : `${name}s`;
      const lastSquare = squares[squares.length - 1];
      const otherSquares = squares.slice(0, -1).join(', ');
      parts.push(`${plural} on ${otherSquares} and ${lastSquare}`);
    }
  }

  return parts.join(', ');
}

/**
 * Calculate material value for a set of pieces (excluding King).
 */
function materialValue(pieces: { piece: string }[]): number {
  return pieces.reduce((sum, { piece }) => sum + (PIECE_VALUES[piece] || 0), 0);
}

/**
 * Hidden screen-reader-only description of the current board state.
 * Provides piece positions, material balance, and whose turn it is.
 */
export function BoardDescription({ fen, isGameOver, isUserTurn }: BoardDescriptionProps) {
  const description = useMemo(() => {
    if (!fen) return '';

    const { whitePieces, blackPieces } = parseFen(fen);

    const parts: string[] = [];

    // Turn / status
    if (isGameOver) {
      parts.push('Game over.');
    } else {
      parts.push(isUserTurn ? 'Your turn (White).' : "Engine's turn (Black).");
    }

    // Material balance
    const whiteMaterial = materialValue(whitePieces);
    const blackMaterial = materialValue(blackPieces);
    const diff = whiteMaterial - blackMaterial;
    if (diff > 0) {
      parts.push(`White is up ${diff} point${diff !== 1 ? 's' : ''} of material.`);
    } else if (diff < 0) {
      parts.push(
        `Black is up ${Math.abs(diff)} point${Math.abs(diff) !== 1 ? 's' : ''} of material.`
      );
    } else {
      parts.push('Material is equal.');
    }

    // Piece positions
    parts.push(`White: ${formatPieceList(whitePieces)}.`);
    parts.push(`Black: ${formatPieceList(blackPieces)}.`);

    return parts.join(' ');
  }, [fen, isGameOver, isUserTurn]);

  return (
    <div id="board-description" className="sr-only">
      {description}
    </div>
  );
}
