declare module 'screenshot-desktop' {
  export type ScreenshotOptions = {
    format?: 'png' | 'jpg';
    filename?: string;
    screen?: string | number;
  };

  export default function screenshot(options?: ScreenshotOptions): Promise<Buffer>;
}
