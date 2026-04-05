import { describe, expect, it } from "vitest";

import {
  isBoxNumber,
  isCellId,
  isColumnNumber,
  isEncodedPuzzleString,
  isRawGivenDigit,
  isRawPuzzleString,
  isRowNumber,
  isSudokuDigit,
} from "@/lib/pages/home/utils/validators/validators";

describe("Puzzle String Validators", () => {
  describe("isRawPuzzleString", () => {
    it("accepts a string containing exactly 81 digits", () => {
      // Arrange
      const candidateRawPuzzleString = "0".repeat(81);

      // Act
      const isValidRawPuzzleString = isRawPuzzleString(
        candidateRawPuzzleString,
      );

      // Assert
      expect(isValidRawPuzzleString).toBe(true);
    });

    it("accepts a string containing exactly 81 numeric characters when non-zero digits are present", () => {
      // Arrange
      const candidateRawPuzzleString = `123456789${"0".repeat(72)}`;

      // Act
      const isValidRawPuzzleString = isRawPuzzleString(
        candidateRawPuzzleString,
      );

      // Assert
      expect(isValidRawPuzzleString).toBe(true);
    });

    it("rejects a string shorter than 81 digits", () => {
      // Arrange
      const candidateRawPuzzleString = "0".repeat(80);

      // Act
      const isValidRawPuzzleString = isRawPuzzleString(
        candidateRawPuzzleString,
      );

      // Assert
      expect(isValidRawPuzzleString).toBe(false);
    });

    it("rejects a string longer than 81 digits", () => {
      // Arrange
      const candidateRawPuzzleString = "0".repeat(82);

      // Act
      const isValidRawPuzzleString = isRawPuzzleString(
        candidateRawPuzzleString,
      );

      // Assert
      expect(isValidRawPuzzleString).toBe(false);
    });

    it("rejects a string containing a non-digit character", () => {
      // Arrange
      const candidateRawPuzzleString = `${"0".repeat(80)}a`;

      // Act
      const isValidRawPuzzleString = isRawPuzzleString(
        candidateRawPuzzleString,
      );

      // Assert
      expect(isValidRawPuzzleString).toBe(false);
    });

    it("rejects an empty string", () => {
      // Arrange
      const candidateRawPuzzleString = "";

      // Act
      const isValidRawPuzzleString = isRawPuzzleString(
        candidateRawPuzzleString,
      );

      // Assert
      expect(isValidRawPuzzleString).toBe(false);
    });

    it("rejects null at runtime", () => {
      // Arrange
      const candidateRawPuzzleString = null as unknown as string;

      // Act
      const isValidRawPuzzleString = isRawPuzzleString(
        candidateRawPuzzleString,
      );

      // Assert
      expect(isValidRawPuzzleString).toBe(false);
    });

    it("rejects a number at runtime", () => {
      // Arrange
      const candidateRawPuzzleString = 123 as unknown as string;

      // Act
      const isValidRawPuzzleString = isRawPuzzleString(
        candidateRawPuzzleString,
      );

      // Assert
      expect(isValidRawPuzzleString).toBe(false);
    });
  });

  describe("isEncodedPuzzleString", () => {
    it("accepts a string containing only digits", () => {
      // Arrange
      const candidateEncodedPuzzleString = "1234567890";

      // Act
      const isValidEncodedPuzzleString = isEncodedPuzzleString(
        candidateEncodedPuzzleString,
      );

      // Assert
      expect(isValidEncodedPuzzleString).toBe(true);
    });

    it("accepts a string containing only lowercase letters", () => {
      // Arrange
      const candidateEncodedPuzzleString = "abcdefxyz";

      // Act
      const isValidEncodedPuzzleString = isEncodedPuzzleString(
        candidateEncodedPuzzleString,
      );

      // Assert
      expect(isValidEncodedPuzzleString).toBe(true);
    });

    it("accepts a string containing digits and lowercase letters", () => {
      // Arrange
      const candidateEncodedPuzzleString = "492bta2pyfcoxdhpr9";

      // Act
      const isValidEncodedPuzzleString = isEncodedPuzzleString(
        candidateEncodedPuzzleString,
      );

      // Assert
      expect(isValidEncodedPuzzleString).toBe(true);
    });

    it("accepts the lowercase boundary letter a", () => {
      // Arrange
      const candidateEncodedPuzzleString = "a";

      // Act
      const isValidEncodedPuzzleString = isEncodedPuzzleString(
        candidateEncodedPuzzleString,
      );

      // Assert
      expect(isValidEncodedPuzzleString).toBe(true);
    });

    it("accepts the lowercase boundary letter z", () => {
      // Arrange
      const candidateEncodedPuzzleString = "z";

      // Act
      const isValidEncodedPuzzleString = isEncodedPuzzleString(
        candidateEncodedPuzzleString,
      );

      // Assert
      expect(isValidEncodedPuzzleString).toBe(true);
    });

    it("rejects an empty string", () => {
      // Arrange
      const candidateEncodedPuzzleString = "";

      // Act
      const isValidEncodedPuzzleString = isEncodedPuzzleString(
        candidateEncodedPuzzleString,
      );

      // Assert
      expect(isValidEncodedPuzzleString).toBe(false);
    });

    it("rejects a string containing uppercase letters", () => {
      // Arrange
      const candidateEncodedPuzzleString = "abcXYZ123";

      // Act
      const isValidEncodedPuzzleString = isEncodedPuzzleString(
        candidateEncodedPuzzleString,
      );

      // Assert
      expect(isValidEncodedPuzzleString).toBe(false);
    });

    it("rejects a string containing punctuation", () => {
      // Arrange
      const candidateEncodedPuzzleString = "abc-123";

      // Act
      const isValidEncodedPuzzleString = isEncodedPuzzleString(
        candidateEncodedPuzzleString,
      );

      // Assert
      expect(isValidEncodedPuzzleString).toBe(false);
    });

    it("rejects a string containing whitespace", () => {
      // Arrange
      const candidateEncodedPuzzleString = "abc 123";

      // Act
      const isValidEncodedPuzzleString = isEncodedPuzzleString(
        candidateEncodedPuzzleString,
      );

      // Assert
      expect(isValidEncodedPuzzleString).toBe(false);
    });

    it("rejects null at runtime", () => {
      // Arrange
      const candidateEncodedPuzzleString = null as unknown as string;

      // Act
      const isValidEncodedPuzzleString = isEncodedPuzzleString(
        candidateEncodedPuzzleString,
      );

      // Assert
      expect(isValidEncodedPuzzleString).toBe(false);
    });

    it("rejects a number at runtime", () => {
      // Arrange
      const candidateEncodedPuzzleString = 123 as unknown as string;

      // Act
      const isValidEncodedPuzzleString = isEncodedPuzzleString(
        candidateEncodedPuzzleString,
      );

      // Assert
      expect(isValidEncodedPuzzleString).toBe(false);
    });
  });
});

