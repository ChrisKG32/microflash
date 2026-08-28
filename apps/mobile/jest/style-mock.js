// app/_layout.tsx imports '@/global.css' for NativeWind. Metro's CSS
// transformer doesn't run under jest-expo, so map it to an empty module.
module.exports = {};
