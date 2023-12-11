export const PRIMARY_WINDOW_NAME_PREFIX = 'primary';
export const TERMINAL_NAME = 'alacritty';

export const primaryWindowName = (/** @type {number} */ monitor) => `${PRIMARY_WINDOW_NAME_PREFIX}-${monitor}`