describe("Raw Given Digit Validator", () => {
  describe("isRawGivenDigit", () => {
    it("accepts every valid raw given digit", () => {
      // Arrange
      const validRawGivenDigits = [0, 1, 2, 3, 4, 5, 6, 7, 8];

      // Act / Assert
      for (const candidateRawGivenDigit of validRawGivenDigits) {
        expect(isRawGivenDigit(candidateRawGivenDigit)).toBe(true);
      }
    });

    it("rejects a raw given digit below the valid range", () => {
      // Arrange
      const candidateRawGivenDigit = -1;

      // Act
      const isValidRawGivenDigit = isRawGivenDigit(candidateRawGivenDigit);

      // Assert
      expect(isValidRawGivenDigit).toBe(false);
    });

    it("rejects a raw given digit above the valid range", () => {
      // Arrange
      const candidateRawGivenDigit = 9;

      // Act
      const isValidRawGivenDigit = isRawGivenDigit(candidateRawGivenDigit);

      // Assert
      expect(isValidRawGivenDigit).toBe(false);
    });

    it("rejects a non-integer number", () => {
      // Arrange
      const candidateRawGivenDigit = 4.5;

      // Act
      const isValidRawGivenDigit = isRawGivenDigit(candidateRawGivenDigit);

      // Assert
      expect(isValidRawGivenDigit).toBe(false);
    });

    it("rejects NaN", () => {
      // Arrange
      const candidateRawGivenDigit = Number.NaN;

      // Act
      const isValidRawGivenDigit = isRawGivenDigit(candidateRawGivenDigit);

      // Assert
      expect(isValidRawGivenDigit).toBe(false);
    });

    it("rejects positive infinity", () => {
      // Arrange
      const candidateRawGivenDigit = Number.POSITIVE_INFINITY;

      // Act
      const isValidRawGivenDigit = isRawGivenDigit(candidateRawGivenDigit);

      // Assert
      expect(isValidRawGivenDigit).toBe(false);
    });

    it("rejects negative infinity", () => {
      // Arrange
      const candidateRawGivenDigit = Number.NEGATIVE_INFINITY;

      // Act
      const isValidRawGivenDigit = isRawGivenDigit(candidateRawGivenDigit);

      // Assert
      expect(isValidRawGivenDigit).toBe(false);
    });

    it("rejects a non-number runtime value", () => {
      // Arrange
      const candidateRawGivenDigit = "4" as unknown as number;

      // Act
      const isValidRawGivenDigit = isRawGivenDigit(candidateRawGivenDigit);

      // Assert
      expect(isValidRawGivenDigit).toBe(false);
    });
  });
});

