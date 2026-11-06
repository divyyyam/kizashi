export const vertex = `
attribute vec2 position;
attribute vec4 fibre;
uniform vec4 frame;
uniform vec2 pointer;
uniform float time;
uniform float formation;
varying vec3 ink;
void main() {
  float seed = fibre.x, depth = fibre.y, t = fibre.z;
  vec2 pos = frame.xy + position * frame.zw;
  float scatter = (1.0 - formation) * (.25 + .75 * seed);
  float angle = seed * 41.0 + .24 * time;
  vec2 drift = vec2(cos(angle * 1.3), sin(angle)) * (.35 + .6 * sin(seed * 311.0));
  pos += scatter * drift * vec2(.36, .49);
  pos.y += frame.w * .007 * sin(t * 18.0 - time * .72 + depth * 6.0) * sin(3.14159 * t);
  vec2 distanceToPointer = (pos - pointer) * vec2(1.5, 1.0);
  float bend = exp(-dot(distanceToPointer, distanceToPointer) * 53.0);
  pos.y -= bend * (.042 + .018 * sin(depth * 6.0 - time));
  pos.x += bend * .014 * cos(depth * 8.0);
  gl_Position = vec4(pos * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
  float red = max(1.0 - smoothstep(.006, .017, abs(depth - .028)), 1.0 - smoothstep(.006,.017,abs(depth - .48)));
  float alpha = .20 + .49 * (1.0-depth) + .10 * sin(t * 3.14159);
  ink = vec3(red, alpha * (.64 + .36 * formation), seed);
}`;
export const fragment = `
precision mediump float;
uniform vec3 paper;
uniform vec3 vermilion;
varying vec3 ink;
void main() {
  gl_FragColor = vec4(mix(paper, vermilion, ink.x), mix(ink.y, .96, ink.x));
}`;
