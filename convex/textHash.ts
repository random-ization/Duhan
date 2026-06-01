function toHex32(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0');
}

function cyrb128(value: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;

  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);
    h1 = h2 ^ Math.imul(h1 ^ codePoint, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ codePoint, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ codePoint, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ codePoint, 2716044179);
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

export function createTextHash(value: string): string {
  const [a, b, c, d] = cyrb128(value);
  return `${toHex32(a)}${toHex32(b)}${toHex32(c)}${toHex32(d)}`;
}