describe("Sudoku Digit Validator", () => {
  describe("isSudokuDigit", () => {
    it("accepts every valid sudoku digit", () => {
      // Arrange
      const validSudokuDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

      // Act / Assert
      for (const candidateSudokuDigit of validSudokuDigits) {
        expect(isSudokuDigit(candidateSudokuDigit)).toBe(true);
      }
    });

    it("rejects zero", () => {
      // Arrange
      const candidateSudokuDigit = "0";

      // Act
      const isValidSudokuDigit = isSudokuDigit(candidateSudokuDigit);

      // Assert
      expect(isValidSudokuDigit).toBe(false);
    });

    it("rejects an empty string", () => {
      // Arrange
      const candidateSudokuDigit = "";

      // Act
      const isValidSudokuDigit = isSudokuDigit(candidateSudokuDigit);

      // Assert
      expect(isValidSudokuDigit).toBe(false);
    });

    it("rejects a multi-character numeric string", () => {
      // Arrange
      const candidateSudokuDigit = "10";

      // Act
      const isValidSudokuDigit = isSudokuDigit(candidateSudokuDigit);

      // Assert
      expect(isValidSudokuDigit).toBe(false);
    });

    it("rejects a non-digit string", () => {
      // Arrange
      const candidateSudokuDigit = "x";

      // Act
      const isValidSudokuDigit = isSudokuDigit(candidateSudokuDigit);

      // Assert
      expect(isValidSudokuDigit).toBe(false);
    });

    it("rejects null at runtime", () => {
      // Arrange
      const candidateSudokuDigit = null as unknown as string;

      // Act
      const isValidSudokuDigit = isSudokuDigit(candidateSudokuDigit);

      // Assert
      expect(isValidSudokuDigit).toBe(false);
    });

    it("rejects a number at runtime", () => {
      // Arrange
      const candidateSudokuDigit = 1 as unknown as string;

      // Act
      const isValidSudokuDigit = isSudokuDigit(candidateSudokuDigit);

      // Assert
      expect(isValidSudokuDigit).toBe(false);
    });
  });
});

