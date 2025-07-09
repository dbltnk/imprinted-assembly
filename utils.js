/**
 * Assembly Audio Editor - Shared Utilities
 * Common functions used across the application
 */

// ===== SHARED ASSERT FUNCTION =====
export function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assembly Error: ${message}`);
    }
}

// ===== CONSOLE OVERRIDE UTILITIES =====
export function createConsoleOverride(originalMethods, bufferCallback) {
    return {
        log: (...args) => {
            originalMethods.log.apply(console, args);
            bufferCallback('LOG', args);
        },
        warn: (...args) => {
            originalMethods.warn.apply(console, args);
            bufferCallback('WARN', args);
        },
        error: (...args) => {
            originalMethods.error.apply(console, args);
            bufferCallback('ERROR', args);
        },
        info: (...args) => {
            originalMethods.info.apply(console, args);
            bufferCallback('INFO', args);
        }
    };
}

// ===== CALL STACK PARSING =====
export function parseCallStack() {
    const stack = new Error().stack;
    const stackLines = stack ? stack.split('\n').slice(2) : [];

    return stackLines.map(line => {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
            return {
                function: match[1],
                file: match[2],
                line: parseInt(match[3]),
                column: parseInt(match[4])
            };
        }

        const anonMatch = line.match(/at\s+(.+?):(\d+):(\d+)/);
        if (anonMatch) {
            return {
                function: '(anonymous)',
                file: anonMatch[1],
                line: parseInt(anonMatch[2]),
                column: parseInt(anonMatch[3])
            };
        }
        return null;
    }).filter(Boolean);
}

// ===== MESSAGE FORMATTING =====
export function formatMessage(args) {
    return args.map(arg => {
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg);
            } catch {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');
}

// ===== SHARED FORMATTING UTILITIES =====
export function formatDuration(duration) {
    const roundedDuration = Math.round(duration * 10) / 10;
    const suffix = roundedDuration === 1 ? ' beat' : ' beats';
    return `${roundedDuration}${suffix}`;
}

export function formatTimeDisplay(currentTime = 0, totalDuration = 16) {
    const currentMinutes = Math.floor(currentTime / 60);
    const currentSeconds = Math.floor(currentTime % 60);
    const currentTenths = Math.floor((currentTime % 1) * 10);

    const totalMinutes = Math.floor(totalDuration / 60);
    const totalSeconds = Math.floor(totalDuration % 60);
    const totalTenths = Math.floor((totalDuration % 1) * 10);

    const currentFormatted = `${currentMinutes.toString().padStart(2, '0')}:${currentSeconds.toString().padStart(2, '0')}.${currentTenths}`;
    const totalFormatted = `${totalMinutes.toString().padStart(2, '0')}:${totalSeconds.toString().padStart(2, '0')}.${totalTenths}`;

    return `${currentFormatted} / ${totalFormatted}`;
} 