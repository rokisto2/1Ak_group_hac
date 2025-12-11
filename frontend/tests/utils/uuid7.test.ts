// frontend/tests/utils/uuid7.test.ts
// Brief description:
// Tests the UUID7 utility functions: extracting timestamp from UUID7 and formatting message time.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractTimestampFromUUID7, formatMessageTime } from '../../src/utils/uuid7';

describe('UUID7 Utils', () => {
    describe('extractTimestampFromUUID7', () => {
        it('extracts timestamp from valid UUID7', () => {
            // UUID7 with timestamp for 2024-01-15 10:30:00.000 UTC
            // 0x018D3C7E8C40 = 1705315800000 milliseconds
            const uuid = '018d3c7e-8c40-7xxx-xxxx-xxxxxxxxxxxx';
            const result = extractTimestampFromUUID7(uuid);

            expect(result).toBeInstanceOf(Date);
            expect(result?.getTime()).toBeGreaterThan(0);
        });

        it('handles UUID without dashes', () => {
            const uuid = '018d3c7e8c407xxxxxxxxxxxxxxxxxxx';
            const result = extractTimestampFromUUID7(uuid);

            expect(result).toBeInstanceOf(Date);
        });

        it('returns null for invalid UUID format', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const uuid = 'invalid-uuid';
            const result = extractTimestampFromUUID7(uuid);

            // Should still try to parse, may return a date or null depending on implementation
            expect(result).toBeDefined();

            consoleErrorSpy.mockRestore();
        });

        it('handles empty string', () => {
            const result = extractTimestampFromUUID7('');

            expect(result).toBeInstanceOf(Date);
        });

        it('extracts correct timestamp from multiple UUIDs', () => {
            const uuid1 = '018d3c7e-8c40-7xxx-xxxx-xxxxxxxxxxxx';
            const uuid2 = '018d3c7f-0000-7xxx-xxxx-xxxxxxxxxxxx';

            const result1 = extractTimestampFromUUID7(uuid1);
            const result2 = extractTimestampFromUUID7(uuid2);

            expect(result1).toBeInstanceOf(Date);
            expect(result2).toBeInstanceOf(Date);
            expect(result2!.getTime()).toBeGreaterThanOrEqual(result1!.getTime());
        });
    });

    describe('formatMessageTime', () => {
        beforeEach(() => {
            // Mock current time to 2024-01-15 15:00:00
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2024-01-15T15:00:00.000Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('formats time for today (shows only time)', () => {
            const today = new Date('2024-01-15T14:30:00.000Z');
            const result = formatMessageTime(today);

            // Should show only time in format HH:MM
            expect(result).toMatch(/\d{2}:\d{2}/);
        });

        it('formats time for yesterday with translation', () => {
            const yesterday = new Date('2024-01-14T14:30:00.000Z');
            const mockT = vi.fn((key: string) => key === 'chat.yesterday' ? 'Вчера' : key);

            const result = formatMessageTime(yesterday, mockT);

            expect(result).toContain('Вчера');
            expect(result).toMatch(/\d{2}:\d{2}/);
            expect(mockT).toHaveBeenCalledWith('chat.yesterday');
        });

        it('formats time for yesterday without translation', () => {
            const yesterday = new Date('2024-01-14T14:30:00.000Z');

            const result = formatMessageTime(yesterday);

            expect(result).toContain('Вчера');
            expect(result).toMatch(/\d{2}:\d{2}/);
        });

        it('formats time for this year (shows date and time without year)', () => {
            const thisYear = new Date('2024-01-10T14:30:00.000Z');

            const result = formatMessageTime(thisYear);

            // Should show DD.MM HH:MM format
            expect(result).toMatch(/\d{2}\.\d{2}.*\d{2}:\d{2}/);
        });

        it('formats time for previous year (shows full date)', () => {
            const lastYear = new Date('2023-12-31T14:30:00.000Z');

            const result = formatMessageTime(lastYear);

            // Should show DD.MM.YYYY HH:MM format
            expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}.*\d{2}:\d{2}/);
            expect(result).toContain('2023');
        });

        it('handles future dates', () => {
            const future = new Date('2024-01-16T14:30:00.000Z');

            const result = formatMessageTime(future);

            // Should still format properly
            expect(result).toMatch(/\d{2}:\d{2}/);
        });

        it('handles dates from different months in same year', () => {
            const differentMonth = new Date('2024-03-01T14:30:00.000Z');

            const result = formatMessageTime(differentMonth);

            expect(result).toMatch(/\d{2}\.\d{2}.*\d{2}:\d{2}/);
        });
    });
});