describe("Board Coordinate Validators", () => {
  describe("isBoxNumber", () => {
    it("accepts every valid box number", () => {
      // Arrange
      const validBoxNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

      // Act / Assert
      for (const candidateBoxNumber of validBoxNumbers) {
        expect(isBoxNumber(candidateBoxNumber)).toBe(true);
      }
    });

    it("rejects a box number below the valid range", () => {
      // Arrange
      const candidateBoxNumber = 0;

      // Act
      const isValidBoxNumber = isBoxNumber(candidateBoxNumber);

      // Assert
      expect(isValidBoxNumber).toBe(false);
    });

    it("rejects a box number above the valid range", () => {
      // Arrange
      const candidateBoxNumber = 10;

      // Act
      const isValidBoxNumber = isBoxNumber(candidateBoxNumber);

      // Assert
      expect(isValidBoxNumber).toBe(false);
    });

    it("rejects a non-integer box number", () => {
      // Arrange
      const candidateBoxNumber = 3.5;

      // Act
      const isValidBoxNumber = isBoxNumber(candidateBoxNumber);

      // Assert
      expect(isValidBoxNumber).toBe(false);
    });

    it("rejects positive infinity", () => {
      // Arrange
      const candidateBoxNumber = Number.POSITIVE_INFINITY;

      // Act
      const isValidBoxNumber = isBoxNumber(candidateBoxNumber);

      // Assert
      expect(isValidBoxNumber).toBe(false);
    });

    it("rejects negative infinity", () => {
      // Arrange
      const candidateBoxNumber = Number.NEGATIVE_INFINITY;

      // Act
      const isValidBoxNumber = isBoxNumber(candidateBoxNumber);

      // Assert
      expect(isValidBoxNumber).toBe(false);
    });
  });

  describe("isCellId", () => {
    it("accepts every valid cell id", () => {
      // Arrange
      const validCellIds = Array.from({ length: 81 }, (_, index) => index + 1);

      // Act / Assert
      for (const candidateCellId of validCellIds)
        expect(isCellId(candidateCellId)).toBe(true);
    });

    it("rejects a cell id below the valid range", () => {
      // Arrange
      const candidateCellId = 0;

      // Act
      const isValidCellId = isCellId(candidateCellId);

      // Assert
      expect(isValidCellId).toBe(false);
    });

    it("rejects a cell id above the valid range", () => {
      // Arrange
      const candidateCellId = 82;

      // Act
      const isValidCellId = isCellId(candidateCellId);

      // Assert
      expect(isValidCellId).toBe(false);
    });

    it("rejects a non-integer cell id", () => {
      // Arrange
      const candidateCellId = 12.5;

      // Act
      const isValidCellId = isCellId(candidateCellId);

      // Assert
      expect(isValidCellId).toBe(false);
    });

    it("rejects positive infinity", () => {
      // Arrange
      const candidateCellId = Number.POSITIVE_INFINITY;

      // Act
      const isValidCellId = isCellId(candidateCellId);

      // Assert
      expect(isValidCellId).toBe(false);
    });

    it("rejects negative infinity", () => {
      // Arrange
      const candidateCellId = Number.NEGATIVE_INFINITY;

      // Act
      const isValidCellId = isCellId(candidateCellId);

      // Assert
      expect(isValidCellId).toBe(false);
    });
  });

  describe("isColumnNumber", () => {
    it("accepts every valid column number", () => {
      // Arrange
      const validColumnNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

      // Act / Assert
      for (const candidateColumnNumber of validColumnNumbers) {
        expect(isColumnNumber(candidateColumnNumber)).toBe(true);
      }
    });

    it("rejects a column number below the valid range", () => {
      // Arrange
      const candidateColumnNumber = 0;

      // Act
      const isValidColumnNumber = isColumnNumber(candidateColumnNumber);

      // Assert
      expect(isValidColumnNumber).toBe(false);
    });

    it("rejects a column number above the valid range", () => {
      // Arrange
      const candidateColumnNumber = 10;

      // Act
      const isValidColumnNumber = isColumnNumber(candidateColumnNumber);

      // Assert
      expect(isValidColumnNumber).toBe(false);
    });

    it("rejects a non-integer column number", () => {
      // Arrange
      const candidateColumnNumber = 6.5;

      // Act
      const isValidColumnNumber = isColumnNumber(candidateColumnNumber);

      // Assert
      expect(isValidColumnNumber).toBe(false);
    });

    it("rejects positive infinity", () => {
      // Arrange
      const candidateColumnNumber = Number.POSITIVE_INFINITY;

      // Act
      const isValidColumnNumber = isColumnNumber(candidateColumnNumber);

      // Assert
      expect(isValidColumnNumber).toBe(false);
    });

    it("rejects negative infinity", () => {
      // Arrange
      const candidateColumnNumber = Number.NEGATIVE_INFINITY;

      // Act
      const isValidColumnNumber = isColumnNumber(candidateColumnNumber);

      // Assert
      expect(isValidColumnNumber).toBe(false);
    });
  });

  describe("isRowNumber", () => {
    it("accepts every valid row number", () => {
      // Arrange
      const validRowNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

      // Act / Assert
      for (const candidateRowNumber of validRowNumbers) {
        expect(isRowNumber(candidateRowNumber)).toBe(true);
      }
    });

    it("rejects a row number below the valid range", () => {
      // Arrange
      const candidateRowNumber = 0;

      // Act
      const isValidRowNumber = isRowNumber(candidateRowNumber);

      // Assert
      expect(isValidRowNumber).toBe(false);
    });

    it("rejects a row number above the valid range", () => {
      // Arrange
      const candidateRowNumber = 10;

      // Act
      const isValidRowNumber = isRowNumber(candidateRowNumber);

      // Assert
      expect(isValidRowNumber).toBe(false);
    });

    it("rejects a non-integer row number", () => {
      // Arrange
      const candidateRowNumber = 2.5;

      // Act
      const isValidRowNumber = isRowNumber(candidateRowNumber);

      // Assert
      expect(isValidRowNumber).toBe(false);
    });

    it("rejects positive infinity", () => {
      // Arrange
      const candidateRowNumber = Number.POSITIVE_INFINITY;

      // Act
      const isValidRowNumber = isRowNumber(candidateRowNumber);

      // Assert
      expect(isValidRowNumber).toBe(false);
    });

    it("rejects negative infinity", () => {
      // Arrange
      const candidateRowNumber = Number.NEGATIVE_INFINITY;

      // Act
      const isValidRowNumber = isRowNumber(candidateRowNumber);

      // Assert
      expect(isValidRowNumber).toBe(false);
    });
  });
});
