/** Measure rendered, opaque control text/background contrast inside the browser. */
export function controlContrast(element) {
  const style = getComputedStyle(element);
  const luminance = color => {
    const channels = color.match(/[\d.]+/g)?.map(Number);
    if (!channels || channels.length < 3 || (channels.length > 3 && channels[3] !== 1)) throw new Error(`Expected an opaque control color: ${color}`);
    const rgb = channels.slice(0, 3).map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const text = luminance(style.color), background = luminance(style.backgroundColor);
  return { ratio: (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05), color: style.color, background: style.backgroundColor };
}
