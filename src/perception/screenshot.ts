import screenshot from 'screenshot-desktop';

export async function captureFullDesktop(): Promise<Buffer> {
  return screenshot({format: 'png'});
}
