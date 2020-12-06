// dec2hex :: Integer -> String
// i.e. 0-255 -> '00'-'ff'
// Copied from https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
function dec2hex(dec: number): String {
  return dec.toString(16).padStart(2, "0")
}

// generateId :: Integer -> String
// Copied from https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
export default function generateId(len: number): String {
  var arr = new Uint8Array((len || 40) / 2)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, dec2hex).join('')
}
