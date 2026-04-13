function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function formatSessionTimestamp(timestamp: number) {
  const normalized = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  const date = new Date(normalized);

  return [
    `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`,
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`,
  ].join(' ');
}
