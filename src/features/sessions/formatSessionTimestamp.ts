function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function normalizeTimestamp(timestamp: number) {
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
}

export function formatSessionTimestamp(timestamp: number) {
  const date = new Date(normalizeTimestamp(timestamp));

  return [
    `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`,
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`,
  ].join(' ');
}

export function formatSessionDate(timestamp: number) {
  const date = new Date(normalizeTimestamp(timestamp));
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
