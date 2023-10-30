export function bigintToBuffer(bigintValue: bigint, byteLength: number) {
  if (bigintValue >= 0n) {
    // Convert BigInt to hexadecimal string
    let hexString = bigintValue.toString(16);
    // Calculate padding
    const padding = byteLength * 2 - hexString.length;
    // Add leading zeros for padding
    for (let i = 0; i < padding; i++) {
      hexString = "0" + hexString;
    }
    // Create Buffer from padded hexadecimal string
    return Buffer.from(hexString, "hex");
  } else {
    // Handle negative BigInt
    const twosComplement = (BigInt(1) << BigInt(byteLength * 8)) + bigintValue;
    return bigintToBuffer(twosComplement, byteLength);
  }
}

export function bufferToHexString(bytes: Uint8Array) {
  return Array.from(bytes, function (byte) {
    return ("0" + (byte & 0xff).toString(16)).slice(-2);
  }).join("");
}

export function bufferToBigint(bytes: Uint8Array) {
  const hexString = bufferToHexString(bytes);
  return BigInt("0x" + hexString);
}
