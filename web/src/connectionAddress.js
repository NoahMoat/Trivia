export function connectionAddress() {
  let address = window.location.href;
  let seperated = address.split(':');
  return `${seperated[0]}:${seperated[1]}:4000`; 
}