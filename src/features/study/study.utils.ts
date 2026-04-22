export function clampIndex(value: number, length: number) {
  if (length <= 0) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value >= length) {
    return length - 1;
  }

  return value;
}

export function randomIndex(length: number) {
  if (length <= 0) {
    return 0;
  }

  return Math.floor(Math.random() * length);
}
